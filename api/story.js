const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const {
  enforceStoryAccess,
  handleCorsPreflight,
  incrementUsage,
  sendApiError,
  supabaseRequest,
} = require("./auth");
const NARRATION_WORDS_PER_MINUTE = 85;
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

const durationTargets = {
  5: { words: 425, minWords: 375, maxWords: 500, paragraphs: 7 },
  10: { words: 850, minWords: 760, maxWords: 960, paragraphs: 12 },
  15: { words: 1275, minWords: 1150, maxWords: 1450, paragraphs: 18 },
  20: { words: 1700, minWords: 1530, maxWords: 1900, paragraphs: 24 },
  30: { words: 2550, minWords: 2300, maxWords: 2850, paragraphs: 34 },
};

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

function getMaxOutputTokens(duration) {
  return Math.min(Math.ceil(getTarget(duration).maxWords * 2.6), 24000);
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
  return cleanText(process.env.OPENAI_STORY_MODEL, "gpt-4.1");
}

function getStoryModelCandidates() {
  const configuredModel = getStoryModel();
  const fallbackModels = ["gpt-4.1", "gpt-4o", "gpt-4o-mini"];

  return [configuredModel, ...fallbackModels].filter(
    (model, index, models) => model && models.indexOf(model) === index
  );
}

function shouldTryNextStoryModel(status, message) {
  if (![400, 404].includes(Number(status))) return false;

  return /model|not found|does not exist|invalid|unsupported|access|permission/i.test(message || "");
}

function buildPrompt(data) {
  const target = getTarget(data.duration);
  const storyType = data.storyType === "bedtime" ? "bedtime story" : "anytime story";
  const moods = cleanList(data.moods);
  const childProfileSummary = cleanList(data.childProfileSummary);
  const language = getStoryLanguage(data.storyLanguage);
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

  return [
    `Write a polished, imaginative children's ${storyType}.`,
    `Story language: ${language.prompt}.`,
    `Child name: ${cleanText(data.childName, "the child")}.`,
    `Child age: ${cleanText(data.childAge, "not specified; use language suitable for a young child")}.`,
    `Target duration: ${cleanText(data.duration, "5")} minutes of calm narrated audio.`,
    `Word count target: ${target.words} words. Acceptable range: ${target.minWords}-${target.maxWords} words.`,
    `Paragraph target: about ${target.paragraphs} short, readable paragraphs.`,
    "Timing rule: the selected duration is for slow narrated audio, so the story must be long enough when read aloud calmly with pauses.",
    `Mood blend: ${moods.length ? moods.join(", ") : "relaxing"}.`,
    `Story idea from parent: ${cleanText(data.storyIdea, "a gentle adventure with a kind positive ending")}.`,
    `Special occasion or life moment: ${cleanText(data.occasion, "none selected")}.`,
    `Recurring story characters: ${cleanText(data.recurringCharacters, "none selected")}.`,
    `Series title: ${cleanText(data.seriesTitle, "new standalone story")}.`,
    `Series chapter: ${cleanText(data.chapterNumber, "1")}.`,
    `Previous adventure: ${cleanText(data.continuationSummary, "none; begin a fresh adventure")}.`,
    `Chosen direction for this chapter: ${cleanText(data.continuationChoice, "follow the parent's story idea")}.`,
    `Seven-night journey progress: ${data.journeyLength ? `night ${cleanText(data.journeyDay, "1")} of ${cleanText(data.journeyLength, "7")}` : "not part of a journey"}.`,
    `Selected child profile details: ${childProfileSummary.length ? childProfileSummary.join(" | ") : "not selected"}.`,
    `Child interests: ${cleanText(data.interests, "not specified")}.`,
    `Friends who may appear naturally: ${cleanText(data.friends, "not specified")}.`,
    `Topics to avoid: ${cleanText(data.avoidTopics, "none specified")}.`,
    `Preferred lesson: ${cleanText(data.preferredLesson, "a gentle moral that fits naturally")}.`,
    `Bedtime calm mode: ${data.calmMode ? "yes" : "no"}.`,
    "",
    "Quality requirements:",
    "- Make it feel like a real children's story, not a template.",
    `- ${language.instruction}`,
    "- Use warm, sensory, magical language with clear scenes and character moments.",
    "- Keep it age-appropriate, safe, non-frightening, and parent-friendly.",
    "- Give the child small choices, feelings, and discoveries.",
    "- If friends are provided, include them naturally only when it suits the story. Do not force every friend into every scene.",
    "- Use selected profile details naturally where helpful, but do not list physical details awkwardly or make appearance the focus.",
    "- If multiple child profiles are selected, include each child as an important character and give each a kind moment.",
    "- Use short, gentle sentences with frequent natural pauses between phrases for bedtime narration.",
    "- Do not finish early. The story should feel complete and should land inside the requested word range, especially for 15, 20, and 30 minute stories.",
    "- Longer durations must include more complete scenes, not just longer sentences.",
    "- Include a positive ending and a gentle lesson without sounding preachy.",
    "- If this continues a series, preserve established characters and warmly acknowledge what happened before without repeating the previous story.",
    "- End the main story peacefully and completely, then provide two short, child-friendly ideas for a possible next adventure in the JSON nextIdeas field.",
    "- For bedtime, slow the ending down and make the final paragraph peaceful.",
    "- Do not announce or explain the selected language.",
    "- Do not end with farewell phrases such as ta-ta, ta ta for now, bye, or goodbye.",
    "- Do not mention AI, prompts, packages, subscriptions, or app settings.",
    ...retryNote,
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

async function requestStoryWithPrompt(data, prompt) {
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
      max_output_tokens: getMaxOutputTokens(data.duration),
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
        continue;
      }

      throw lastError;
    }

    const result = await response.json();
    const text = extractResponseText(result);

    if (!text) {
      lastError = new Error(`Story model returned no text. Status: ${result.status || "unknown"}`);
      continue;
    }

    let story;
    try {
      story = JSON.parse(text);
    } catch {
      lastError = new Error("Story model returned an unreadable draft. Please try generating again.");
      continue;
    }

    const paragraphs = story.paragraphs.map((paragraph) => cleanText(paragraph)).filter(Boolean);

    return {
      title: cleanText(story.title, "A DreamScapes Story"),
      summary: cleanText(story.summary),
      nextIdeas: cleanList(story.nextIdeas).slice(0, 2),
      paragraphs,
      wordCount: countWords(paragraphs),
    };
  }

  throw lastError || new Error("Story request failed");
}

async function requestStory(data) {
  return requestStoryWithPrompt(data, buildPrompt(data));
}

async function requestStoryExpansion(data, story) {
  return requestStoryWithPrompt(data, buildExpansionPrompt(data, story));
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

  const shortByWords = Math.max(0, target.minWords - story.wordCount);

  return {
    ...story,
    durationTarget: {
      minutes: Number(data.duration) || 5,
      words: target.words,
      minWords: target.minWords,
      maxWords: target.maxWords,
      actualWords: story.wordCount,
      estimatedNarrationMinutes: getEstimatedNarrationMinutes(story.wordCount),
      withinRange: story.wordCount >= target.minWords && story.wordCount <= target.maxWords,
      shortByWords,
    },
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
    const story = await createStory(body);
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
