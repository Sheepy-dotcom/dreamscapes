const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";
const { enforceNarrationAccess, handleCorsPreflight, incrementUsage, sendApiError } = require("./auth");
const DEFAULT_SPEECH_MODEL = "gpt-4o-mini-tts";
// Asking for pace in the instructions alone was not enough - measured output
// still ran near 156 words a minute against a request for 100 - so a light
// stretch tops it up. 0.9 was audibly crackly; 0.95 is half that adjustment.
// Overridable with OPENAI_TTS_SPEED; the API accepts 0.25 to 4.0.
const DEFAULT_SPEECH_SPEED = 0.95;
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
const PACE_INSTRUCTION = [
  "Pace is the single most important instruction and matters more than anything else here.",
  "Read far more slowly than ordinary speech or an audiobook, at about 90 words per minute.",
  "This should feel almost too slow to read aloud: a tired parent murmuring a child to sleep.",
  "Draw every sentence out, and let each one settle in silence before starting the next.",
  "Pause for half a second at every comma, and a full second at every full stop and paragraph break.",
  "Never speed up, not even during exciting or urgent moments. Stay slow, soft and steady to the last word.",
].join(" ");

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
  // Pace leads, and the caller's own direction is trimmed rather than the pace
  // or the accent guard: at the old sizes a long caller instruction pushed the
  // total to the cap and truncated the accent guard off the end.
  const baseInstructions = stripContradictoryPacing(cleanText(body.instructions)).slice(0, 700);
  const languageGuard = getLanguageNarrationGuard(body.storyLanguage);

  // 556 (pace) + 700 (caller) + 149 (accent guard) + separators needs 1407, so
  // the cap sits above that: at 1400 a long caller instruction clipped the
  // accent guard off the end.
  return cleanText(
    [PACE_INSTRUCTION, baseInstructions, languageGuard].filter(Boolean).join(" ")
  ).slice(0, 1500);
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
