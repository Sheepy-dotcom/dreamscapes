#!/usr/bin/env node
// Answers the three questions that decide whether narration can move off the
// speech endpoint before it shuts down on 6 January 2027.
//
//   node scripts/probe-audio-models.js
//   node scripts/probe-audio-models.js --model gpt-audio
//   node scripts/probe-audio-models.js --dry-run     # prints bodies, sends nothing
//
// The key is read from .env.local, or from OPENAI_API_KEY if it is already in
// the environment. Pasting a key on the command line puts it in the shell
// history, and the example line itself has been pasted verbatim more than once.
//
// `vercel env pull` will not supply it: every secret on this project is marked
// Sensitive, which makes it write-only, so neither the CLI nor the dashboard
// can hand the value back. Mint a separate key for local use instead - which
// is the better habit anyway, since the production key then never reaches a
// laptop, and the local one can be revoked the moment this is finished.
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

/* `vercel env pull` writes .env.local, which is the least error-prone way to
   get the key onto this machine: nothing is typed, nothing lands in shell
   history, and it stays current. Values may be quoted or carry inline
   comments, so neither survives into the key. */
function readEnvFile(name) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) return null;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*(.*)$/);
    if (!match) continue;
    const value = match[1].trim();
    const quoted = value.match(/^(['"])([\s\S]*?)\1/);
    return quoted ? quoted[2] : value.split("#")[0].trim();
  }
  return null;
}

const envFiles = [".env.local", ".env"];
const foundIn = envFiles.find((name) => readEnvFile(name));
const apiKey = process.env.OPENAI_API_KEY || (foundIn ? readEnvFile(foundIn) : null);

if (!apiKey && !dryRun) {
  console.error("No OPENAI_API_KEY found.");
  console.error("Create one for local use at https://platform.openai.com/api-keys");
  console.error("and paste it into the OPENAI_API_KEY= line of .env.local (gitignored).");
  console.error("");
  console.error("Vercel cannot supply it: the project's secrets are marked Sensitive,");
  console.error("so they are write-only and `vercel env pull` returns [SENSITIVE].");
  console.error("Revoke the local key when the probe is done.");
  process.exit(1);
}

/* Every real OpenAI key is far longer than this - legacy ones are 51
   characters and project keys well over 100 - so a short value is a
   placeholder, an example line pasted whole, or a truncated copy. Checking the
   length rather than hunting for words like "your" cannot misfire on a real
   key, and it costs nothing compared with six round trips and a report that
   blames the model. */
const MIN_REAL_KEY_LENGTH = 40;
if (!dryRun && apiKey.trim().length < MIN_REAL_KEY_LENGTH) {
  console.error(`OPENAI_API_KEY is only ${apiKey.trim().length} characters, so it is not a real key.`);
  console.error("It is an example, a truncated copy, or Vercel's [SENSITIVE] placeholder.");
  console.error("");
  console.error("Create one for local use at https://platform.openai.com/api-keys");
  console.error("and paste it into the OPENAI_API_KEY= line of .env.local (gitignored).");
  console.error("");
  console.error("Vercel cannot supply it: the project's secrets are marked Sensitive,");
  console.error("so they are write-only and `vercel env pull` returns [SENSITIVE].");
  console.error("Revoke the local key when the probe is done.");
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

/* Stops mid-story on purpose. gpt-audio-mini is a conversational model, so the
   dangerous moment is a chunk that trails off - which is every part but the
   last of a real narration. A one-line probe would not show the failure. */
const PROBE_TEXT =
  "Maya pressed her nose to the window. Outside, the snow had stopped falling and the whole garden " +
  "had gone quiet and blue. On the lawn, where the old apple tree stood, something was glowing. It was " +
  "small and round and it bobbed gently, the way a lantern does when somebody is carrying it. Maya pulled " +
  "on her boots over her pyjamas. She opened the back door very slowly, so it would not creak, and stepped " +
  "out into the cold.";
const FORMATS = ["mp3", "wav", "opus", "pcm16", "flac", "aac"];

/* The speech endpoint takes an `instructions` field and only ever reads what
   it is given. Chat Completions has no such parameter, and the model on the
   other end answers rather than reads: asked warmly to "read this children's
   story aloud", it invented 389 characters about a baker in a village from a
   57 character prompt, and spoke a literal "[Pause]" stage direction.

   For a children's app that is the worst failure available - narration that
   does not match the words on screen, and unreviewed content read to a child.
   So the direction has to say plainly that it is not an assistant. Measured
   10/10 verbatim with the wording below, including with the part-of-n
   continuity lines narrate.js appends. */
const SYSTEM_DIRECTION = [
  "You are a text-to-speech engine, not an assistant.",
  "Speak the user's message aloud word for word, exactly as written.",
  "Add nothing: no greeting, no reply, no commentary, no continuation, no stage directions.",
  "Never invent story content. Your entire spoken output must be the user's text and nothing else.",
].join(" ");

// Punctuation and casing can differ without anything being wrong with the
// reading, so compare on words alone.
function saidTheSameWords(spoken) {
  const words = (value) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  return words(spoken || "").join(" ") === words(PROBE_TEXT).join(" ");
}

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
      "The API key was not accepted - right shape, but wrong, revoked, or for",
      "another account.",
      "",
      "Mint a fresh one at https://platform.openai.com/api-keys and put it in",
      "the OPENAI_API_KEY= line of .env.local.",
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
  const transcript = (result.audio.transcript || "").trim().replace(/\s+/g, " ");
  return {
    bytes,
    size: `${Math.round(bytes.length / 1024)}KB`,
    seconds,
    tokens: audioTokens(result.usage),
    transcript,
    verbatim: saidTheSameWords(transcript),
  };
}

/* The transcript is the whole reason this endpoint is safer than the one it
   replaces: it says exactly what was spoken, so narration can check the words
   rather than guessing from duration. An "ok" that skipped this check is how
   the first run of this script reported 13 usable voices while the model was
   making up a story about a baker. */
function verdict(info) {
  if (info.verbatim) return "read";
  return info.transcript.length > PROBE_TEXT.length * 1.2 ? "INVENTED" : "DRIFTED";
}

(async () => {
  if (dryRun) {
    console.log(JSON.stringify(requestBody({ voice: defaultVoice, format: "mp3" }), null, 2));
    console.log(`\nWould probe ${FORMATS.length} formats and ${voices.length} voices on ${model}.`);
    console.log("Nothing was sent.");
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  console.log(`key:   ${process.env.OPENAI_API_KEY ? "OPENAI_API_KEY in the environment" : foundIn}`);
  console.log(`model: ${model}`);
  console.log(`text:  ${PROBE_TEXT.length} characters, a chunk that stops mid-story\n`);

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
    console.log(
      `  ${format.padEnd(6)} ${verdict(info).padEnd(8)} ${info.size.padStart(7)}${duration}  ${info.tokens} audio tokens`
    );
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
  const strayed = [];
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
    const duration = info.seconds ? ` ${info.seconds.toFixed(2)}s` : "";
    console.log(
      `  ${voice.padEnd(9)} ${verdict(info).padEnd(8)} ${info.size.padStart(7)}${duration}  ${info.tokens} audio tokens`
    );
    if (info.verbatim) {
      present.push(voice);
      totalTokens += info.tokens;
    } else {
      strayed.push(voice);
      console.log(`      said: ${JSON.stringify(info.transcript.slice(0, 120))}`);
    }
    fs.writeFileSync(path.join(outDir, `voice-${voice}.${probeFormat}`), info.bytes);
  }

  // 3. What it costs, from the tokens actually billed rather than a rate card.
  console.log("\nSUMMARY");
  console.log(`  voices reading : ${present.length}/${voices.length}${present.length ? ` (${present.join(", ")})` : ""}`);
  if (missing.length) console.log(`  voices missing : ${missing.join(", ")}`);
  if (strayed.length) {
    console.log(`  DID NOT READ   : ${strayed.join(", ")}`);
    console.log("                   These spoke something other than the text they were given.");
    console.log("                   Narration cannot ship on a voice that does that, whatever");
    console.log("                   its format support - check SYSTEM_DIRECTION before anything else.");
  }

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
    console.log("                   (measured on verbatim readings only, so it is not inflated by");
    console.log("                   a model that talked for longer than it was asked to)");
  }

  if (strayed.length === 0 && present.length === voices.length) {
    console.log("\n  Every voice read the text back word for word. The transcript is returned");
    console.log("  on every call, so narration on this endpoint can verify what was actually");
    console.log("  spoken instead of inferring it from duration - which the speech endpoint");
    console.log("  never allowed. That is the real argument for this path.");
  }

  console.log(`\n  clips written to ${path.relative(root, outDir)}/ - listen before deciding anything.`);
  console.log("  store-assets is not shipped, so these do not reach the app.");
})();
