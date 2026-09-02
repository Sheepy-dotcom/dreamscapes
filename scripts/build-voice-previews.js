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

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("OPENAI_API_KEY is not set. Copy it from the Vercel project settings.");
  process.exit(1);
}

const appJs = fs.readFileSync(appJsPath, "utf8");

function readConst(name) {
  const match = appJs.match(new RegExp(`const ${name} = "([^"]*)"`));
  if (!match) throw new Error(`Could not find ${name} in app.js`);
  return match[1];
}

const previewText = readConst("VOICE_PREVIEW_TEXT");

// Mirror the pauses the app puts into a real story, so a preview sounds like
// the narration it is previewing rather than a faster, gapless version.
const wordBreathing = /const NARRATION_WORD_BREATHING = true/.test(appJs);

function withNarrationPauses(text) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const shaped = sentences.map((sentence) => {
    const trimmed = sentence.trim();
    if (!wordBreathing) return trimmed;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length <= 4) return trimmed;
    const groups = [];
    for (let i = 0; i < words.length; i += 4) groups.push(words.slice(i, i + 4).join(" "));
    return groups.join("\n");
  });
  return shaped.join("\n\n\n");
}

const previewInput = withNarrationPauses(previewText);
const model = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const speed = Number(process.env.OPENAI_TTS_SPEED || 0.95);

// The shared direction every voice gets, so a preview matches the real thing.
const sharedMatch = appJs.match(/const AI_VOICE_SHARED_DIRECTION = \[([\s\S]*?)\]\.join\(" "\);/);
const shared = sharedMatch
  ? (sharedMatch[1].match(/"([^"]+)"/g) || []).map((line) => line.slice(1, -1)).join(" ")
  : "";

const profilePattern =
  /"([a-z ]+)":\s*\{\s*voice:\s*"([a-z]+)",\s*accent:\s*"([a-z]+)",\s*label:\s*"([^"]+)",\s*direction:\s*\n?\s*"([^"]+)"/g;

const voices = [...appJs.matchAll(profilePattern)].map(([, style, voice, accent, label, direction]) => ({
  style,
  voice,
  accent,
  label,
  direction,
  file: `voice-preview-${style.replace(/\s+/g, "-")}.mp3`,
}));

if (voices.length === 0) {
  console.error("No voice profiles found in app.js. Has AI_VOICE_PROFILES changed shape?");
  process.exit(1);
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
    "This is a voice preview. Read only this exact preview sentence and stop after the word begin.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function generate(profile) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      voice: profile.voice,
      input: previewInput,
      instructions: buildInstructions(profile),
      speed,
      response_format: "mp3",
    }),
  });

  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

(async () => {
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

  const mapping = written.map((p) => `  "${p.style}": "./assets/${p.file}",`).join("\n");
  const updated = appJs.replace(
    /const VOICE_PREVIEW_FILES = \{[\s\S]*?\n\};/,
    `const VOICE_PREVIEW_FILES = {\n${mapping}\n};`
  );

  if (updated === appJs) {
    // Either the mapping already matches, or the block could not be found.
    if (written.every((p) => appJs.includes(`./assets/${p.file}`))) {
      console.log(`\nVOICE_PREVIEW_FILES already points at all ${written.length} clips.`);
      console.log("Now bump app.js?v= in index.html and run: npm run mobile:sync");
      return;
    }
    console.error("\nCould not rewrite VOICE_PREVIEW_FILES; add the entries below by hand:\n" + mapping);
    process.exit(1);
  }

  fs.writeFileSync(appJsPath, updated);
  console.log(`\nPointed VOICE_PREVIEW_FILES at ${written.length} clips.`);
  console.log("Now bump app.js?v= in index.html and run: npm run mobile:sync");
})();
