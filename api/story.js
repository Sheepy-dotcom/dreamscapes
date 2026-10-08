const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const {
  enforceStoryAccess,
  handleCorsPreflight,
  incrementUsage,
  sendApiError,
  supabaseRequest,
} = require("./auth");
// Measured, not assumed. The eight voices in the picker read this model's
// output at 145 to 182 words per minute with the app's own instructions, mean
// about 167; the value below is a touch under that so a story runs slightly
// long rather than short. It was 85, which is a read-aloud pace no synthetic
// voice here goes anywhere near, and every duration the app offered was
// therefore about half what it said - a 30 minute story played for 15.
const NARRATION_WORDS_PER_MINUTE = 165;
const OPTIONAL_RETENTION_COLUMNS = [
  "story_language",
  "story_summary",
  "next_ideas",
  "occasion",
  "recurring_characters",
  "series_id",
  "series_title",
  "chapter_number",
  "journey_length",
  "journey_day",
];

// Word counts follow from NARRATION_WORDS_PER_MINUTE above, keeping the same
// tolerance either side and about 65 words a paragraph. getMaxOutputTokens asks
// for maxWords * 2.6, so the longest story now requests about 14,600 tokens of
// the 24,000 ceiling.
// Word counts follow from NARRATION_WORDS_PER_MINUTE above, keeping the same
// tolerance either side and about 65 words a paragraph. Everything past ten
// minutes is written in sections - see SECTION_MAX_WORDS - because no single
// request can emit this many words inside the function's minute.
const durationTargets = {
  5: { words: 825, minWords: 740, maxWords: 970, paragraphs: 13 },
  10: { words: 1650, minWords: 1485, maxWords: 1870, paragraphs: 25 },
  20: { words: 3300, minWords: 2970, maxWords: 3740, paragraphs: 49 },
  30: { words: 4950, minWords: 4455, maxWords: 5600, paragraphs: 74 },
};

// Generation time is spent emitting words - about 43 a second, measured - and
// this function gets 60 of them. A story longer than roughly 1,700 words
// cannot be written in one request however it is prompted, so long ones are
// written a section at a time, each its own request with its own budget. The
// narration endpoint has always worked this way; this brings story generation
// into line with it. Sections get no retry: a second attempt inside the same
// request is what the budget cannot afford.
// A story of 1,700 words or less is written in one request: measured at 48 to
// 55 seconds, which fits but leaves little room. Anything longer is split into
// pieces of about 1,250 words, which land near 33 seconds each - margin enough
// that a slow response does not cost the parent the whole story.
const SINGLE_REQUEST_MAX_WORDS = 1700;
const SECTION_TARGET_WORDS = 1250;
// The longest duration whose whole story fits in one request.
const LONGEST_SINGLE_REQUEST_DURATION = 10;

function getSectionCount(duration) {
  const { words } = getTarget(duration);
  if (words <= SINGLE_REQUEST_MAX_WORDS) return 1;
  return Math.max(2, Math.ceil(words / SECTION_TARGET_WORDS));
}

// A section is asked for less than its arithmetic share, because the model
// writes past whatever it is given: measured at 1.12 to 1.29 times the asked
// figure across six sections, even with the hard limit stated. Asking for 85%
// of the share lands the finished story near its intended length instead of a
// fifth over it. The aim is deliberately a little high: a story longer than
// its label is a small annoyance, one shorter is the bug this set out to fix.
const SECTION_OVERSHOOT = 0.95;

function getSectionTarget(duration, count) {
  const target = getTarget(duration);
  if (count <= 1) return target;
  const words = Math.round((target.words / count) * SECTION_OVERSHOOT);
  return {
    words,
    minWords: Math.round(words * 0.85),
    maxWords: Math.round(words * 1.1),
    paragraphs: Math.max(3, Math.round(target.paragraphs / count)),
  };
}

