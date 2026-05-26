const screens = {
  welcome: document.querySelector("#welcome-screen"),
  builder: document.querySelector("#builder-screen"),
  loading: document.querySelector("#loading-screen"),
  result: document.querySelector("#result-screen"),
  library: document.querySelector("#library-screen"),
  upgrade: document.querySelector("#upgrade-screen"),
  safety: document.querySelector("#safety-screen"),
  privacy: document.querySelector("#privacy-screen"),
  terms: document.querySelector("#terms-screen"),
  contact: document.querySelector("#contact-screen"),
};

const form = document.querySelector("#story-form");
const statusNote = document.querySelector("#status-note");
const planNote = document.querySelector("#plan-note");
const currentPlanName = document.querySelector("#current-plan-name");
const currentPlanSummary = document.querySelector("#current-plan-summary");
const upgradeNote = document.querySelector("#upgrade-note");
const audioToggle = document.querySelector("#audio-narration");
const audioPlayButton = document.querySelector("#audio-play-button");
const audioPauseButton = document.querySelector("#audio-pause-button");
const narrationNote = document.querySelector("#narration-note");
const voiceStyle = document.querySelector("#voice-style");
const voiceRate = document.querySelector("#voice-rate");
const voicePreviewButton = document.querySelector("#voice-preview-button");
const storyIdea = document.querySelector("#story-idea");
const libraryList = document.querySelector("#library-list");
let currentStory = null;
let currentNarration = null;
let currentNarrationSegments = [];
let currentNarrationIndex = 0;
let currentNarrationTimer = null;
let narrationPausedBetweenSegments = false;
let currentAudio = null;
let currentAudioTracks = [];
let currentAudioIndex = 0;
let aiAudioPausedBetweenTracks = false;
let narrationRequestInFlight = false;
const AI_ENDPOINT = window.DREAMSCAPES_AI_ENDPOINT || "/api/story";
const NARRATION_ENDPOINT = window.DREAMSCAPES_NARRATION_ENDPOINT || "/api/narrate";
const MAX_LOCAL_SAVED_STORIES = 30;
const MAX_LIBRARY_RENDER_ITEMS = 30;

const plans = {
  free: {
    label: "Free",
    price: "£0",
    summary: "£0, 3 stories/month, up to 10 min",
    monthlyStories: 3,
    maxDuration: 10,
    canSave: false,
    canUseAudio: false,
    savedLimit: 0,
    audioMinutes: 0,
    note: "Free package: 3 stories this month, no saved library or audio narration.",
  },
  premier: {
    label: "Premier",
    price: "£4.99/month",
    summary: "£4.99/month, 15 stories, saves, up to 30 min",
    monthlyStories: 15,
    maxDuration: 30,
    canSave: true,
    canUseAudio: false,
    savedLimit: 15,
    audioMinutes: 0,
    note: "Premier package: £4.99/month for 15 stories, saved story library, and stories up to 30 minutes.",
  },
  plus: {
    label: "DreamScapes Plus",
    price: "£9.99/month",
    summary: "£9.99/month, 30 stories, saves + audio",
    monthlyStories: 30,
    maxDuration: 60,
    canSave: true,
    canUseAudio: true,
    savedLimit: 30,
    audioMinutes: 150,
    note: "DreamScapes Plus: £9.99/month for 30 stories, larger saved library, audio narration, 150 audio minutes, and stories up to 1 hour.",
  },
};

const moodDetails = {
  relaxing: {
    titleWord: "Gentle",
    tone: "soft as a blanket and calm as a little moonbeam",
    lesson: "quiet courage can be just as powerful as loud bravery",
    ending: "the whole world seemed to breathe slowly with them",
  },
  magical: {
    titleWord: "Starry",
    tone: "sparkling with tiny wonders and friendly enchantment",
    lesson: "kindness is a kind of magic that grows when it is shared",
    ending: "a trail of gold shimmered softly behind every happy step",
  },
  funny: {
    titleWord: "Wobbly",
    tone: "bright, playful, and full of cheerful surprises",
    lesson: "laughing together can turn a muddle into a memory",
    ending: "everyone giggled until their cheeks felt warm and sunny",
  },
  adventurous: {
    titleWord: "Brave",
    tone: "wide-eyed, bold, and full of discovery",
    lesson: "being brave means trying carefully, even when something feels new",
    ending: "home felt even sweeter after such a grand adventure",
  },
  energetic: {
    titleWord: "Bright",
    tone: "bouncy, lively, and full of get-up-and-go",
    lesson: "big energy shines brightest when it helps others",
    ending: "the day finished with high-fives, warm smiles, and proud hearts",
  },
  "sleepy bedtime": {
    titleWord: "Sleepy",
    tone: "hushed, cosy, and ready for drifting dreams",
    lesson: "rest helps every little heart grow strong for tomorrow",
    ending: "sleep arrived like a soft cloud and tucked them in",
  },
  educational: {
    titleWord: "Curious",
    tone: "full of gentle questions, discoveries, and bright little facts",
    lesson: "learning feels wonderful when curiosity and kindness go together",
    ending: "one new idea twinkled warmly in their mind",
  },
};

