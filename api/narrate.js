const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const { enforceNarrationAccess, handleCorsPreflight, incrementUsage, sendApiError } = require("../lib/auth");
const { getMp3DurationSeconds } = require("../lib/mp3");

/* OpenAI retires every /v1/audio/speech model on 6 January 2027, the pinned
   gpt-4o-mini-tts-2025-12-15 among them, so narration had to move. The
   replacement OpenAI names, gpt-realtime-2.1-mini, is a session model it also
   says is unsupported on that endpoint - taking it would mean a websocket
   under a 60 second function ceiling. gpt-audio-mini is a plain Chat
   Completions POST that returns base64 audio, which is the shape this file
   already had.

   Measured A/B on identical text before switching: mp3 kept, all 13 voices
   present, pace within 0.95x of the old narration and steerable by prompt
   (which the old model never was - only its speed parameter moved), audio at
   0.52x the bytes, and the voices approved by ear. It costs about 1.6x, which
   is the rate rather than the model being slower: $20 per 1M audio output
   tokens against $12.

   To go back before January, set OPENAI_TTS_MODEL to a gpt-4o-mini-tts or
   tts-1 model: the endpoint follows the model name, so that is a Vercel
   setting away and needs no deploy. */
const DEFAULT_SPEECH_MODEL = "gpt-audio-mini";

// Models that still belong to the old speech endpoint. Everything else is
// assumed to be a Chat Completions audio model.
function usesSpeechEndpoint(model) {
  return /^(tts-1|gpt-4o(-mini)?-tts)/.test(model);
}

function getSpeechModel() {
  return cleanText(process.env.OPENAI_TTS_MODEL) || DEFAULT_SPEECH_MODEL;
}
// Natural speed, and the only control over pace that does anything. Measured on
// this model with a 115 word bedtime passage: speed 1 reads at about 158 words
// per minute, 0.9 at about 135, 0.7 at about 124. The curve is not clean - the
// model varies run to run - and the old objection stands, that the parameter
// resamples finished audio rather than making the model read slower, so every
// step down costs some quality. It is left at 1 until someone listens to the
// alternatives. Overridable with OPENAI_TTS_SPEED; the API accepts 0.25 to 4.0.
const DEFAULT_SPEECH_SPEED = 1;
const MIN_SPEECH_SPEED = 0.25;
const MAX_SPEECH_SPEED = 4;

function getSpeechSpeed() {
  const configured = Number(process.env.OPENAI_TTS_SPEED);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_SPEECH_SPEED;
  return Math.min(MAX_SPEECH_SPEED, Math.max(MIN_SPEECH_SPEED, configured));
}
/* 3200 was fine for the old endpoint, which read whatever it was given.
   gpt-audio-mini stops early on long inputs and reports finish_reason "stop"
   while doing it, so nothing downstream can tell. Measured: 983 characters
   read in full 4 times out of 4, 1075 only 2 of 4, 1169 one of 4, and 3174
   came back having spoken 14-28% of the text. 900 sits below the cliff with
   room to spare.

   Shorter chunks mean about four times as many requests, which is why
   concurrency goes to 6: measured end to end, 6 at a time clears a round in
   ~7.2s, so 36 chunks - about 35 minutes of narration, past the longest
   subscriber tier - fit inside Vercel's 60 second ceiling with headroom. No
   rate limiting appeared at 6. Both are overridable if that headroom turns
   out to be thinner from Vercel's network than from a laptop. */
const MAX_CHUNK_LENGTH = Number(process.env.OPENAI_TTS_CHUNK_CHARS) || 900;
const MAX_CHUNKS = Number(process.env.OPENAI_TTS_MAX_CHUNKS) || 36;
const SPEECH_CONCURRENCY = Number(process.env.OPENAI_TTS_CONCURRENCY) || 6;
/* Since late 2026 the pinned snapshot has been returning HTTP 200 with audio
   that is silent or missing its closing sentence; OpenAI support acknowledged
   it in September and has not shipped a fix. It matters more here than it
   would elsewhere: narration is cached on the device and in Supabase so it
   never re-bills and never regenerates, which makes one bad chunk permanent
   for that story.

   This is a floor, not a cure. Measured across the shipped voice previews the
   model reads at 9.1 to 11.8 characters a second, so anything under 18 a
   second is not a reading of the text at all - an empty body, or a cut of
   roughly half. A single sentence lost from a 3200 character chunk is about
   three percent and sits well inside the model's own run-to-run variation, so
   it cannot be caught this way and is not claimed to be. */
const MAX_PLAUSIBLE_CHARS_PER_SECOND = 18;
const SPEECH_ATTEMPTS = 2;
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

// Kept, but do not trust it to do anything. Re-measured on the pinned model:
// this line, the app's "read especially slowly", a stated words-per-minute
// target, and an instruction as blunt as "leave a full second of silence
// between sentences" all produced the same pace, and the bluntest version came
// out slightly faster than no instruction at all. Only the speed parameter
// moves it. This stays because it costs nothing and the next model may listen.
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
  return chunks.flatMap(splitOverlongChunk).slice(0, MAX_CHUNKS);
}

/* A sentence longer than the chunk limit was never split: the loop above only
   breaks between sentences, so it became an over-long chunk of its own. That
   was harmless when the limit was 3200 and the endpoint read whatever it was
   given. It is not harmless now - over-long is exactly what gpt-audio-mini
   silently stops reading - and the limit is a third of what it was, so a
   single unpunctuated run of text is far likelier to reach it. Breaks on
   spaces so no word is cut in half. */