const storyLanguages = {
  "en-GB": {
    label: "English",
    prompt: "British English",
    instruction:
      "Write in British English throughout, using UK spelling and natural British wording. For example: mum, favourite, cosy, colour, realised.",
  },
  "cy-GB": {
    label: "Welsh",
    prompt: "Welsh",
    instruction: "Write the full story in Welsh, using natural child-friendly Welsh wording.",
  },
  "fr-FR": {
    label: "French",
    prompt: "French",
    instruction: "Write the full story in French, using natural child-friendly wording.",
  },
  "es-ES": {
    label: "Spanish",
    prompt: "Spanish",
    instruction: "Write the full story in Spanish, using natural child-friendly wording.",
  },
  "de-DE": {
    label: "German",
    prompt: "German",
    instruction: "Write the full story in German, using natural child-friendly wording.",
  },
  "it-IT": {
    label: "Italian",
    prompt: "Italian",
    instruction: "Write the full story in Italian, using natural child-friendly wording.",
  },
  "pt-PT": {
    label: "Portuguese",
    prompt: "Portuguese",
    instruction: "Write the full story in Portuguese, using natural child-friendly wording.",
  },
  "pl-PL": {
    label: "Polish",
    prompt: "Polish",
    instruction: "Write the full story in Polish, using natural child-friendly wording.",
  },
  ar: {
    label: "Arabic",
    prompt: "Arabic",
    instruction: "Write the full story in Arabic, using natural child-friendly wording.",
  },
  "hi-IN": {
    label: "Hindi",
    prompt: "Hindi",
    instruction: "Write the full story in Hindi, using natural child-friendly wording.",
  },
  "ur-PK": {
    label: "Urdu",
    prompt: "Urdu",
    instruction: "Write the full story in Urdu, using natural child-friendly wording.",
  },
  "zh-CN": {
    label: "Mandarin Chinese",
    prompt: "Mandarin Chinese",
    instruction: "Write the full story in Simplified Chinese, using natural child-friendly wording.",
  },
  "ja-JP": {
    label: "Japanese",
    prompt: "Japanese",
    instruction: "Write the full story in Japanese, using natural child-friendly wording.",
  },
  "ko-KR": {
    label: "Korean",
    prompt: "Korean",
    instruction: "Write the full story in Korean, using natural child-friendly wording.",
  },
  "nl-NL": {
    label: "Dutch",
    prompt: "Dutch",
    instruction: "Write the full story in Dutch, using natural child-friendly wording.",
  },
};

function cleanText(value, fallback = "") {
  return String(value || fallback)
    .replace(/\s+/g, " ")
    .trim();
}

function cleanList(values) {
  return Array.isArray(values) ? values.map((value) => cleanText(value)).filter(Boolean) : [];
}

function getTarget(duration) {
  return durationTargets[Number(duration)] || durationTargets[5];
}

function getStoryLanguage(value) {
  return storyLanguages[value] || storyLanguages["en-GB"];
}

function getMaxOutputTokens(duration, maxWordsOverride = 0) {
  const maxWords = maxWordsOverride || getTarget(duration).maxWords;
  return Math.min(Math.ceil(maxWords * 2.6), 24000);
}

function getEstimatedNarrationMinutes(wordCount) {
  return Math.round((wordCount / NARRATION_WORDS_PER_MINUTE) * 10) / 10;
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || content.refusal || "")
    .join("")
    .trim();
}

function getStoryModel() {
  return cleanText(process.env.OPENAI_STORY_MODEL, "gpt-5.6-sol");
}

function getStoryModelCandidates() {
  const configuredModel = getStoryModel();
  const fallbackModels = ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-4.1", "gpt-4o", "gpt-4o-mini"];

  return [configuredModel, ...fallbackModels].filter(
    (model, index, models) => model && models.indexOf(model) === index
  );
}

function shouldTryNextStoryModel(status, message) {
  if (![400, 404].includes(Number(status))) return false;

  return /model|not found|does not exist|invalid|unsupported|access|permission/i.test(message || "");
}

// One of these is picked per story. They are deliberately different kinds of
// sentence, not synonyms, because the model will converge on whichever shape it
// is given room to repeat.
const TITLE_SHAPES = [
  "name a place from the story, with no verb in it.",
  "use something a character says out loud, in their own words.",
  "ask a question a child would ask.",
  "use two or three words only, concrete and a little odd.",
  "name an object from the story and what happened to it.",
  "say when the story happens, as a time or a moment rather than a date.",
  "name the problem the story solves, plainly.",
  "use a small, specific detail a child would notice before an adult would.",
];