const gentleOpeners = [
  "Once, when the sky was painted with soft colours",
  "In a cosy corner of a world just beyond the bedroom window",
  "One lovely day, when the clouds looked like pillows",
  "Under a friendly moon and a sprinkle of stars",
];

const durationDetails = {
  5: {
    label: "5 min",
    pacing: "The adventure was small enough to fit in a pocket, but big enough to glow.",
    extraBeats: [],
  },
  10: {
    label: "10 min",
    pacing: "Along the way there were three small moments to remember.",
    extraBeats: [
      (name) =>
        `First, ${name} shared a brave smile. Then, ${name} asked a thoughtful question. Finally, ${name} offered help in a way that made everyone feel safe and seen. The DreamScape glowed brighter with each good choice.`,
    ],
  },
  15: {
    label: "15 min",
    premium: true,
    pacing: "This story had room to wander through several gentle turns.",
    extraBeats: [
      (name) =>
        `The path curled past silver flowers, sleepy clouds, and a tiny bridge that hummed when kind words crossed it. ${name} noticed that every place in the DreamScape became friendlier when someone listened carefully.`,
      (name) =>
        `A second little challenge appeared, and ${name} took a slow breath before choosing what to do. That pause made space for a thoughtful answer, and the answer helped everyone move forward together.`,
    ],
  },
  20: {
    label: "20 min",
    premium: true,
    pacing: "This story unfolded slowly, with extra room for wonder, kindness, and a cosy journey home.",
    extraBeats: [
      (name) =>
        `${name} travelled beyond a sleepy hill where the grass whispered good ideas. Every step revealed a new small wonder: a lantern that glowed when someone said thank you, a map that brightened when friends worked together, and a gate that opened only for gentle hearts.`,
      (name) =>
        `When the biggest question arrived, ${name} did not need to solve it alone. The friends in the DreamScape gathered close, shared what they knew, and discovered that everyone had something useful and lovely to offer.`,
      (name) =>
        `Before heading home, ${name} looked back at the sparkling path and felt proud. The adventure had been full of twists, but each twist had become easier with patience, care, and a little imagination.`,
    ],
  },
  30: {
    label: "30 min",
    premium: true,
    pacing: "This longer story moved like a gentle bedtime journey, with room for deeper wonder and a richer world.",
    extraBeats: [
      (name) =>
        `${name} followed a ribbon of starlight to a valley where every tree kept a kind memory in its leaves. The memories rustled softly, helping ${name} understand that even small choices can echo in lovely ways.`,
      (name) =>
        `A new friend appeared with a worry too heavy to carry alone. ${name} stayed close, asked what would help, and learned that listening can be a lantern when someone feels unsure.`,
      (name) =>
        `The DreamScape opened into a moonlit meadow where the adventure paused for a quiet celebration. Everyone shared one brave thing they had tried, and each brave thing made the meadow shine a little brighter.`,
      (name) =>
        `When it was time to continue, ${name} knew the way forward would not be rushed. Step by step, with kindness and imagination, the path became clear.`,
    ],
  },
  45: {
    label: "45 min",
    premium: true,
    pacing: "This extended story had space for a wide trail of wonder, friendship, and gentle discovery.",
    extraBeats: [
      (name) =>
        `${name} crossed into the Library of Little Dreams, where books fluttered their pages like sleepy wings. One book opened to a map that could only be read by someone willing to help without being asked.`,
      (name) =>
        `The first part of the journey led to a garden of giggling flowers. The flowers had mixed up their colours, so ${name} helped them find what made each one special instead of trying to make them all the same.`,
      (name) =>
        `A soft silver rain came next. It did not make anyone cold; it washed worries into tiny puddles, and ${name} learned that worries feel smaller when they are spoken kindly.`,
      (name) =>
        `After that, the path led to a hill where a shy light waited under a leaf. ${name} did not tug or shout. ${name} simply sat nearby until the light felt ready to glow.`,
      (name) =>
        `By the final stretch, the whole DreamScape had become a circle of friends, each carrying a little piece of the answer. Together, they made a happy ending bigger than any one of them could have made alone.`,
    ],
  },
  60: {
    label: "1 hour",
    premium: true,
    pacing: "This full-length story unfolded as a cosy bedtime journey with many gentle moments and a slow, peaceful landing.",
    extraBeats: [
      (name) =>
        `${name} began in the Village of Whispering Windows, where every window showed a kind thing someone had done. The village bell rang softly whenever a child chose patience.`,
      (name) =>
        `The first part of the journey led through Cloud Orchard, where fluffy cloud-fruit drifted just out of reach. ${name} discovered that asking for help made the reaching easier and the sharing sweeter.`,
      (name) =>
        `Next came the River of Remembering. Its water carried pictures of brave tries, gentle apologies, and moments when someone kept going. ${name} watched the pictures sparkle and felt a calm sort of pride.`,
      (name) =>
        `At the Sleepy Mountain, a door in the rock asked a question: what makes a heart strong? ${name} thought about all the friends along the way and answered with care, kindness, rest, and courage.`,
      (name) =>
        `Behind the door was a room full of tiny stars learning how to shine. Some stars were bold, some were quiet, and some needed more time. ${name} helped them see that every light matters.`,
      (name) =>
        `The journey home was slow and soft. Each friend gave ${name} a small blessing for peaceful dreams, and each blessing settled like a feather in the evening air.`,
      (name) =>
        `When the last path appeared, ${name} did not feel sad that the adventure was ending. A good story, ${name} realised, can come home with you and keep glowing inside your heart.`,
    ],
  },
};

