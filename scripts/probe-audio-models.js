#!/usr/bin/env node
// Answers the three questions that decide whether narration can move off the
// speech endpoint before it shuts down on 6 January 2027.
//
//   OPENAI_API_KEY=sk-... node scripts/probe-audio-models.js
//   OPENAI_API_KEY=sk-... node scripts/probe-audio-models.js --model gpt-audio
//   node scripts/probe-audio-models.js --dry-run     # prints bodies, sends nothing
//
// OpenAI's named replacement for gpt-4o-mini-tts is gpt-realtime-2.1-mini,
// which it also says is not supported on /v1/audio/speech - it is a session
// model, so taking it would mean rebuilding narration around a websocket under
// a 60 second function ceiling. gpt-audio-mini is the other option: a plain
// Chat Completions POST that returns base64 audio, which is the shape
// api/narrate.js already has. Whether it is actually usable turns on three
// things this script measures rather than guesses:
//
//   1. format  - the docs only ever show wav. wav is roughly ten times the
//                size of mp3, which lands on the device cache, Supabase
//                storage and the audio-minute accounting.
//   2. voices  - the narration voices were tuned by ear over many takes. A
//                missing voice means every story in it changes how it sounds.
//   3. cost    - the published per-million rate is for text tokens. Audio
//                tokens are normally billed far higher, and that goes straight
//                into the per-story economics.
//
// Clips are written to store-assets/audio-probe/ so the voices can be compared
// by ear, which is the only test that actually settles question 2.

const fs = require("fs");
const path = require("path");
const { getMp3DurationSeconds } = require("../lib/mp3");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "store-assets", "audio-probe");
const CHAT_URL = "https://api.openai.com/v1/chat/completions";

function flag(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const dryRun = process.argv.includes("--dry-run");
const model = flag("--model", "gpt-audio-mini");
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey && !dryRun) {
  console.error("OPENAI_API_KEY is not set. Copy it from the Vercel project settings:");
  console.error("Settings > Environment Variables > OPENAI_API_KEY, or run `vercel env pull`.");
  process.exit(1);
}

// Costs nothing to notice here, and saves six round trips and a confusing
// report when the example line gets pasted verbatim.
if (!dryRun && /^sk-\.{2,}$|^sk-$|^(your|real)/i.test(apiKey.trim())) {
  console.error(`OPENAI_API_KEY is still the placeholder ("${apiKey.trim()}").`);
  console.error("Substitute the real key from the Vercel project settings.");
  process.exit(1);
}

// Read the voice list from the API rather than repeating it, so this cannot
// drift from what narration will actually be asked for.
const narrateJs = fs.readFileSync(path.join(root, "api", "narrate.js"), "utf8");
const voiceBlock = narrateJs.match(/const SUPPORTED_VOICES = new Set\(\[([\s\S]*?)\]\);/);
if (!voiceBlock) {
  console.error("Could not read SUPPORTED_VOICES from api/narrate.js. Has it changed shape?");
  process.exit(1);
}
const voices = (voiceBlock[1].match(/"([a-z]+)"/g) || []).map((value) => value.slice(1, -1));
const defaultVoice = voices.includes("cedar") ? "cedar" : voices[0];

// Short on purpose: this is a capability probe, not a narration sample, and
// every request is billed. Long enough to hear the voice and to make a
// truncated answer obvious.
const PROBE_TEXT = "Settle in, take a gentle breath, and let the story begin.";
const FORMATS = ["mp3", "wav", "opus", "pcm16", "flac", "aac"];

// The speech endpoint takes an `instructions` field. Chat Completions has no
// such parameter, so direction has to move into a system message - which is
// the part of this migration most likely to change how narration sounds.
const SYSTEM_DIRECTION = [
  "You are reading a children's bedtime story aloud to one child.",
  "Read slowly and softly, letting each sentence settle before the next.",
  "Keep a natural UK/British English accent throughout.",
  "Read only the text given to you. Do not add anything.",
].join(" ");

