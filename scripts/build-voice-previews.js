#!/usr/bin/env node
// Generates one preview clip per narration voice into assets/, and points
// VOICE_PREVIEW_FILES in app.js at them.
//
//   OPENAI_API_KEY=sk-... node scripts/build-voice-previews.js          # missing only
//   OPENAI_API_KEY=sk-... node scripts/build-voice-previews.js --force  # all of them
//
// Shipping the clips means a preview costs nothing and plays instantly for
// every user, rather than each device synthesising its own on first press.

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appJsPath = path.join(root, "app.js");
const assetsDir = path.join(root, "assets");
const force = process.argv.includes("--force");
// --emit-bodies <dir> writes the exact request body for each voice and sends
// nothing. Useful for seeing what a voice will actually be asked to do before
// paying for it, and for generating the clips from somewhere else.
const emitIndex = process.argv.indexOf("--emit-bodies");
const emitDir = emitIndex === -1 ? null : process.argv[emitIndex + 1];

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey && !emitDir) {
  console.error("OPENAI_API_KEY is not set. Copy it from the Vercel project settings.");
  process.exit(1);
}

const appJs = fs.readFileSync(appJsPath, "utf8");

function readConst(name) {
  const match = appJs.match(new RegExp(`const ${name} =\\s*"([^"]*)"`));
  if (!match) throw new Error(`Could not find ${name} in app.js`);
  return match[1];
}

const previewText = readConst("VOICE_PREVIEW_TEXT");

