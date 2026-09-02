const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";
const { enforceNarrationAccess, handleCorsPreflight, incrementUsage, sendApiError } = require("./auth");
const DEFAULT_SPEECH_MODEL = "gpt-4o-mini-tts";
// Natural speed. Every stretch value tried was audible - 0.9 crackled, 0.95 was
// still fuzzy - because the parameter resamples the finished audio rather than
// making the model read slower. The pace comes from the line breaks the app
// sends between sentences instead, which are silence rather than processing.
// Overridable with OPENAI_TTS_SPEED; the API accepts 0.25 to 4.0.
const DEFAULT_SPEECH_SPEED = 1;
const MIN_SPEECH_SPEED = 0.25;
const MAX_SPEECH_SPEED = 4;

function getSpeechSpeed() {
  const configured = Number(process.env.OPENAI_TTS_SPEED);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_SPEECH_SPEED;
  return Math.min(MAX_SPEECH_SPEED, Math.max(MIN_SPEECH_SPEED, configured));
}
const MAX_CHUNK_LENGTH = 3200;
const MAX_CHUNKS = 20;
const SPEECH_CONCURRENCY = 2;
const SUPPORTED_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
]);

function cleanText(value) {
  return String(value || "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getLanguageNarrationGuard(value) {
  const language = cleanText(value || "en-GB");
  if (language !== "en-GB") return "";

  return [
    "Use a natural UK/British English accent and British English pronunciation throughout.",
    "Do not drift into an American accent or American pronunciation.",
  ].join(" ");
}

// The speed parameter is not honoured by every speech model - gpt-4o-mini-tts
// takes its pacing from the instructions instead - so the pace is asked for in
// both places. Whichever the model listens to, the narration comes out slower.
// Measured against real output, a stated words-per-minute target moved the pace
// not at all - only the speed parameter did. So this stays to one short line
// about delivery, and the budget goes to the caller's voice direction instead.
const PACE_INSTRUCTION =
  "Read slowly and softly, letting each sentence settle before the next, with a gentle pause at commas and a longer one at full stops.";

// The app asks for words to be clearly separated "without sounding slow", which
// directly contradicts the pace above. Older app builds keep sending it, so it
// is neutralised here rather than only being fixed in the client.
const CONTRADICTORY_PACE_PHRASES = [
  "without sounding slow, broken, or robotic",
  "without sounding slow, broken or robotic",
  "without sounding slow",
];

function stripContradictoryPacing(text) {
  return CONTRADICTORY_PACE_PHRASES.reduce(
    (result, phrase) => result.split(phrase).join("without sounding broken or robotic"),
    text
  );
}

function buildNarrationInstructions(body) {
  // The caller's direction is what makes one voice sound different from another,
  // so it gets the room. Trimming it to 700 was cutting 450-840 characters off
  // every voice - the age, the bedtime pacing and the accent guard all went.
  const baseInstructions = stripContradictoryPacing(cleanText(body.instructions)).slice(0, 1500);
  const languageGuard = getLanguageNarrationGuard(body.storyLanguage);

  return cleanText(
    [baseInstructions, PACE_INSTRUCTION, languageGuard].filter(Boolean).join(" ")
  ).slice(0, 1900);
}

function splitText(text) {
  const clean = cleanText(text);
  if (clean.length <= MAX_CHUNK_LENGTH) return [clean];

  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const chunks = [];
  let chunk = "";

  sentences.forEach((sentence) => {
    const nextChunk = `${chunk} ${sentence}`.trim();
    if (nextChunk.length > MAX_CHUNK_LENGTH && chunk) {
      chunks.push(chunk);
      chunk = sentence.trim();
      return;
    }

    chunk = nextChunk;
  });

  if (chunk) chunks.push(chunk);
  return chunks.slice(0, MAX_CHUNKS);
}

function getChunkInstructions(instructions, index, total) {
  if (total <= 1) return instructions;

  return [
    instructions,
    `This is narration part ${index + 1} of ${total}.`,
    "Keep exactly the same narrator identity, accent, age, pitch, pace, warmth, and microphone feel across every part.",
    "Continue as one continuous reading. Do not restart with a different character voice or change delivery between parts.",
    "Match the previous and next parts as if the whole story were recorded in one calm session.",
  ].join(" ");
}

async function createSpeech({ input, voice, instructions, index = 0, total = 1 }) {
  const chunkInstructions = getChunkInstructions(instructions, index, total);
  const configuredModel = cleanText(process.env.OPENAI_TTS_MODEL) || DEFAULT_SPEECH_MODEL;
  const model = configuredModel === "gpt-4o-mini-tts-2025-12-15" ? DEFAULT_SPEECH_MODEL : configuredModel;
  const response = await fetch(OPENAI_SPEECH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice,
      input,
      instructions: chunkInstructions,
      speed: getSpeechSpeed(),
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Narration request failed");
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

module.exports = async function handler(request, response) {
  if (handleCorsPreflight(request, response, "POST, OPTIONS")) return;

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const account = await enforceNarrationAccess(request, body);
    if (!process.env.OPENAI_API_KEY) {
      return response.status(501).json({ error: "OPENAI_API_KEY is not configured" });
    }
    const text = cleanText(body.text);
    const voice = SUPPORTED_VOICES.has(body.voice) ? body.voice : "cedar";
    const instructions = buildNarrationInstructions(body);

    if (!text) return response.status(400).json({ error: "Story text is required" });

    const chunks = splitText(text);
    const audio = await mapWithConcurrency(chunks, SPEECH_CONCURRENCY, (chunk, index) =>
      createSpeech({ input: chunk, voice, instructions, index, total: chunks.length })
    );

    const shouldChargeAudio = body.chargeAudio !== false;
    const usage = shouldChargeAudio
      ? await incrementUsage(account, { audioSeconds: account.requestedAudioSeconds })
      : account.usage;

    return response.status(200).json({
      audio,
      chunks: audio.length,
      voice,
      usage,
      profile: account.profile,
      usedAudioCredit: shouldChargeAudio && Boolean(account.useAudioCredit),
      charged: shouldChargeAudio,
      disclosure: "AI-generated narration",
    });
  } catch (error) {
    return sendApiError(response, error, "Could not create narration");
  }
};