function requestBody({ voice, format }) {
  return {
    model,
    modalities: ["text", "audio"],
    audio: { voice, format },
    messages: [
      { role: "system", content: SYSTEM_DIRECTION },
      { role: "user", content: PROBE_TEXT },
    ],
  };
}

/* A 401 on every format is not an answer about the model, and the first draft
   of this script reported one as "narration cannot move to this model". Only a
   400 about the request itself tells us anything about what gpt-audio-mini can
   do; everything else is the account, the key or the model name, and has to
   stop the run and say so. */
function classifyFailure({ status, message, code }) {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "quota";
  if (code === "model_not_found" || status === 404 || /does not exist|do not have access/i.test(message)) {
    return "model";
  }
  if (status >= 500) return "server";
  return "capability";
}

// OpenAI redacts keys in its own error text, but nothing guarantees that for
// every error path and these lines get pasted into chats and issues.
function scrub(message) {
  return message.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***");
}

function stop(kind, message) {
  const advice = {
    auth: [
      "The API key was not accepted.",
      "",
      "If you pasted the example literally, substitute the real one:",
      "  OPENAI_API_KEY=sk-your-real-key node scripts/probe-audio-models.js",
      "",
      "It is in the Vercel project under Settings > Environment Variables >",
      "OPENAI_API_KEY, or run `vercel env pull` to bring the whole set down.",
    ],
    quota: [
      "Rate limited or out of quota, so nothing could be measured.",
      "Check billing on the OpenAI dashboard and run this again.",
    ],
    model: [
      `The model "${model}" is not available on this account.`,
      "",
      "Try another with --model, for example:",
      "  node scripts/probe-audio-models.js --model gpt-audio",
      "",
      "Audio models are listed at https://developers.openai.com/api/docs/models",
    ],
    server: ["OpenAI returned a server error. This is their side; try again shortly."],
  }[kind];

  console.error(`\n${advice.join("\n")}`);
  console.error(`\nThe exact error was: ${scrub(message)}`);
  console.error("\nNothing was measured, so this says nothing about whether narration can move.");
  process.exit(1);
}

async function send(body) {
  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* non-JSON error bodies are reported raw below */
  }

  if (!response.ok) {
    const message = (parsed && parsed.error && parsed.error.message) || text;
    const code = (parsed && parsed.error && parsed.error.code) || "";
    return { ok: false, status: response.status, code, message: message.replace(/\s+/g, " ").trim() };
  }

  const audio = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message.audio;
  return { ok: true, audio, usage: (parsed && parsed.usage) || {} };
}

function audioTokens(usage) {
  const details = usage.completion_tokens_details || {};
  return details.audio_tokens || 0;
}

function describe(result, format) {
  if (!result.audio || !result.audio.data) return "returned no audio";
  const bytes = Buffer.from(result.audio.data, "base64");
  // Only mp3 can be measured without decoding; for the rest the byte count is
  // still the number that matters for storage.
  const seconds = format === "mp3" ? getMp3DurationSeconds(bytes) : 0;
  return {
    bytes,
    size: `${Math.round(bytes.length / 1024)}KB`,
    seconds,
    tokens: audioTokens(result.usage),
  };
}