function splitOverlongChunk(chunk) {
  if (chunk.length <= MAX_CHUNK_LENGTH) return [chunk];

  const parts = [];
  let rest = chunk;
  while (rest.length > MAX_CHUNK_LENGTH) {
    let cut = rest.lastIndexOf(" ", MAX_CHUNK_LENGTH);
    // A single "word" longer than the limit has nowhere better to break.
    if (cut <= 0) cut = MAX_CHUNK_LENGTH;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
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

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function failed(response) {
  const message = await response.text();
  throw new Error(message || "Narration request failed");
}

// The old endpoint, kept reachable so OPENAI_TTS_MODEL can roll narration back
// without a deploy for as long as OpenAI keeps it alive.
async function requestViaSpeechEndpoint({ model, input, voice, instructions }) {
  const response = await fetch(OPENAI_SPEECH_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      voice,
      input,
      instructions,
      speed: getSpeechSpeed(),
      response_format: "mp3",
    }),
  });

  if (!response.ok) await failed(response);
  // This endpoint returns audio and nothing else, so there is no transcript to
  // check against - only the duration floor below can say anything went wrong.
  return { buffer: Buffer.from(await response.arrayBuffer()), transcript: null };
}

/* The model on the other end answers rather than reads. Asked warmly to read a
   children's story aloud it invented 389 characters about a baker from a 57
   character prompt and spoke a literal "[Pause]" out loud, which for this app
   is the worst failure available: narration that does not match the words on
   screen, and unreviewed content read to a child.

   Saying plainly that it is not an assistant fixes it - measured verbatim on
   every run once this wording was in front of the narration direction, with
   the pacing, accent and part-of-n lines still doing their work. Leave the
   first and last sentences alone; they are what keep it reading. */
function buildSystemDirection(instructions) {
  return [
    "You are a text-to-speech engine, not an assistant.",
    "Speak the user's message aloud word for word, exactly as written.",
    "Add nothing: no greeting, no reply, no commentary, no continuation, no stage directions.",
    "Never invent story content. Your entire spoken output must be the user's text and nothing else.",
    instructions,
    "Everything above changes delivery only - never the words themselves.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function requestViaChatCompletions({ model, input, voice, instructions }) {
  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      modalities: ["text", "audio"],
      audio: { voice, format: "mp3" },
      messages: [
        { role: "system", content: buildSystemDirection(instructions) },
        { role: "user", content: input },
      ],
    }),
  });

  if (!response.ok) await failed(response);

  const payload = await response.json();
  const audio = payload?.choices?.[0]?.message?.audio;
  if (!audio?.data) throw new Error("Narration came back without audio");

  return {
    buffer: Buffer.from(audio.data, "base64"),
    transcript: cleanText(audio.transcript || ""),
  };
}

async function requestSpeech({ input, voice, instructions, index = 0, total = 1 }) {
  const chunkInstructions = getChunkInstructions(instructions, index, total);
  const model = getSpeechModel();
  const send = usesSpeechEndpoint(model) ? requestViaSpeechEndpoint : requestViaChatCompletions;
  return send({ model, input, voice, instructions: chunkInstructions });
}

// The speed parameter only exists on the old endpoint, where it resamples the
// finished audio: at 1.5 the same words legitimately come back a third shorter.
// Chat Completions has no such parameter - pace is asked for in words instead.
function getMinimumPlausibleSeconds(input) {
  const speed = usesSpeechEndpoint(getSpeechModel()) ? getSpeechSpeed() : 1;
  return cleanText(input).length / (MAX_PLAUSIBLE_CHARS_PER_SECOND * speed);
}

/* Punctuation and casing are delivery, not words: the model may render an
   ellipsis as a pause or spell a number differently without having read the
   wrong thing. Comparing words alone keeps the check strict about what
   matters and quiet about what does not. */
function sameWords(a, b) {
  const words = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .join(" ");
  return words(a) === words(b);
}

/* Two different failures, and only one of them was ever detectable before.

   Too short catches an empty or badly truncated body. It is a floor, not a
   cure: a single sentence lost from a 3200 character chunk is about three
   percent and sits inside the model's own variation.

   Wrong words is the new one, and it is exact. Chat Completions returns a
   transcript of what was actually spoken, so narration can compare it with
   what it asked for instead of inferring from duration. That is the real
   argument for this endpoint over the one it replaces.

   Keeps the best attempt rather than failing the story: a parent who has
   waited for narration is better served by slightly short audio than by an
   error screen at bedtime. A reading that matches the words always wins over
   a longer one that does not. */
async function createSpeech(options) {
  const minimumSeconds = getMinimumPlausibleSeconds(options.input);
  const part = `part ${(options.index || 0) + 1}/${options.total || 1}`;
  let best = null;

  for (let attempt = 1; attempt <= SPEECH_ATTEMPTS; attempt += 1) {
    const { buffer, transcript } = await requestSpeech(options);
    const seconds = getMp3DurationSeconds(buffer);
    // A null transcript means the endpoint cannot tell us, not that it strayed.
    const read = transcript === null || sameWords(transcript, options.input);
    const score = (read ? 1e6 : 0) + seconds;
    if (!best || score > best.score) best = { buffer, seconds, score };
    if (read && seconds >= minimumSeconds) break;

    const last = attempt === SPEECH_ATTEMPTS;
    const ending = last ? ", keeping the best attempt" : ", retrying";
    if (!read) {
      console.warn(
        `narrate: ${part} spoke something other than the story text` +
          ` (${transcript.length} characters against ${cleanText(options.input).length} asked for)${ending}`
      );
    } else {
      console.warn(
        `narrate: ${part} came back at ${seconds.toFixed(1)}s for ` +
          `${cleanText(options.input).length} characters (expected at least ${minimumSeconds.toFixed(1)}s)${ending}`
      );
    }
  }

  return `data:audio/mpeg;base64,${best.buffer.toString("base64")}`;
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