function buildPrompt(data, section = null) {
  // A section is written to its own share of the word count; the whole-story
  // target would have one request try to write the lot.
  const target = section ? getSectionTarget(data.duration, section.count) : getTarget(data.duration);
  const storyType = data.storyType === "bedtime" ? "bedtime story" : "anytime story";
  const moods = cleanList(data.moods);
  const childProfileSummary = cleanList(data.childProfileSummary);
  const language = getStoryLanguage(data.storyLanguage);
  const interests = cleanText(data.interests, "");
  // A parent who names an interest but no story idea has told us what the story
  // should be about. Falling back to a generic adventure here buries that.
  const storyIdea = cleanText(
    data.storyIdea,
    interests
      ? `a gentle adventure built around ${interests}, with a kind positive ending`
      : "a gentle adventure with a kind positive ending"
  );
  const retryNote = data.enforceWordCount
    ? [
        "",
        "Length correction:",
        `- The previous draft was too short for ${cleanText(data.duration, "5")} minutes.`,
        `- This rewrite must be at least ${target.minWords} words and should aim for ${target.words} words.`,
        "- Add more warm scene detail, character moments, dialogue, gentle discoveries, and cosy transitions while keeping the ending positive.",
        "- Do not summarise scenes. Let each scene play out with enough detail for calm audio narration.",
      ]
    : [];

  // Two independent requests cannot vary against each other, so the variation
  // has to be put in. Told only to stop starting every title with the name,
  // the model drops the name from titles altogether - and a parent's child
  // being named in the title is half the point. Roughly half the stories are
  // asked for it and half are not, which is what makes a library look varied.
  const nameInTitle = Math.random() < 0.5;
  // Banning one formula only moves the model to the next one: told to stop
  // writing "<name> and the Moonlit <noun>" it wrote "The <noun> That <verb>"
  // five times out of six. Handing it a different shape each time is what
  // actually makes a shelf of stories look like a shelf of stories.
  const titleShape = TITLE_SHAPES[Math.floor(Math.random() * TITLE_SHAPES.length)];

  return [
    `Write a polished, imaginative children's ${storyType}.`,
    `Story language: ${language.prompt}.`,
    `Child name: ${cleanText(data.childName, "the child")}.`,
    `Child age: ${cleanText(data.childAge, "not specified; use language suitable for a young child")}.`,
    `Child interests: ${interests || "not specified"}.`,
    `Target duration: ${cleanText(data.duration, "5")} minutes of calm narrated audio.`,
    `Word count target: ${target.words} words. Acceptable range: ${target.minWords}-${target.maxWords} words.`,
    // Measured: without this the model writes about 30% over the target, which
    // on a long story is the difference between finishing inside the time the
    // server has and not finishing at all.
    `Hard limit: ${target.maxWords} words. Do not go past it. Stopping a little under is fine; going over is not.`,
    `Paragraph target: about ${target.paragraphs} short, readable paragraphs.`,
    "Timing rule: the selected duration is for slow narrated audio, so the story must be long enough when read aloud calmly with pauses.",
    `Mood blend: ${moods.length ? moods.join(", ") : "relaxing"}.`,
    `Story idea from parent: ${storyIdea}.`,
    `Special occasion or life moment: ${cleanText(data.occasion, "none selected")}.`,
    `Recurring story characters: ${cleanText(data.recurringCharacters, "none selected")}.`,
    `Series title: ${cleanText(data.seriesTitle, "new standalone story")}.`,
    `Series chapter: ${cleanText(data.chapterNumber, "1")}.`,
    `Previous adventure: ${cleanText(data.continuationSummary, "none; begin a fresh adventure")}.`,
    `Chosen direction for this chapter: ${cleanText(data.continuationChoice, "follow the parent's story idea")}.`,
    `Seven-night journey progress: ${data.journeyLength ? `night ${cleanText(data.journeyDay, "1")} of ${cleanText(data.journeyLength, "7")}` : "not part of a journey"}.`,
    `Selected child profile details: ${childProfileSummary.length ? childProfileSummary.join(" | ") : "not selected"}.`,
    `Friends who may appear naturally: ${cleanText(data.friends, "not specified")}.`,
    `Topics to avoid: ${cleanText(data.avoidTopics, "none specified")}.`,
    `Preferred lesson: ${cleanText(data.preferredLesson, "a gentle moral that fits naturally")}.`,
    `Bedtime calm mode: ${data.calmMode ? "yes" : "no"}.`,
    "",
    "Quality requirements:",
    "- Make it feel like a real children's story, not a template.",
    // Left to itself the model titles every story "<name> and the Moonlit
    // <noun>" and furnishes it from the same cupboard: lanterns, fireflies,
    // twinkling stars. Measured over six stories with different children and
    // different interests, six came back with that exact title shape. Naming
    // the rut is the only thing that gets it out.
    `- Title: ${titleShape} Do not use the words moonlit, moonbeam, lantern, twinkling, shimmering, glowing or starlight in it, and do not use the shape "<child's name> and the ...".`,
    nameInTitle
      ? `- Put ${cleanText(data.childName, "the child")}'s name in the title, somewhere other than the opening words.`
      : "- Keep the child's name out of the title; let the title name something from the story instead.",
    "- Imagery: avoid the stock props that fill generated bedtime stories - lanterns, fireflies, glowing orbs, moonbeams, twinkling or winking stars, wise owls, enchanted keys, silver thread. Build the wonder out of this child's own interests and the real detail of this story's world instead.",
    `- ${language.instruction}`,
    "- Use warm, sensory, magical language with clear scenes and character moments.",
    "- Keep it age-appropriate, safe, non-frightening, and parent-friendly.",
    "- Give the child small choices, feelings, and discoveries.",
    "- If interests are given, build the story around them. They should shape the setting, the characters, or the problem to solve, and be recognisable from the first paragraph. A passing mention is not enough - a child who loves dinosaurs should get a story about dinosaurs, not a generic adventure with one dinosaur in it.",
    "- If friends are provided, include them naturally only when it suits the story. Do not force every friend into every scene.",
    "- Use selected profile details naturally where helpful, but do not list physical details awkwardly or make appearance the focus.",
    "- If multiple child profiles are selected, include each child as an important character and give each a kind moment.",
    "- Use short, gentle sentences with frequent natural pauses between phrases for bedtime narration.",
    section
      ? `- Write part ${section.index + 1} of ${section.count} only. Write the whole of this part and nothing beyond it.`
      : "- Do not finish early. The story should feel complete and should land inside the requested word range, especially for 20 and 30 minute stories.",
    "- Longer durations must include more complete scenes, not just longer sentences.",
    "- Include a positive ending and a gentle lesson without sounding preachy.",
    "- If this continues a series, preserve established characters and warmly acknowledge what happened before without repeating the previous story.",
    section && section.index < section.count - 1
      ? "- Do NOT end the story. This is one part of a longer story and another part follows, so stop at a natural moment mid-adventure with something still to come. Put two ideas in nextIdeas anyway; they are ignored until the last part."
      : "- End the main story peacefully and completely, then provide two short, child-friendly ideas for a possible next adventure in the JSON nextIdeas field.",
    "- For bedtime, slow the ending down and make the final paragraph peaceful.",
    "- Do not announce or explain the selected language.",
    "- Do not end with farewell phrases such as ta-ta, ta ta for now, bye, or goodbye.",
    "- Do not mention AI, prompts, packages, subscriptions, or app settings.",
    ...retryNote,
    ...(section && section.index > 0
      ? [
          "",
          `Continuing an existing story - part ${section.index + 1} of ${section.count}:`,
          `- Title: ${cleanText(section.title, "untitled")}.`,
          `- The story so far: ${cleanText(section.summary, "not recorded")}`,
          "- It left off here, and your first sentence follows straight on from it:",
          ...cleanList(section.tail).map((paragraph) => `  "${paragraph}"`),
          "- Do not reintroduce the child or retell what has happened. Do not start a new adventure.",
          "- Do not open with a scene-setting line of the kind a story begins with.",
          "- Keep every established character, place and name exactly as they are.",
          "- Return the summary field as a synopsis of the whole story including this part, which the next part will be given.",
        ]
      : []),
    ...(section && section.count > 1 && section.index === 0
      ? [
          "",
          `This is part 1 of ${section.count}. Open the story and carry it to a natural pause, no further.`,
          "Return the summary field as a synopsis of what has happened so far; the next part is given it and nothing else.",
        ]
      : []),
  ].join("\n");
}