const voiceStyles = {
  "female calm": { rate: 0.72, pitch: 1, volume: 0.86, pause: 850 },
  "female default": { rate: 0.8, pitch: 1.02, volume: 0.88, pause: 680 },
  "female cheerful": { rate: 0.84, pitch: 1.06, volume: 0.9, pause: 560 },
  "male calm": { rate: 0.72, pitch: 0.88, volume: 0.86, pause: 850 },
  "male default": { rate: 0.8, pitch: 0.92, volume: 0.88, pause: 680 },
  "male cheerful": { rate: 0.84, pitch: 0.96, volume: 0.9, pause: 560 },
};

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
  document.querySelectorAll("[data-screen-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.screenTarget === name);
  });
  if (name === "library") renderLibrary();
  trackEvent("screen_view", { screen: name });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function trackEvent(name, details = {}) {
  const event = {
    name,
    details,
    createdAt: new Date().toISOString(),
  };
  let events = [];

  try {
    const storedEvents = JSON.parse(localStorage.getItem("dreamscapesAnalytics") || "[]");
    events = Array.isArray(storedEvents) ? storedEvents : [];
  } catch {
    events = [];
  }

  events.unshift(event);
  localStorage.setItem("dreamscapesAnalytics", JSON.stringify(events.slice(0, 80)));
}

function getValue(name) {
  return new FormData(form).get(name).toString().trim();
}

function getValues(name) {
  return new FormData(form).getAll(name).map((value) => value.toString().trim());
}

function tidyIdea(idea, childName) {
  const fallback = `${childName} discovers a glowing storybook and helps a tiny star find its way home.`;
  const cleanIdea = idea.replace(/\s+/g, " ").trim();
  return cleanIdea || fallback;
}

function sentenceCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function joinNatural(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function getSelectedMoods(moods) {
  const selected = Array.isArray(moods) ? moods : [moods].filter(Boolean);
  return selected.filter((mood) => moodDetails[mood]);
}

function blendMoods(moods) {
  const selectedMoods = moods.length > 0 ? moods : ["relaxing"];
  const details = selectedMoods.map((mood) => moodDetails[mood]);
  const primary = details[0];
  const titleWord =
    details.length === 1
      ? primary.titleWord
      : `${primary.titleWord}-${details[details.length - 1].titleWord}`;

  return {
    titleWord,
    tone: joinNatural(details.map((detail) => detail.tone)),
    lesson: joinNatural(details.map((detail) => detail.lesson)),
    ending: details[details.length - 1].ending,
  };
}

function getDuration(duration) {
  return durationDetails[duration] || durationDetails[5];
}

function getPlan(plan) {
  return plans[plan] || plans.free;
}

function getCurrentPlanKey() {
  return localStorage.getItem("dreamscapesCurrentPlan") || "free";
}

function setCurrentPlan(plan) {
  localStorage.setItem("dreamscapesCurrentPlan", plan);
  updatePlanFeatures();
}

function getUsageKey(plan) {
  const date = new Date();
  return `dreamscapesUsage:${plan}:${date.getFullYear()}-${date.getMonth() + 1}`;
}

function getStoriesUsed(plan) {
  return Number(localStorage.getItem(getUsageKey(plan)) || "0");
}

function incrementStoriesUsed(plan) {
  const used = getStoriesUsed(plan) + 1;
  localStorage.setItem(getUsageKey(plan), String(used));
  return used;
}

function updatePlanFeatures() {
  const planKey = getCurrentPlanKey();
  const plan = getPlan(planKey);
  const used = getStoriesUsed(planKey);
  const remaining = Math.max(plan.monthlyStories - used, 0);

  currentPlanName.textContent = plan.label;
  currentPlanSummary.textContent = plan.summary;
  planNote.textContent = `${plan.note} ${remaining} of ${plan.monthlyStories} story creations left this month.`;
  audioToggle.disabled = !plan.canUseAudio;
  audioToggle.closest(".feature-toggle").classList.toggle("locked", !plan.canUseAudio);

  if (!plan.canUseAudio) audioToggle.checked = false;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function generateStory(data) {
  const moods = getSelectedMoods(data.moods);
  const mood = blendMoods(moods);
  const duration = getDuration(data.duration);
  const opener = gentleOpeners[Math.floor(Math.random() * gentleOpeners.length)];
  const typeLine =
    data.storyType === "bedtime"
      ? "The evening was quiet, and every little sound seemed to tiptoe."
      : "The day felt bright, open, and ready for a wonderful idea.";

  const title = `${mood.titleWord} Dreams for ${data.childName}`;
  const idea = tidyIdea(data.storyIdea, data.childName);
  const interestLine = data.interests
    ? `Because ${data.childName} loved ${data.interests}, the DreamScape tucked those favourite things into the path.`
    : "";
  const safetyLine = data.avoidTopics
    ? `The DreamScape carefully avoided ${data.avoidTopics}, choosing safe and gentle wonders instead.`
    : "";
  const lessonLine = data.preferredLesson
    ? `The heart of the adventure quietly pointed toward ${data.preferredLesson}.`
    : "";
  const calmLine = data.calmMode
    ? "Every exciting moment softened before bedtime, like a bright lantern turned low."
    : "";

  const paragraphs = [
    `${opener}, ${data.childName}, who was ${data.childAge}, heard a tiny whisper from a place where stories are born. ${typeLine} The whisper carried one special idea: ${idea}`,
    `${data.childName} stepped carefully into the DreamScape, where clouds curled like cushions and stars blinked hello. Everything felt ${mood.tone}. ${duration.pacing}`,
    `Soon, ${data.childName} met a small problem that needed a gentle heart. Instead of rushing, ${data.childName} listened, noticed who needed help, and chose the kindest next step. Bit by bit, the story became warmer.`,
  ];

  [interestLine, safetyLine, lessonLine, calmLine].filter(Boolean).forEach((line) => {
    paragraphs.push(line);
  });

  paragraphs.push(...duration.extraBeats.map((beat) => beat(data.childName)));

  if (Number(data.duration) <= 5) {
    paragraphs.push(
      `Before long, ${data.childName} understood that ${mood.lesson}. It was a little lesson with a lovely shine.`
    );
  } else {
    paragraphs.push(
      `By the time the path curved toward home, ${data.childName} understood that ${mood.lesson}. That lesson settled gently inside, like a secret star kept safe in a pocket.`
    );
  }

  paragraphs.push(
    `At the end, everything was peaceful and good. ${sentenceCase(mood.ending)}, and ${data.childName} carried the happy ending home.`
  );

  return {
    ...data,
    title,
    text: paragraphs,
    createdAt: new Date().toISOString(),
  };
}

function createPrompt(data) {
  const plan = getPlan(data.plan);
  return [
    "Write a safe, child-friendly personalised children's story.",
    `Child name: ${data.childName}`,
    `Child age: ${data.childAge}`,
    `Package: ${plan.label}`,
    `Interests: ${data.interests || "not specified"}`,
    `Avoid topics: ${data.avoidTopics || "none specified"}`,
    `Preferred lesson: ${data.preferredLesson || "use a gentle relevant lesson"}`,
    `Bedtime calm mode: ${data.calmMode ? "yes" : "no"}`,
    `Target reading time: ${getDuration(data.duration).label}`,
    `Premium tier: ${getDuration(data.duration).premium ? "yes, over 10 minutes" : "no"}`,
    `Audio narration requested: ${data.audioNarration ? "yes" : "no"}`,
    `Story type: ${data.storyType === "bedtime" ? "bedtime story" : "anytime story"}`,
    `Moods: ${getSelectedMoods(data.moods).join(", ")}`,
    `Story idea: ${tidyIdea(data.storyIdea, data.childName)}`,
    "Use warm imaginative language, a positive ending, and a gentle lesson where appropriate.",
    "Return JSON with title and paragraphs fields.",
  ].join("\n");
}

async function createStory(data) {
  if (!AI_ENDPOINT) return generateStory(data);

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, prompt: createPrompt(data) }),
    });

    if (!response.ok) throw new Error("Story endpoint unavailable");

    const aiStory = await response.json();
    if (!aiStory.title || !Array.isArray(aiStory.paragraphs)) {
      throw new Error("Story endpoint returned an unexpected shape");
    }

    return {
      ...data,
      title: aiStory.title,
      text: aiStory.paragraphs,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return generateStory(data);
  }
}

function renderStory(story) {
  const selectedMoods = getSelectedMoods(story.moods);
  const duration = getDuration(story.duration);
  const plan = getPlan(story.plan);
  document.querySelector("#story-title").textContent = story.title;
  document.querySelector("#story-meta").innerHTML = `
    <span>${plan.label}</span>
    <span>${duration.label}${duration.premium ? " Premium" : ""}</span>
    <span>${story.storyType === "bedtime" ? "Bedtime story" : "Anytime story"}</span>
    <span>${selectedMoods.map(sentenceCase).join(" + ")}</span>
    <span>${story.audioNarration ? "Audio narration" : "Text only"}</span>
    <span>Age ${story.childAge}</span>
  `;
  document.querySelector("#story-text").innerHTML = story.text
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  narrationNote.textContent = story.audioNarration
    ? story.aiAudioTracks?.length
      ? "Premium audio saved with this story"
      : "First play creates and saves premium audio"
    : "Turn on audio before generating a story";
}

function storyAsText(story) {
  return `${story.title}\n\n${story.text.join("\n\n")}`;
}

function cleanNarrationText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/DreamScape/g, "Dream Scape")
    .replace(/DreamScapes/g, "Dream Scapes")
    .trim();
}