// Mirror the pauses the app puts into a real story, so a preview sounds like
// the narration it is previewing rather than a faster, gapless version. Read
// from app.js rather than repeated here, so the two cannot drift.
function readPause(name) {
  const match = appJs.match(new RegExp(`const ${name} =\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  if (!match) throw new Error(`Could not find ${name} in app.js`);
  return JSON.parse(`"${match[1]}"`);
}

const SENTENCE_PAUSE = readPause("NARRATION_SENTENCE_PAUSE");

function withNarrationPauses(text) {
  const sentences = (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text]).map((s) => s.trim());
  return sentences.join(SENTENCE_PAUSE);
}

// Each clip says its own name, so the text is built per voice rather than once.
function previewInputFor(name) {
  return withNarrationPauses(previewText.replace("{name}", name));
}
// These must track api/narrate.js, or a parent picks a voice from a preview
// that is not what their stories will sound like. The speed in particular was
// 0.95 here: that is the value that made every preview sound fuzzy, because
// the parameter resamples finished audio, and narration was moved back to 1.
const model = process.env.OPENAI_TTS_MODEL || "gpt-audio-mini";
// Follows the same rule as api/narrate.js, so a preview is always cut by the
// model that will narrate - otherwise a parent picks a voice from a sample the
// story will not match.
const usesSpeechEndpoint = /^(tts-1|gpt-4o(-mini)?-tts)/.test(model);
const speed = Number(process.env.OPENAI_TTS_SPEED || 1);

// The shared direction every voice gets, so a preview matches the real thing.
const pauseDirection = (() => {
  const match = appJs.match(/const NARRATION_PAUSE_DIRECTION =\s*([\s\S]*?);\n/);
  return match ? (match[1].match(/"([^"]*)"/g) || []).map((part) => part.slice(1, -1)).join("") : "";
})();

const sharedMatch = appJs.match(/const AI_VOICE_SHARED_DIRECTION = \[([\s\S]*?)\]\.join\(" "\);/);
const shared = sharedMatch
  ? (sharedMatch[1].match(/"([^"]+)"/g) || []).map((line) => line.slice(1, -1)).join(" ")
  : "";

const profilePattern =
  /"([a-z ]+)":\s*\{\s*voice:\s*"([a-z]+)",\s*accent:\s*"([a-z]+)",\s*label:\s*"([^"]+)",\s*direction:\s*\n?\s*"([^"]+)"/g;

const allVoices = [...appJs.matchAll(profilePattern)].map(([, style, voice, accent, label, direction]) => ({
  style,
  voice,
  accent,
  label,
  direction,
  file: `voice-preview-${style.replace(/\s+/g, "-")}.mp3`,
}));

if (allVoices.length === 0) {
  console.error("No voice profiles found in app.js. Has AI_VOICE_PROFILES changed shape?");
  process.exit(1);
}

// AI_VOICE_PROFILES also carries voices the picker no longer offers, so that
// stories saved in them still narrate correctly. Those need no preview clip,
// and generating them would quietly put retired audio back into the bundle.
//
// The list comes from the picker in index.html, not from VOICE_PREVIEW_FILES.
// This script rewrites that map from whatever it managed to produce, so
// reading it back meant one failed request dropped a voice from the map, and
// the next run then had no reason to retry it: a network blip could quietly
// remove a voice from the app for good. The markup cannot be clobbered that way.
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const picker = indexHtml.slice(
  indexHtml.indexOf('id="voice-style"'),
  indexHtml.indexOf("</select>", indexHtml.indexOf('id="voice-style"'))
);
const optionPattern = /<option value="([^"]+)"[^>]*>([^<]*)<\/option>/g;
const nameByStyle = new Map([...picker.matchAll(optionPattern)].map((m) => [m[1], m[2].trim()]));
const selectable = new Set(nameByStyle.keys());
const voices = allVoices
  .filter((profile) => selectable.has(profile.style))
  .map((profile) => ({ ...profile, name: nameByStyle.get(profile.style) }));

if (voices.length === 0) {
  console.error("No profile matched VOICE_PREVIEW_FILES. Are the style keys still the same?");
  process.exit(1);
}
if (voices.length < allVoices.length) {
  const retired = allVoices.filter((profile) => !selectable.has(profile.style)).map((profile) => profile.style);
  console.log(`retired, no preview needed: ${retired.join(", ")}\n`);
}

function buildInstructions(profile) {
  return [
    `Read this children's story as ${profile.label}.`,
    profile.direction,
    shared,
    "Sound close, human, and reassuring, like a parent calmly reading beside the bed.",
    profile.accent === "british"
      ? "Keep the spoken accent clearly UK/British English throughout and do not drift into American pronunciation."
      : "",
    pauseDirection,
    `Your name is ${profile.name}. Say it naturally, as a person introducing themselves.`,
    "This is a voice preview. Read only this exact preview sentence and stop after the word begin.",
  ]
    .filter(Boolean)
    .join(" ");
}

/* gpt-audio-mini answers rather than reads, and here that would be obvious:
   the preview is the voice introducing itself by name, so anything invented
   lands in the one clip a parent listens to before choosing. Same wording
   api/narrate.js uses, for the same reason. */
function systemDirectionFor(profile) {
  return [
    "You are a text-to-speech engine, not an assistant.",
    "Speak the user's message aloud word for word, exactly as written.",
    "Add nothing: no greeting, no reply, no commentary, no continuation, no stage directions.",
    "Never invent content. Your entire spoken output must be the user's text and nothing else.",
    buildInstructions(profile),
    "Everything above changes delivery only - never the words themselves.",
  ].join(" ");
}

function requestBody(profile) {
  if (usesSpeechEndpoint) {
    return {
      model,
      voice: profile.voice,
      input: previewInputFor(profile.name),
      instructions: buildInstructions(profile),
      speed,
      response_format: "mp3",
    };
  }

  return {
    model,
    modalities: ["text", "audio"],
    audio: { voice: profile.voice, format: "mp3" },
    messages: [
      { role: "system", content: systemDirectionFor(profile) },
      { role: "user", content: previewInputFor(profile.name) },
    ],
  };
}

// Punctuation and casing are delivery; the words are what must match.
function sameWords(a, b) {
  const words = (value) =>
    String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).join(" ");
  return words(a) === words(b);
}

async function send(profile) {
  const url = usesSpeechEndpoint
    ? "https://api.openai.com/v1/audio/speech"
    : "https://api.openai.com/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(requestBody(profile)),
  });

  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  if (usesSpeechEndpoint) return { audio: Buffer.from(await response.arrayBuffer()), spoken: null };

  const payload = await response.json();
  const part = payload?.choices?.[0]?.message?.audio;
  if (!part?.data) throw new Error("no audio in the response");
  return { audio: Buffer.from(part.data, "base64"), spoken: (part.transcript || "").trim() };
}