function buildExpansionPrompt(data, story) {
  const target = getTarget(data.duration);
  const currentWordCount = story.wordCount || countWords(story.paragraphs || []);
  const language = getStoryLanguage(data.storyLanguage);

  return [
    "Expand this existing DreamScapes children's story so the final story is much closer to the requested narration duration.",
    `Requested duration: ${cleanText(data.duration, "5")} minutes.`,
    `Current word count: ${currentWordCount} words.`,
    `Required minimum: ${target.minWords} words.`,
    `Target: ${target.words} words.`,
    `Maximum: ${target.maxWords} words.`,
    "",
    "Expansion rules:",
    "- Return the full finished story, not just added paragraphs.",
    "- Keep the same title unless a small improvement is needed.",
    "- Preserve the child's name, selected mood, story type, positive ending, and child-friendly safety.",
    "- Add complete scenes, gentle dialogue, sensory details, character choices, cosy transitions, and natural pauses.",
    "- Do not pad with repeated wording or filler.",
    `- Keep the story in ${language.prompt}, but do not announce the selected language.`,
    "- Do not end with farewell phrases such as ta-ta, ta ta for now, bye, or goodbye.",
    "- The final word count must be inside the requested range unless that is impossible.",
    "",
    "Existing story JSON:",
    JSON.stringify({ title: story.title, summary: story.summary, paragraphs: story.paragraphs }, null, 2),
  ].join("\n");
}