function splitNarrationText(text) {
  const cleanText = cleanNarrationText(text);
  if (cleanText.length <= 260) return [cleanText];

  const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
  const chunks = [];
  let chunk = "";

  sentences.forEach((sentence) => {
    const nextChunk = `${chunk} ${sentence}`.trim();
    if (nextChunk.length > 260 && chunk) {
      chunks.push(chunk);
      chunk = sentence.trim();
      return;
    }

    chunk = nextChunk;
  });

  if (chunk) chunks.push(chunk);
  return chunks;
}

function storyAsNarrationSegments(story) {
  return [
    cleanNarrationText(story.title),
    ...story.text.flatMap((paragraph) => splitNarrationText(paragraph)),
  ].filter(Boolean);
}

function getAiNarrationVoice(style) {
  const voices = {
    "female calm": "shimmer",
    "female default": "nova",
    "female cheerful": "coral",
    "male calm": "onyx",
    "male default": "echo",
    "male cheerful": "echo",
  };

  return voices[style] || "shimmer";
}

function getAiNarrationInstructions(story) {
  const mood = getSelectedMoods(story.moods).join(", ") || "gentle";
  const voiceLabel = {
    "female calm": "a calm English woman reading softly at bedtime",
    "female default": "a warm English woman reading naturally to a child",
    "female cheerful": "a cheerful English woman reading warmly to a child, bright but still gentle",
    "male calm": "a calm English man reading softly at bedtime",
    "male default": "a warm English man reading naturally to a child",
    "male cheerful": "a cheerful English man reading warmly to a child, bright but still gentle",
  }[story.voiceStyle] || "a warm English adult reading to a child";
  const bedtimeDirection =
    story.storyType === "bedtime"
      ? "Use a slow, cosy bedtime pace with gentle pauses, soft phrasing, and a sleepy final line."
      : "Use a gentle, clear storytelling pace with relaxed energy.";

  return [
    `Read this children's story as ${voiceLabel}.`,
    `The child is age ${story.childAge}.`,
    `Mood: ${mood}.`,
    bedtimeDirection,
    "Sound close, human, and reassuring, like a parent calmly reading beside the bed.",
    "Use soft consonants, mild expression, relaxed pacing, and tiny pauses after emotional sentences.",
    "Avoid announcer energy, theatrical exaggeration, sharp emphasis, or robotic cadence.",
    "Do not add extra words that are not in the story.",
  ].join(" ");
}

function getSavedStories() {
  try {
    const stories = JSON.parse(localStorage.getItem("dreamscapesStories") || "[]");
    return Array.isArray(stories) ? stories : [];
  } catch {
    return [];
  }
}

function setSavedStories(stories) {
  localStorage.setItem(
    "dreamscapesStories",
    JSON.stringify(stories.slice(0, MAX_LOCAL_SAVED_STORIES))
  );
}