/* A preview that says the wrong thing is worse than a missing one: it is the
   sample a parent judges the whole app's narration by. The transcript says
   exactly what was spoken, so a stray take is thrown away rather than shipped. */
async function generate(profile) {
  const wanted = previewInputFor(profile.name);
  let last = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { audio, spoken } = await send(profile);
    if (spoken === null || sameWords(spoken, wanted)) return audio;
    last = spoken;
    console.log(`  retry  ${profile.style.padEnd(18)} said ${JSON.stringify(spoken.slice(0, 70))}`);
  }

  throw new Error(`never read the preview line; last take was ${JSON.stringify((last || "").slice(0, 90))}`);
}

(async () => {
  if (emitDir) {
    fs.mkdirSync(emitDir, { recursive: true });
    for (const profile of voices) {
      const out = path.join(emitDir, `${profile.style.replace(/\s+/g, "-")}.json`);
      fs.writeFileSync(out, JSON.stringify(requestBody(profile), null, 2));
      console.log(`body   ${profile.style.padEnd(18)} -> ${out}  (${profile.name}, voice=${profile.voice})`);
    }
    console.log(`\nWrote ${voices.length} request bodies. Nothing was sent.`);
    return;
  }

  const written = [];

  for (const profile of voices) {
    const target = path.join(assetsDir, profile.file);
    if (!force && fs.existsSync(target)) {
      console.log(`skip   ${profile.style.padEnd(18)} ${profile.file} (exists)`);
      written.push(profile);
      continue;
    }

    try {
      const audio = await generate(profile);
      fs.writeFileSync(target, audio);
      console.log(`wrote  ${profile.style.padEnd(18)} ${profile.file} (${Math.round(audio.length / 1024)}KB)`);
      written.push(profile);
    } catch (error) {
      console.error(`FAILED ${profile.style.padEnd(18)} ${error.message.slice(0, 160)}`);
    }
  }

  if (written.length === 0) {
    console.error("\nNothing generated, leaving app.js alone.");
    process.exit(1);
  }

  // Checked against the picker, not against the profiles that parsed, so a
  // profile this script failed to read shows up here instead of going quiet.
  const missing = [...selectable].filter((style) => !written.some((p) => p.style === style));
  if (missing.length) {
    console.error(`\nThese voices are in the picker but have no clip: ${missing.join(", ")}`);
    console.error("Fix the failure and run again; app.js is left alone so none of them is dropped.");
    process.exit(1);
  }

  /* Everything under assets/ is served immutable for a year, so a clip
     replaced in place never reaches anyone who has already heard it - not on a
     reload, not on a hard reload. The old version of this script wrote the
     paths bare, which would have quietly stripped the ?v= strings already in
     app.js and left six stale previews in every existing install. Stamp one
     that is always higher than what is there now. */
  const today = Number(new Date().toISOString().slice(0, 10).replace(/-/g, "")) * 100;
  const existing = [...appJs.matchAll(/voice-preview-[a-z-]+\.mp3\?v=(\d+)/g)].map((m) => Number(m[1]));
  const stamp = Math.max(today, ...existing.map((v) => v + 1));

  const mapping = written.map((p) => `  "${p.style}": "./assets/${p.file}?v=${stamp}",`).join("\n");
  const updated = appJs.replace(
    /const VOICE_PREVIEW_FILES = \{[\s\S]*?\n\};/,
    `const VOICE_PREVIEW_FILES = {\n${mapping}\n};`
  );

  if (updated === appJs) {
    // Either the mapping already matches, or the block could not be found.
    if (written.every((p) => appJs.includes(`./assets/${p.file}?v=`))) {
      console.log(`\nVOICE_PREVIEW_FILES already points at all ${written.length} clips.`);
      console.log("Now bump app.js?v= in index.html and run: npm run mobile:sync");
      return;
    }
    console.error("\nCould not rewrite VOICE_PREVIEW_FILES; add the entries below by hand:\n" + mapping);
    process.exit(1);
  }

  fs.writeFileSync(appJsPath, updated);
  console.log(`\nPointed VOICE_PREVIEW_FILES at ${written.length} clips, stamped ?v=${stamp}.`);
  console.log("Now bump app.js?v= in index.html and run: npm run mobile:sync");
})();