function countWords(paragraphs) {
  return paragraphs
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function normaliseStoryType(value) {
  return value === "anytime" ? "anytime" : "bedtime";
}

function normalisePlan(value) {
  return ["free", "premier", "plus"].includes(value) ? value : "free";
}

function storyToRow({ account, body, story }) {
  return {
    user_id: account.user.id,
    title: story.title,
    child_name: cleanText(body.childName, "the child"),
    child_age: cleanText(body.childAge) || null,
    story_language: cleanText(body.storyLanguage, "en-GB"),
    story_type: normaliseStoryType(body.storyType),
    duration_minutes: Number(body.duration) || 5,
    moods: cleanList(body.moods),
    story_idea: cleanText(body.storyIdea) || null,
    story_summary: cleanText(story.summary) || null,
    next_ideas: cleanList(story.nextIdeas),
    occasion: cleanText(body.occasion) || null,
    recurring_characters: cleanText(body.recurringCharacters) || null,
    series_id: cleanText(body.seriesId) || null,
    series_title: cleanText(body.seriesTitle) || null,
    chapter_number: Number(body.chapterNumber) || 1,
    journey_length: Number(body.journeyLength) || null,
    journey_day: Number(body.journeyDay) || null,
    paragraphs: story.paragraphs || [],
    word_count: story.wordCount || null,
    plan: normalisePlan(account.profile?.plan || body.plan),
    voice_style: cleanText(body.voiceStyle) || null,
    audio_requested: Boolean(body.audioNarration),
    audio_paths: [],
    audio_track_durations: [],
    audio_duration_seconds: null,
    audio_generated_at: null,
    created_at: new Date().toISOString(),
  };
}

async function saveGeneratedStory(account, body, story) {
  if (!account.plan?.canSave) return null;

  const row = storyToRow({ account, body, story });
  const insert = async (payload) =>
    supabaseRequest("/rest/v1/stories?select=*", {
      token: account.token,
      method: "POST",
      prefer: "return=representation",
      body: payload,
    });

  try {
    const saved = await insert(row);
    return saved?.[0] || null;
  } catch (error) {
    const message = String(error.message || "");
    const canFallback = message.includes("word_count") || OPTIONAL_RETENTION_COLUMNS.some((column) => message.includes(column));
    if (!canFallback) throw error;
    const fallbackRow = { ...row };
    delete fallbackRow.word_count;
    OPTIONAL_RETENTION_COLUMNS.forEach((column) => delete fallbackRow[column]);
    const saved = await insert(fallbackRow);
    return saved?.[0] || null;
  }
}

const storySchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "nextIdeas", "paragraphs"],
  properties: {
    title: {
      type: "string",
      minLength: 3,
      maxLength: 90,
    },
    summary: {
      type: "string",
      minLength: 20,
      maxLength: 600,
    },
    nextIdeas: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "string",
        minLength: 8,
        maxLength: 140,
      },
    },
    paragraphs: {
      type: "array",
      minItems: 4,
      maxItems: 120,
      items: {
        type: "string",
        minLength: 20,
        maxLength: 1200,
      },
    },
  },
};