function createStoryId() {
  if ("crypto" in window && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `story-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStoryStorageSize(story) {
  return JSON.stringify(story).length;
}

function saveStoryToLibrary(story, { silent = false } = {}) {
  const plan = getPlan(story.plan);

  if (!plan.canSave) {
    if (!silent) statusNote.textContent = "Saved story libraries are included with Premier and DreamScapes Plus.";
    return false;
  }

  const storyToSave = {
    ...story,
    id: story.id || createStoryId(),
    savedAt: new Date().toISOString(),
  };
  const savedStories = getSavedStories().filter((savedStory) => savedStory.id !== storyToSave.id);
  savedStories.unshift(storyToSave);

  try {
    setSavedStories(savedStories.slice(0, Math.min(plan.savedLimit, MAX_LOCAL_SAVED_STORIES)));
  } catch {
    const withoutAudio = {
      ...storyToSave,
      aiAudioTracks: [],
      aiAudioGeneratedAt: "",
    };
    const smallerStories = [withoutAudio, ...savedStories.slice(1)];
    try {
      setSavedStories(smallerStories.slice(0, Math.min(plan.savedLimit, MAX_LOCAL_SAVED_STORIES)));
    } catch {
      if (!silent) {
        statusNote.textContent = "This device storage is full, so the story could not be saved here.";
      }
      return false;
    }
  }

  currentStory = storyToSave;

  if (!silent) {
    statusNote.textContent = `Story saved to this device. ${plan.label} keeps up to ${plan.savedLimit} saved stories here.`;
  }

  trackEvent("story_saved", {
    plan: story.plan,
    hasAudio: Boolean(storyToSave.aiAudioTracks?.length),
    size: getStoryStorageSize(storyToSave),
  });
  renderLibrary();
  return true;
}

function applyNarrationSettings(utterance, story = currentStory) {
  const style = voiceStyles[story?.voiceStyle] || voiceStyles["female calm"];
  utterance.rate = Number(story?.voiceRate || voiceRate.value || style.rate);
  utterance.pitch = style.pitch;
  utterance.volume = style.volume;
}

document.querySelector("#start-button").addEventListener("click", () => showScreen("builder"));
document.querySelector("#welcome-back-button").addEventListener("click", () => showScreen("welcome"));
document.querySelectorAll("[data-screen-target]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.screenTarget));
});

document.querySelectorAll("[data-idea]").forEach((button) => {
  button.addEventListener("click", () => {
    storyIdea.value = button.dataset.idea;
    trackEvent("idea_example_selected", { label: button.textContent.trim() });
  });
});

async function playAiVoicePreview() {
  const response = await fetch(NARRATION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Hello from DreamScapes. Settle in, take a gentle breath, and let the story begin softly.",
      voice: getAiNarrationVoice(voiceStyle.value),
      instructions: getAiNarrationInstructions({
        childAge: "5",
        moods: ["relaxing"],
        storyType: "bedtime",
        voiceStyle: voiceStyle.value,
      }),
    }),
  });

  if (!response.ok) return false;

  const data = await response.json();
  if (!Array.isArray(data.audio) || !data.audio[0]) return false;

  const previewAudio = new Audio(data.audio[0]);
  await previewAudio.play();
  return true;
}

function playDeviceVoicePreview() {
  if (!("speechSynthesis" in window)) {
    return false;
  }

  window.speechSynthesis.cancel();
  const preview = new SpeechSynthesisUtterance(
    "Hello from DreamScapes. Settle in, take a gentle breath, and let the story begin softly."
  );
  applyNarrationSettings(preview, {
    voiceStyle: voiceStyle.value,
    voiceRate: voiceRate.value,
  });
  window.speechSynthesis.speak(preview);
  return true;
}

voicePreviewButton.addEventListener("click", async () => {
  voicePreviewButton.disabled = true;
  voicePreviewButton.textContent = "Playing...";
  planNote.textContent = "Preparing voice preview...";

  try {
    const usedAiPreview = await playAiVoicePreview();
    if (usedAiPreview) {
      planNote.textContent = "Playing premium AI voice preview.";
      trackEvent("voice_preview", { voiceStyle: voiceStyle.value, source: "ai" });
      return;
    }
  } catch {
    // Fall through to device preview.
  } finally {
    voicePreviewButton.disabled = false;
    voicePreviewButton.textContent = "Preview Voice";
  }

  if (playDeviceVoicePreview()) {
    planNote.textContent = "Playing device voice preview. Premium AI preview needs the OpenAI key and credits.";
    trackEvent("voice_preview", { voiceStyle: voiceStyle.value, source: "device" });
    return;
  }

  planNote.textContent = "Voice preview is not available in this browser.";
});

document.querySelector("#create-another-button").addEventListener("click", () => {
  statusNote.textContent = "";
  stopNarration();
  updatePlanFeatures();
  showScreen("builder");
});

document.querySelectorAll("[data-plan-select]").forEach((button) => {
  button.addEventListener("click", () => {
    const planKey = button.dataset.planSelect;
    const plan = getPlan(planKey);
    setCurrentPlan(planKey);
    upgradeNote.textContent =
      planKey === "free"
        ? `${plan.label} is now the active package.`
        : `${plan.label} is active in app-preview mode. App Store and Google Play subscriptions will handle real payments.`;
    showScreen("builder");
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedPlanKey = getCurrentPlanKey();
  const selectedPlan = getPlan(selectedPlanKey);
  const selectedDuration = Number(getValue("durationChoice"));
  const usedStories = getStoriesUsed(selectedPlanKey);

  if (usedStories >= selectedPlan.monthlyStories) {
    planNote.textContent = `${selectedPlan.label} has reached its ${selectedPlan.monthlyStories} story monthly limit. Choose another package to continue.`;
    return;
  }

  if (selectedDuration > selectedPlan.maxDuration) {
    planNote.textContent = `${selectedPlan.label} includes stories up to ${selectedPlan.maxDuration} minutes. Choose a shorter duration or select a higher package.`;
    return;
  }

  showScreen("loading");

  const storyData = {
    plan: selectedPlanKey,
    childName: getValue("childName"),
    childAge: getValue("childAge"),
    interests: getValue("interests"),
    duration: getValue("durationChoice"),
    storyType: getValue("storyType"),
    moods: getValues("moods"),
    storyIdea: getValue("storyIdea"),
    avoidTopics: getValue("avoidTopics"),
    preferredLesson: getValue("preferredLesson"),
    calmMode: new FormData(form).has("calmMode"),
    audioNarration: selectedPlan.canUseAudio && audioToggle.checked,
    voiceStyle: getValue("voiceStyle"),
    voiceRate: getValue("voiceRate"),
  };

  window.setTimeout(async () => {
    currentStory = {
      ...(await createStory(storyData)),
      id: createStoryId(),
      aiAudioTracks: [],
      aiAudioGeneratedAt: "",
    };
    incrementStoriesUsed(selectedPlanKey);
    renderStory(currentStory);
    if (selectedPlan.canSave) {
      saveStoryToLibrary(currentStory, { silent: true });
      statusNote.textContent = "Story saved automatically to your library.";
    } else {
      statusNote.textContent = "";
    }
    trackEvent("story_generated", {
      plan: selectedPlanKey,
      duration: storyData.duration,
      audio: storyData.audioNarration,
    });
    showScreen("result");
  }, 900);
});

document.querySelector("#save-story-button").addEventListener("click", () => {
  if (!currentStory) return;
  saveStoryToLibrary(currentStory);
});

document.querySelectorAll("[data-premium-extra]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!currentStory) return;
    const plan = getPlan(currentStory.plan);
    const feature = button.dataset.premiumExtra;

    if (plan !== plans.plus) {
      statusNote.textContent = `${sentenceCase(feature)} will be a DreamScapes Plus feature.`;
      return;
    }

    statusNote.textContent = `${sentenceCase(feature)} is ready for the next backend build.`;
  });
});

function renderLibrary() {
  const savedStories = getSavedStories();
  const visibleStories = savedStories.slice(0, MAX_LIBRARY_RENDER_ITEMS);

  if (savedStories.length === 0) {
    libraryList.innerHTML = `
      <article class="library-item">
        <h3>No saved stories yet</h3>
        <p>Premier and DreamScapes Plus stories can be saved here.</p>
        <button class="button primary-button" data-screen-target="builder" type="button">Create a Story</button>
      </article>
    `;
    libraryList.querySelector("[data-screen-target]")?.addEventListener("click", () => showScreen("builder"));
    return;
  }

  libraryList.innerHTML = visibleStories
    .map(
      (story, index) => `
        <article class="library-item">
          <h3>${escapeHtml(story.title)}</h3>
          <p>${escapeHtml(getPlan(story.plan).label)} · ${escapeHtml(getDuration(story.duration).label)} · ${new Date(story.createdAt).toLocaleDateString()}</p>
          <p>${escapeHtml(story.text?.[0]?.slice(0, 120) || "Saved story")}...</p>
          <div class="library-actions">
            <button class="button secondary-button" data-library-index="${index}" type="button">Open</button>
            <button class="button secondary-button delete-button" data-delete-index="${index}" type="button">Delete</button>
          </div>
        </article>
      `
    )
    .join("");

  libraryList.querySelectorAll("[data-library-index]").forEach((button) => {
    button.addEventListener("click", () => {
      currentStory = savedStories[Number(button.dataset.libraryIndex)];
      renderStory(currentStory);
      statusNote.textContent = "";
      showScreen("result");
    });
  });

  libraryList.querySelectorAll("[data-delete-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.deleteIndex);
      const nextStories = getSavedStories();
      nextStories.splice(index, 1);
      setSavedStories(nextStories);
      trackEvent("story_deleted", { index });
      renderLibrary();
    });
  });
}

function canUseNarration() {
  if (!currentStory) return;
  const plan = getPlan(currentStory.plan);

  if (!plan.canUseAudio) {
    statusNote.textContent = "Audio narration is included with DreamScapes Plus.";
    return false;
  }

  if (!currentStory.audioNarration) {
    statusNote.textContent = "Audio was not requested for this story. Turn it on in the builder before generating.";
    return false;
  }

  return true;
}

function stopNarration() {
  window.clearTimeout(currentNarrationTimer);
  currentNarrationTimer = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
  }
  currentNarration = null;
  currentNarrationSegments = [];
  currentNarrationIndex = 0;
  narrationPausedBetweenSegments = false;
  currentAudio = null;
  currentAudioTracks = [];
  currentAudioIndex = 0;
  aiAudioPausedBetweenTracks = false;
}

function getNarrationPause(story = currentStory) {
  const style = voiceStyles[story?.voiceStyle] || voiceStyles["female calm"];
  return story?.storyType === "bedtime" ? style.pause + 180 : style.pause;
}

function speakNarrationSegment() {
  if (!("speechSynthesis" in window)) {
    statusNote.textContent = "Device narration is not available in this browser.";
    return;
  }

  if (narrationPausedBetweenSegments) return;

  if (!currentStory || currentNarrationIndex >= currentNarrationSegments.length) {
    currentNarration = null;
    currentNarrationSegments = [];
    currentNarrationIndex = 0;
    narrationPausedBetweenSegments = false;
    statusNote.textContent = "Audio narration finished.";
    return;
  }

  currentNarration = new SpeechSynthesisUtterance(currentNarrationSegments[currentNarrationIndex]);
  applyNarrationSettings(currentNarration);
  currentNarration.onend = () => {
    currentNarrationIndex += 1;
    currentNarrationTimer = window.setTimeout(speakNarrationSegment, getNarrationPause());
  };
  currentNarration.onerror = () => {
    currentNarration = null;
    statusNote.textContent = "Audio narration stopped. Try another device voice.";
  };
  window.speechSynthesis.speak(currentNarration);
}

function playAiAudioTrack() {
  if (aiAudioPausedBetweenTracks) return;

  if (currentAudioIndex >= currentAudioTracks.length) {
    currentAudio = null;
    currentAudioTracks = [];
    currentAudioIndex = 0;
    aiAudioPausedBetweenTracks = false;
    statusNote.textContent = "AI narration finished.";
    return;
  }

  currentAudio = new Audio(currentAudioTracks[currentAudioIndex]);
  currentAudio.onended = () => {
    currentAudioIndex += 1;
    currentNarrationTimer = window.setTimeout(playAiAudioTrack, getNarrationPause());
  };
  currentAudio.onerror = () => {
    currentAudio = null;
    statusNote.textContent = "AI narration stopped. Trying the device voice instead.";
    startDeviceNarration();
  };
  currentAudio.play().catch(() => {
    currentAudio = null;
    statusNote.textContent = "AI narration could not play. Trying the device voice instead.";
    startDeviceNarration();
  });
}

async function startAiNarration() {
  if (Array.isArray(currentStory.aiAudioTracks) && currentStory.aiAudioTracks.length > 0) {
    currentAudioTracks = currentStory.aiAudioTracks;
    currentAudioIndex = 0;
    playAiAudioTrack();
    statusNote.textContent = "Playing saved premium AI narration.";
    narrationNote.textContent = "Using saved audio, no new AI request";
    trackEvent("cached_ai_audio_played", { voiceStyle: currentStory.voiceStyle });
    return true;
  }

  try {
    const response = await fetch(NARRATION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: currentStory.title,
        text: storyAsText(currentStory),
        voice: getAiNarrationVoice(currentStory.voiceStyle),
        instructions: getAiNarrationInstructions(currentStory),
      }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (!Array.isArray(data.audio) || data.audio.length === 0) return false;

    currentAudioTracks = data.audio;
    currentAudioIndex = 0;
    currentStory = {
      ...currentStory,
      aiAudioTracks: data.audio,
      aiAudioGeneratedAt: new Date().toISOString(),
    };
    saveStoryToLibrary(currentStory, { silent: true });
    playAiAudioTrack();
    statusNote.textContent = "Playing premium AI narration. Audio saved for replay.";
    narrationNote.textContent = "Premium audio saved with this story";
    trackEvent("ai_audio_played", {
      voiceStyle: currentStory.voiceStyle,
      chunks: data.audio.length,
    });
    return true;
  } catch {
    return false;
  }
}

function startDeviceNarration() {
  if (!("speechSynthesis" in window)) {
    statusNote.textContent = "AI narration is not configured yet, and device narration is not available in this browser.";
    return;
  }

  currentNarrationSegments = storyAsNarrationSegments(currentStory);
  currentNarrationIndex = 0;
  speakNarrationSegment();
  statusNote.textContent = "AI narration is not configured yet, so this is using the device voice.";
}

audioPlayButton.addEventListener("click", async () => {
  if (!canUseNarration()) return;

  if (narrationRequestInFlight) {
    statusNote.textContent = "Audio is already being prepared.";
    return;
  }

  if (currentAudio) {
    currentAudio.play().catch(() => {
      statusNote.textContent = "AI narration could not resume. Try pressing play again.";
    });
    statusNote.textContent = "AI narration resumed.";
    return;
  }

  if (aiAudioPausedBetweenTracks && currentAudioTracks.length > 0) {
    aiAudioPausedBetweenTracks = false;
    playAiAudioTrack();
    statusNote.textContent = "AI narration resumed.";
    return;
  }

  if ("speechSynthesis" in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    statusNote.textContent = "Audio narration resumed.";
    return;
  }

  if (narrationPausedBetweenSegments && currentNarrationSegments.length > 0) {
    narrationPausedBetweenSegments = false;
    speakNarrationSegment();
    trackEvent("audio_resumed");
    statusNote.textContent = "Audio narration resumed.";
    return;
  }

  stopNarration();
  statusNote.textContent = "Preparing premium AI narration...";
  narrationRequestInFlight = true;
  const usedAiNarration = await startAiNarration();
  narrationRequestInFlight = false;
  if (!usedAiNarration) startDeviceNarration();
  trackEvent("audio_played", { voiceStyle: currentStory.voiceStyle });
});

audioPauseButton.addEventListener("click", () => {
  if (!canUseNarration()) return;

  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    trackEvent("audio_paused");
    statusNote.textContent = "AI narration paused.";
    return;
  }

  if (currentAudioTracks.length > 0) {
    window.clearTimeout(currentNarrationTimer);
    aiAudioPausedBetweenTracks = true;
    trackEvent("audio_paused");
    statusNote.textContent = "AI narration paused.";
    return;
  }

  if (
    "speechSynthesis" in window &&
    window.speechSynthesis.speaking &&
    !window.speechSynthesis.paused
  ) {
    window.speechSynthesis.pause();
    trackEvent("audio_paused");
    statusNote.textContent = "Audio narration paused.";
    return;
  }

  if (currentNarrationSegments.length > 0) {
    window.clearTimeout(currentNarrationTimer);
    narrationPausedBetweenSegments = true;
    trackEvent("audio_paused");
    statusNote.textContent = "Audio narration paused.";
    return;
  }

  if ("speechSynthesis" in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    trackEvent("audio_resumed");
    statusNote.textContent = "Audio narration resumed.";
    return;
  }

  statusNote.textContent = "Start the narration before pausing.";
});

updatePlanFeatures();