(async () => {
  if (dryRun) {
    console.log(JSON.stringify(requestBody({ voice: defaultVoice, format: "mp3" }), null, 2));
    console.log(`\nWould probe ${FORMATS.length} formats and ${voices.length} voices on ${model}.`);
    console.log("Nothing was sent.");
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  console.log(`model: ${model}`);
  console.log(`text:  "${PROBE_TEXT}" (${PROBE_TEXT.length} chars)\n`);

  // 1. Which output formats are accepted.
  console.log("FORMATS");
  const accepted = [];
  for (const format of FORMATS) {
    const result = await send(requestBody({ voice: defaultVoice, format }));
    if (!result.ok) {
      const kind = classifyFailure(result);
      if (kind !== "capability") stop(kind, result.message);
      console.log(`  ${format.padEnd(6)} rejected (${result.status}) ${scrub(result.message).slice(0, 150)}`);
      continue;
    }
    const info = describe(result, format);
    if (typeof info === "string") {
      console.log(`  ${format.padEnd(6)} ${info}`);
      continue;
    }
    accepted.push(format);
    const duration = info.seconds ? ` ${info.seconds.toFixed(2)}s` : "";
    console.log(`  ${format.padEnd(6)} ok   ${info.size.padStart(7)}${duration}  ${info.tokens} audio tokens`);
    fs.writeFileSync(path.join(outDir, `format-${format}.${format === "pcm16" ? "pcm" : format}`), info.bytes);
  }

  if (accepted.length === 0) {
    console.error(`\nEvery format was rejected by ${model} on its own merits, not by the`);
    console.error("account or the key. Narration cannot move to this model as it stands.");
    process.exit(1);
  }

  // mp3 keeps api/narrate.js and the on-device cache exactly as they are.
  const probeFormat = accepted.includes("mp3") ? "mp3" : accepted[0];
  console.log(`\n  -> accepted: ${accepted.join(", ")}`);
  console.log(
    probeFormat === "mp3"
      ? "  -> mp3 is supported, so the cache and concatenation stay as they are."
      : `  -> no mp3. Narration would have to ship ${probeFormat}, or be transcoded.`
  );

  // 2. Which of the narration voices exist on this model.
  console.log(`\nVOICES (as ${probeFormat})`);
  const present = [];
  const missing = [];
  let totalTokens = 0;

  for (const voice of voices) {
    const result = await send(requestBody({ voice, format: probeFormat }));
    if (!result.ok) {
      const kind = classifyFailure(result);
      if (kind !== "capability") stop(kind, result.message);
      missing.push(voice);
      console.log(`  ${voice.padEnd(9)} rejected  ${scrub(result.message).slice(0, 110)}`);
      continue;
    }
    const info = describe(result, probeFormat);
    if (typeof info === "string") {
      missing.push(voice);
      console.log(`  ${voice.padEnd(9)} ${info}`);
      continue;
    }
    present.push(voice);
    totalTokens += info.tokens;
    const duration = info.seconds ? ` ${info.seconds.toFixed(2)}s` : "";
    console.log(`  ${voice.padEnd(9)} ok   ${info.size.padStart(7)}${duration}  ${info.tokens} audio tokens`);
    fs.writeFileSync(path.join(outDir, `voice-${voice}.${probeFormat}`), info.bytes);
  }

  // 3. What it costs, from the tokens actually billed rather than a rate card.
  console.log("\nSUMMARY");
  console.log(`  voices present : ${present.length}/${voices.length}${present.length ? ` (${present.join(", ")})` : ""}`);
  if (missing.length) console.log(`  voices missing : ${missing.join(", ")}`);

  if (present.length) {
    const perRequest = totalTokens / present.length;
    const perChar = perRequest / PROBE_TEXT.length;
    // A long bedtime story is around 20 minutes of narration; narrate.js caps
    // a story at MAX_CHUNKS * MAX_CHUNK_LENGTH characters.
    const storyChars = 20 * 3200;
    console.log(`  audio tokens   : ${perRequest.toFixed(0)} per ${PROBE_TEXT.length} chars (${perChar.toFixed(2)}/char)`);
    console.log(`  a full story   : about ${Math.round(perChar * storyChars).toLocaleString()} audio tokens at the 20-chunk cap`);
    console.log("  cost           : multiply that by the audio output rate on");
    console.log("                   https://openai.com/api/pricing and compare with what a story costs today");
  }

  console.log(`\n  clips written to ${path.relative(root, outDir)}/ - listen before deciding anything.`);
  console.log("  store-assets is not shipped, so these do not reach the app.");
})();