function logModelFallback(failedModel, candidates, reason) {
  const nextModel = candidates[candidates.indexOf(failedModel) + 1];
  const detail = String(reason || "unknown").replace(/\s+/g, " ").slice(0, 300);

  console.warn(
    `[story] Model "${failedModel}" failed; falling back to "${nextModel || "none"}". Reason: ${detail}`
  );
}

async function requestStoryWithPrompt(data, prompt, maxWordsOverride = 0) {
  const modelCandidates = getStoryModelCandidates();
  let lastError = null;

  for (const model of modelCandidates) {
    const requestBody = {
      model,
      input: [
        {
          role: "developer",
          content:
            "You are DreamScapes, an exceptional children's author writing for parents to read aloud. Create an original, emotionally warm story in the requested language with a satisfying narrative arc, vivid but gentle scenes, natural dialogue, and a positive ending. Preserve every safety, personalisation, timing, and output requirement. Never write like a template. Return only valid JSON matching the supplied schema.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_output_tokens: getMaxOutputTokens(data.duration, maxWordsOverride),
      text: {
        format: {
          type: "json_schema",
          name: "dreamscapes_story",
          strict: true,
          schema: storySchema,
        },
      },
    };

    if (model.startsWith("gpt-5")) {
      requestBody.reasoning = { effort: "low" };
      requestBody.text.verbosity = "high";
      requestBody.prompt_cache_key = "dreamscapes-story-v3";
    }

    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const message = await response.text();
      lastError = new Error(message || "Story request failed");

      if (shouldTryNextStoryModel(response.status, message)) {
        logModelFallback(model, modelCandidates, `HTTP ${response.status}: ${message}`);
        continue;
      }

      throw lastError;
    }

    const result = await response.json();
    const text = extractResponseText(result);

    if (!text) {
      lastError = new Error(`Story model returned no text. Status: ${result.status || "unknown"}`);
      logModelFallback(model, modelCandidates, lastError.message);
      continue;
    }

    let story;
    try {
      story = JSON.parse(text);
    } catch {
      lastError = new Error("Story model returned an unreadable draft. Please try generating again.");
      logModelFallback(model, modelCandidates, lastError.message);
      continue;
    }

    const paragraphs = story.paragraphs.map((paragraph) => cleanText(paragraph)).filter(Boolean);

    if (model !== modelCandidates[0]) {
      console.warn(
        `[story] Story served by fallback model "${model}" instead of "${modelCandidates[0]}".`
      );
    }

    return {
      title: cleanText(story.title, "A DreamScapes Story"),
      summary: cleanText(story.summary),
      nextIdeas: cleanList(story.nextIdeas).slice(0, 2),
      paragraphs,
      wordCount: countWords(paragraphs),
      model,
    };
  }

  console.error(
    `[story] All ${modelCandidates.length} story models failed (${modelCandidates.join(", ")}). Last error: ${
      lastError ? lastError.message : "unknown"
    }`
  );

  throw lastError || new Error("Story request failed");
}

async function requestStory(data) {
  return requestStoryWithPrompt(data, buildPrompt(data));
}

async function requestStoryExpansion(data, story) {
  return requestStoryWithPrompt(data, buildExpansionPrompt(data, story));
}

async function createStorySection(data, section) {
  const target = getSectionTarget(data.duration, section.count);
  return requestStoryWithPrompt(data, buildPrompt(data, section), target.maxWords);
}

async function createStory(data) {
  const target = getTarget(data.duration);
  let story = await requestStory(data);

  for (let attempt = 0; attempt < 2 && story.wordCount < target.minWords; attempt += 1) {
    const retry = await requestStory({ ...data, enforceWordCount: true });
    story = retry.wordCount > story.wordCount ? retry : story;
  }

  for (let attempt = 0; attempt < 2 && story.wordCount < target.minWords; attempt += 1) {
    try {
      const expanded = await requestStoryExpansion(data, story);
      story = expanded.wordCount > story.wordCount ? expanded : story;
    } catch {
      break;
    }
  }

  return { ...story, durationTarget: describeDuration(data, story.wordCount) };
}

function describeDuration(data, wordCount) {
  const target = getTarget(data.duration);
  return {
    minutes: Number(data.duration) || 5,
    words: target.words,
    minWords: target.minWords,
    maxWords: target.maxWords,
    actualWords: wordCount,
    estimatedNarrationMinutes: getEstimatedNarrationMinutes(wordCount),
    withinRange: wordCount >= target.minWords && wordCount <= target.maxWords,
    shortByWords: Math.max(0, target.minWords - wordCount),
  };
}

module.exports = async function handler(request, response) {
  if (handleCorsPreflight(request, response, "POST, OPTIONS")) return;

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const account = await enforceStoryAccess(request, body);
    if (!process.env.OPENAI_API_KEY) {
      return response.status(501).json({ error: "OPENAI_API_KEY is not configured" });
    }
    // Long stories arrive a section at a time, each request writing its own
    // share and handing the next one a synopsis and the paragraph it stopped
    // on. Only the last one saves the story and counts it against the monthly
    // allowance, so an abandoned story costs the parent nothing.
    const sectionCount = getSectionCount(body.duration);
    if (sectionCount > 1 && body.section && typeof body.section === "object") {
      const asked = body.section || {};
      const index = Math.min(Math.max(Math.trunc(Number(asked.index) || 0), 0), sectionCount - 1);
      const done = index === sectionCount - 1;
      const part = await createStorySection(body, {
        index,
        count: sectionCount,
        title: asked.title,
        summary: asked.summary,
        tail: asked.tail,
      });
      const earlier = cleanList(asked.paragraphsSoFar);
      const paragraphs = [...earlier, ...part.paragraphs];
      const title = index === 0 ? part.title : cleanText(asked.title, part.title);

      if (!done) {
        return response.status(200).json({
          title,
          summary: part.summary,
          nextIdeas: [],
          paragraphs: part.paragraphs,
          wordCount: countWords(paragraphs),
          section: { index, count: sectionCount, done: false },
        });
      }

      const whole = {
        title,
        summary: part.summary,
        nextIdeas: part.nextIdeas,
        paragraphs,
        wordCount: countWords(paragraphs),
        durationTarget: describeDuration(body, countWords(paragraphs)),
      };
      let savedWhole = null;
      let wholeSaveError = "";
      try {
        savedWhole = await saveGeneratedStory(account, body, whole);
      } catch (error) {
        wholeSaveError = error.message || "Story save failed";
      }
      const wholeUsage = await incrementUsage(account, { stories: 1 });

      return response.status(200).json({
        ...whole,
        cloudId: savedWhole?.id || null,
        savedAt: savedWhole?.updated_at || savedWhole?.created_at || null,
        saveError: wholeSaveError,
        usage: wholeUsage,
        section: { index, count: sectionCount, done: true },
      });
    }

    // An app build from before sectioning asks for a long story in one request,
    // which cannot finish inside the minute. Rather than time out it gets the
    // longest story that does fit, which is what it used to receive anyway.
    const story = await createStory(
      sectionCount > 1 ? { ...body, duration: LONGEST_SINGLE_REQUEST_DURATION } : body
    );
    let savedStory = null;
    let saveError = "";
    try {
      savedStory = await saveGeneratedStory(account, body, story);
    } catch (error) {
      saveError = error.message || "Story save failed";
    }
    const usage = await incrementUsage(account, { stories: 1 });

    return response.status(200).json({
      ...story,
      cloudId: savedStory?.id || null,
      savedAt: savedStory?.updated_at || savedStory?.created_at || null,
      saveError,
      usage,
    });
  } catch (error) {
    return sendApiError(response, error, "Could not create story");
  }
};

// Reused by api/preview-story.js, which needs a single generation call with no
// retries or expansions so an anonymous request cannot cost five of them.
module.exports.requestStory = requestStory;
module.exports.createStory = createStory;
module.exports.createStorySection = createStorySection;
module.exports.getSectionCount = getSectionCount;
