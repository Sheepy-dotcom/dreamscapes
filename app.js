const screens = {
  welcome: document.querySelector("#welcome-screen"),
  builder: document.querySelector("#builder-screen"),
  loading: document.querySelector("#loading-screen"),
  result: document.querySelector("#result-screen"),
  library: document.querySelector("#library-screen"),
  upgrade: document.querySelector("#upgrade-screen"),
  account: document.querySelector("#account-screen"),
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
const audioProgressWrap = document.querySelector("#audio-progress-wrap");
const audioProgress = document.querySelector("#audio-progress");
const audioProgressLabel = document.querySelector("#audio-progress-label");
const voiceStyle = document.querySelector("#voice-style");
const voicePreviewButton = document.querySelector("#voice-preview-button");
const storyIdea = document.querySelector("#story-idea");
const libraryList = document.querySelector("#library-list");
const durationInputs = Array.from(document.querySelectorAll('input[name="durationChoice"]'));
const authForm = document.querySelector("#auth-form");
const authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const authStatus = document.querySelector("#auth-status");
const authSignedOut = document.querySelector("#auth-signed-out");
const authSignedIn = document.querySelector("#auth-signed-in");
const passwordResetCard = document.querySelector("#password-reset-card");
const newPassword = document.querySelector("#new-password");
const accountEmail = document.querySelector("#account-email");
const accountCloudStatus = document.querySelector("#account-cloud-status");
const accountPlan = document.querySelector("#account-plan");
const accountStories = document.querySelector("#account-stories");
const accountAudio = document.querySelector("#account-audio");
let currentStory = null;
let currentUser = null;
let supabaseClient = null;
let cloudStories = [];
let cloudStoriesLoaded = false;
let currentUsage = null;
let currentProfile = null;
let passwordRecoveryActive = false;
let currentNarration = null;
let currentNarrationSegments = [];
let currentNarrationIndex = 0;
let currentNarrationTimer = null;
let narrationPausedBetweenSegments = false;
let currentAudio = null;
let currentAudioTracks = [];
let currentAudioIndex = 0;
let currentAudioTrackDurations = [];
let aiAudioPausedBetweenTracks = false;
let narrationRequestInFlight = false;
let pendingAudioSeekPercent = null;
const AI_ENDPOINT = window.DREAMSCAPES_AI_ENDPOINT || "/api/story";
const NARRATION_ENDPOINT = window.DREAMSCAPES_NARRATION_ENDPOINT || "/api/narrate";
const SUPABASE_URL = "https://khgzzrixhetaontmdhez.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZ3p6cml4aGV0YW9udG1kaGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTkwMjMsImV4cCI6MjA5NTU3NTAyM30.Zij8eBhzxNecuPRsMliWChxYmogLBFbd1GScpKPM_5g";
const AUDIO_BUCKET = "story-audio";
const VOICE_PREVIEW_TEXT = "Hello from DreamScapes. Settle in, take a gentle breath, and let the story begin.";
const VOICE_PREVIEW_FILES = {
  "female calm": "./assets/voice-preview-female-british-calm.mp3",
  "male calm": "./assets/voice-preview-male-british-calm.mp3",
};
const AI_VOICE_PROFILES = {
  "female calm": {
    voice: "nova",
    label: "a calm British English woman reading softly at bedtime",
    direction:
      "Use the same consistent voice every time: a soft southern British bedtime storyteller, gentle, cosy, natural, clear, and reassuring. Keep a steady human pace. Do not sound robotic, theatrical, American, or like an announcer. Do not drag or stretch words.",
  },
  "male calm": {
    voice: "fable",
    label: "a calm British English man reading softly at bedtime",
    direction:
      "Use the same consistent voice every time: a gentle British storybook narrator, warm, steady, natural, low-energy, clear, and reassuring. Keep a steady human pace. Do not sound robotic, theatrical, American, or like an announcer. Do not drag or stretch words.",
  },
};
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
    summary: "£4.99/month, 15 stories, saves, up to 20 min",
    monthlyStories: 15,
    maxDuration: 20,
    canSave: true,
    canUseAudio: false,
    savedLimit: 15,
    audioMinutes: 0,
    note: "Premier package: £4.99/month for 15 stories, saved story library, and stories up to 20 minutes.",
  },
  plus: {
    label: "DreamScapes Plus",
    price: "£9.99/month",
    summary: "£9.99/month, 30 stories, 30 min + audio",
    monthlyStories: 30,
    maxDuration: 30,
    canSave: true,
    canUseAudio: true,
    savedLimit: 30,
    audioMinutes: 150,
    note: "DreamScapes Plus: £9.99/month for 30 stories, larger saved library, audio narration, 150 audio minutes, and stories up to 30 minutes.",
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
};

const voiceStyles = {
  "female calm": { rate: 0.64, pitch: 1, volume: 0.86, pause: 1150 },
  "female default": { rate: 0.64, pitch: 1, volume: 0.86, pause: 1150 },
  "female cheerful": { rate: 0.64, pitch: 1, volume: 0.86, pause: 1150 },
  "male calm": { rate: 0.64, pitch: 0.88, volume: 0.86, pause: 1150 },
  "male default": { rate: 0.64, pitch: 0.88, volume: 0.86, pause: 1150 },
  "male cheerful": { rate: 0.64, pitch: 0.88, volume: 0.86, pause: 1150 },
};

const britishVoiceHints = {
  female: ["serena", "susan", "kate", "karen", "moira", "tessa", "samantha"],
  male: ["daniel", "arthur", "oliver", "george", "tom"],
};

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
  document.body.classList.toggle("home-active", name === "welcome");
  document.querySelectorAll("[data-screen-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.screenTarget === name);
  });
  if (name === "library") renderLibrary();
  if (name === "account") refreshAccountSummary();
  trackEvent("screen_view", { screen: name });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setAuthStatus(message, isError = false) {
  if (!authStatus) return;
  authStatus.textContent = message;
  authStatus.classList.toggle("error", Boolean(isError));
}

function getAuthCredentials() {
  return {
    email: authEmail?.value.trim() || "",
    password: authPassword?.value || "",
  };
}

function validateAuthCredentials(email, password, mode = "sign-in") {
  if (!email) return "Enter your email address.";
  if (!password) {
    return mode === "sign-up"
      ? "Enter a password to create your account."
      : "Enter your password.";
  }
  if (password.length < 6) return "Use a password with at least 6 characters.";
  return "";
}

function isPasswordRecoveryUrl() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);

  return hash.get("type") === "recovery" || query.get("type") === "recovery";
}

function updateAccountUI() {
  const signedIn = Boolean(currentUser);
  const stories = signedIn ? cloudStories : [];
  const totalAudioSeconds = stories.reduce(
    (total, story) => total + (Number(story.aiAudioDurationSeconds) || 0),
    0
  );
  const plan = getPlan(getCurrentPlanKey());
  const storiesUsed = signedIn ? getStoriesUsed(getCurrentPlanKey()) : 0;
  const audioUsed = signedIn ? getAudioSecondsUsed() : 0;

  if (authSignedOut) authSignedOut.hidden = signedIn;
  if (authSignedIn) authSignedIn.hidden = !signedIn;
  if (passwordResetCard && !passwordRecoveryActive) {
    passwordResetCard.hidden = true;
  }
  if (accountEmail) accountEmail.textContent = currentUser?.email || "";
  if (accountPlan) accountPlan.textContent = plan.label;
  if (accountStories) accountStories.textContent = `${storiesUsed}/${plan.monthlyStories}`;
  if (accountAudio) accountAudio.textContent = `${formatAudioTime(audioUsed)} / ${formatAudioTime(plan.audioMinutes * 60)}`;
  if (accountCloudStatus) {
    accountCloudStatus.textContent = signedIn
      ? cloudStoriesLoaded
        ? "Cloud library connected."
        : "Account connected. Library totals load when your cloud stories sync."
      : "Sign in to prepare cloud saving across devices.";
  }
}

function showPasswordResetCard() {
  passwordRecoveryActive = true;
  if (authSignedOut) authSignedOut.hidden = true;
  if (authSignedIn) authSignedIn.hidden = true;
  if (passwordResetCard) passwordResetCard.hidden = false;
  showScreen("account");
}

async function refreshAccountSummary() {
  if (!canUseCloudLibrary()) {
    updateAccountUI();
    return;
  }

  try {
    await loadProfile();
    await loadCloudUsage();
    await loadCloudStories();
  } catch {
    setAuthStatus("Could not refresh account totals yet.", true);
  }

  updateAccountUI();
}

function setCurrentUser(user) {
  currentUser = user || null;
  updateAccountUI();
}

async function loadProfile() {
  if (!canUseCloudLibrary()) return null;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error) throw error;

  currentProfile = data;
  updateAccountUI();
  updatePlanFeatures();
  return currentProfile;
}

async function getApiHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (!supabaseClient) return headers;

  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function initSupabase() {
  if (!window.supabase?.createClient) {
    setAuthStatus("Account login could not load. Check the Supabase script connection.", true);
    updateAccountUI();
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  supabaseClient.auth.getSession().then(({ data }) => {
    setCurrentUser(data.session?.user);
    if (isPasswordRecoveryUrl()) {
      showPasswordResetCard();
      setAuthStatus("Choose a new password to finish resetting your account.");
    }
    if (data.session?.user) refreshAccountSummary();
  });

  supabaseClient.auth.onAuthStateChange((event, session) => {
    setCurrentUser(session?.user);
    cloudStories = [];
    cloudStoriesLoaded = false;
    currentUsage = null;
    currentProfile = null;
    if (event === "PASSWORD_RECOVERY") {
      showPasswordResetCard();
      setAuthStatus("Choose a new password to finish resetting your account.");
    }
    if (session?.user) refreshAccountSummary();
    if (screens.library.classList.contains("active")) renderLibrary();
  });
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

function getChildAgePrompt(age) {
  return age ? age : "not specified; use a warm young-child style around age 5";
}

function getChildAgePhrase(age) {
  return age ? `, who was ${age},` : "";
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
  if (canUseCloudLibrary() && currentProfile?.plan) return currentProfile.plan;
  return "free";
}

function getUsageKey(plan) {
  const date = new Date();
  return `dreamscapesUsage:${plan}:${date.getFullYear()}-${date.getMonth() + 1}`;
}

function getCurrentMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getStoriesUsed(plan) {
  if (canUseCloudLibrary() && currentUsage) {
    return currentUsage.stories_created || 0;
  }

  return Number(localStorage.getItem(getUsageKey(plan)) || "0");
}

function incrementStoriesUsed(plan) {
  if (canUseCloudLibrary()) return currentUsage?.stories_created || 0;

  const used = getStoriesUsed(plan) + 1;
  localStorage.setItem(getUsageKey(plan), String(used));
  return used;
}

function getAudioSecondsUsed() {
  return canUseCloudLibrary() && currentUsage ? Number(currentUsage.audio_seconds_used || 0) : 0;
}

async function loadCloudUsage() {
  if (!canUseCloudLibrary()) return null;

  const monthKey = getCurrentMonthKey();
  const { data, error } = await supabaseClient
    .from("usage_months")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("month_key", monthKey)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    currentUsage = data;
    return currentUsage;
  }

  const { data: insertedUsage, error: insertError } = await supabaseClient
    .from("usage_months")
    .insert({
      user_id: currentUser.id,
      month_key: monthKey,
      stories_created: 0,
      audio_seconds_used: 0,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  currentUsage = insertedUsage;
  return currentUsage;
}

async function addCloudUsage({ stories = 0, audioSeconds = 0 } = {}) {
  if (!canUseCloudLibrary()) return null;

  if (!currentUsage) await loadCloudUsage();

  const nextUsage = {
    stories_created: Number(currentUsage?.stories_created || 0) + stories,
    audio_seconds_used: Number(currentUsage?.audio_seconds_used || 0) + audioSeconds,
  };
  const { data, error } = await supabaseClient
    .from("usage_months")
    .update(nextUsage)
    .eq("id", currentUsage.id)
    .select()
    .single();

  if (error) throw error;

  currentUsage = data;
  updateAccountUI();
  return currentUsage;
}

function updatePlanFeatures() {
  const planKey = getCurrentPlanKey();
  const plan = getPlan(planKey);

  if (currentPlanName) currentPlanName.textContent = plan.label;
  if (currentPlanSummary) currentPlanSummary.textContent = plan.summary;
  if (planNote) planNote.textContent = "";
  audioToggle.closest(".feature-toggle").classList.toggle("locked", !plan.canUseAudio);
  updateDurationLocks(plan);
  keepDurationWithinPlan(plan);
}

function getHighestAllowedDuration(plan) {
  return durationInputs
    .map((input) => Number(input.value))
    .filter((duration) => duration <= plan.maxDuration)
    .sort((a, b) => b - a)[0] || 5;
}

function updateDurationLocks(plan = getPlan(getCurrentPlanKey())) {
  durationInputs.forEach((input) => {
    const duration = Number(input.value);
    const locked = duration > plan.maxDuration;
    const label = input.closest("label");
    input.setAttribute("aria-disabled", String(locked));
    label?.classList.toggle("locked-choice", locked);
    if (label) {
      label.title = locked
        ? `${plan.label} includes stories up to ${plan.maxDuration} minutes.`
        : "";
    }
  });
}

function keepDurationWithinPlan(plan = getPlan(getCurrentPlanKey())) {
  const selectedDuration = Number(getValue("durationChoice"));
  if (selectedDuration <= plan.maxDuration) return false;

  const fallback = getHighestAllowedDuration(plan);
  const fallbackInput = durationInputs.find((input) => Number(input.value) === fallback);
  if (fallbackInput) fallbackInput.checked = true;
  return true;
}

async function requestPlusForAudio() {
  if (getCurrentPlanKey() === "plus") return;

  audioToggle.checked = false;
  planNote.textContent = "Audio narration is included with DreamScapes Plus. App Store and Google Play subscriptions are coming soon.";
  throw new Error("DreamScapes Plus is required for audio.");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitIntoSentences(text) {
  return String(text || "")
    .match(/[^.!?]+[.!?]+["”’']?|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];
}

function formatParagraphForDisplay(paragraph) {
  const sentences = splitIntoSentences(paragraph);
  if (sentences.length <= 1) return escapeHtml(paragraph);

  return sentences
    .map((sentence, index) => {
      const gap = index < sentences.length - 1 ? '<span class="sentence-break" aria-hidden="true"></span>' : "";
      return `${escapeHtml(sentence)}${gap}`;
    })
    .join("");
}

function addNarrationSentenceBreaks(text) {
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 1) return addNarrationWordBreathing(text);
  return sentences.map(addNarrationWordBreathing).join("\n\n");
}

function addNarrationWordBreathing(text) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const phraseLength = 5;
  if (words.length <= phraseLength) return String(text || "");

  const groups = [];
  for (let index = 0; index < words.length; index += phraseLength) {
    groups.push(words.slice(index, index + phraseLength).join(" "));
  }

  return groups.join("\n");
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
    `${opener}, ${data.childName}${getChildAgePhrase(data.childAge)} heard a tiny whisper from a place where stories are born. ${typeLine} The whisper carried one special idea: ${idea}`,
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
    `Child age: ${getChildAgePrompt(data.childAge)}`,
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
    "Use short, gentle sentences with frequent natural pauses between phrases, especially for bedtime narration.",
    "Return JSON with title and paragraphs fields.",
  ].join("\n");
}

async function createStory(data) {
  if (!AI_ENDPOINT) return generateStory(data);

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: await getApiHeaders(),
      body: JSON.stringify({ ...data, prompt: createPrompt(data) }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.error || "Story endpoint unavailable");
    }

    const aiStory = await response.json();
    if (!aiStory.title || !Array.isArray(aiStory.paragraphs)) {
      throw new Error("Story endpoint returned an unexpected shape");
    }

    if (aiStory.usage) {
      currentUsage = aiStory.usage;
      updateAccountUI();
      updatePlanFeatures();
    }

    return {
      ...data,
      title: aiStory.title,
      text: aiStory.paragraphs,
      wordCount: aiStory.wordCount || 0,
      durationTarget: aiStory.durationTarget || null,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    throw error;
  }
}

function renderStory(story) {
  const selectedMoods = getSelectedMoods(story.moods);
  const duration = getDuration(story.duration);
  const plan = getPlan(story.plan);
  const savedAudioDuration = getSavedAudioDurationSeconds(story);
  document.querySelector("#story-title").textContent = story.title;
  document.querySelector("#story-meta").innerHTML = `
    <span>${plan.label}</span>
    <span>${duration.label}${duration.premium ? " Premium" : ""}</span>
    ${savedAudioDuration ? `<span>Audio ${formatAudioTime(savedAudioDuration)}</span>` : ""}
    <span>${story.storyType === "bedtime" ? "Bedtime story" : "Anytime story"}</span>
    <span>${selectedMoods.map(sentenceCase).join(" + ")}</span>
    <span>${story.audioNarration ? "Audio narration" : "Text only"}</span>
    ${story.childAge ? `<span>Age ${story.childAge}</span>` : ""}
  `;
  document.querySelector("#story-text").innerHTML = story.text
    .map((paragraph) => `<p>${formatParagraphForDisplay(paragraph)}</p>`)
    .join("");
  narrationNote.textContent = story.audioNarration
    ? story.aiAudioTracks?.length
      ? savedAudioDuration
        ? `Saved audio length: ${formatAudioTime(savedAudioDuration)}`
        : "Premium audio saved with this story"
      : "First play creates and saves premium audio"
    : "Turn on audio before generating a story";
  resetAudioProgress();
  setAudioProgressVisible(Boolean(story.audioNarration));
}

function storyAsText(story) {
  return `${story.title}\n\n${story.text.map(addNarrationSentenceBreaks).join("\n\n\n")}`;
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

function formatAudioTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getAudioPauseSeconds(story = currentStory) {
  return getNarrationPause(story) / 1000;
}

function getPlaybackDurationSeconds(trackDurations, story = currentStory) {
  if (!Array.isArray(trackDurations) || trackDurations.length === 0) return 0;

  const audioSeconds = trackDurations.reduce(
    (total, duration) => total + (Number.isFinite(duration) ? duration : 0),
    0
  );
  const pauseSeconds = Math.max(0, trackDurations.length - 1) * getAudioPauseSeconds(story);

  return audioSeconds + pauseSeconds;
}

function getSavedAudioDurationSeconds(story) {
  if (Number.isFinite(story?.aiAudioDurationSeconds) && story.aiAudioDurationSeconds > 0) {
    return story.aiAudioDurationSeconds;
  }

  const calculatedDuration = getPlaybackDurationSeconds(story?.aiAudioTrackDurations, story);
  return calculatedDuration > 0 ? calculatedDuration : 0;
}

function measureAudioTrackDuration(src) {
  return new Promise((resolve) => {
    const audio = new Audio(src);
    const finish = (duration) => {
      audio.removeAttribute("src");
      audio.load();
      resolve(Number.isFinite(duration) && duration > 0 ? duration : 0);
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.onerror = () => finish(0);
  });
}

async function measureAudioTrackDurations(tracks) {
  const durations = [];

  for (const track of tracks) {
    durations.push(await measureAudioTrackDuration(track));
  }

  return durations;
}

function dataUrlToBlob(dataUrl) {
  const [metadata, base64] = String(dataUrl || "").split(",");
  const mimeType = metadata.match(/data:(.*?);base64/)?.[1] || "audio/mpeg";
  const bytes = atob(base64 || "");
  const buffer = new Uint8Array(bytes.length);

  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }

  return new Blob([buffer], { type: mimeType });
}

async function getSignedAudioUrls(paths) {
  if (!canUseCloudLibrary() || !Array.isArray(paths) || paths.length === 0) return [];

  const { data, error } = await supabaseClient.storage
    .from(AUDIO_BUCKET)
    .createSignedUrls(paths, 60 * 60);

  if (error) throw error;

  return (data || []).map((item) => item.signedUrl).filter(Boolean);
}

async function uploadAudioTracksToCloud(story, tracks) {
  if (!canUseCloudLibrary() || !Array.isArray(tracks) || tracks.length === 0) return [];

  const storyId = story.cloudId || story.id || createStoryId();
  const uploadedPaths = [];

  for (let index = 0; index < tracks.length; index += 1) {
    const path = `${currentUser.id}/${storyId}/track-${String(index + 1).padStart(2, "0")}.mp3`;
    const { error } = await supabaseClient.storage
      .from(AUDIO_BUCKET)
      .upload(path, dataUrlToBlob(tracks[index]), {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (error) throw error;
    uploadedPaths.push(path);
  }

  return uploadedPaths;
}

function getAiNarrationVoice(style) {
  return AI_VOICE_PROFILES[style]?.voice || AI_VOICE_PROFILES["female calm"].voice;
}

function getAiNarrationInstructions(story) {
  const profile = AI_VOICE_PROFILES[story.voiceStyle] || AI_VOICE_PROFILES["female calm"];
  const bedtimeDirection =
    story.storyType === "bedtime"
      ? "For bedtime stories, add gentle natural pauses at sentence endings and let the final line settle peacefully."
      : "For anytime stories, keep the same voice but use a little more brightness while staying calm and natural.";

  return [
    `Read this children's story as ${profile.label}.`,
    profile.direction,
    "Use natural UK/British accent and British English pronunciation throughout.",
    `Child age: ${getChildAgePrompt(story.childAge)}.`,
    bedtimeDirection,
    "Sound close, human, and reassuring, like a parent calmly reading beside the bed.",
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

function canUseCloudLibrary() {
  return Boolean(currentUser && supabaseClient);
}

function storyToCloudRow(story) {
  return {
    user_id: currentUser.id,
    title: story.title,
    child_name: story.childName,
    child_age: story.childAge || null,
    story_type: story.storyType,
    duration_minutes: Number(story.duration) || 5,
    moods: getSelectedMoods(story.moods),
    story_idea: story.storyIdea || null,
    paragraphs: story.text || [],
    word_count: story.wordCount || null,
    plan: story.plan || "free",
    voice_style: story.voiceStyle || null,
    audio_requested: Boolean(story.audioNarration),
    audio_paths: story.aiAudioPaths || [],
    audio_track_durations: story.aiAudioTrackDurations || [],
    audio_duration_seconds: getSavedAudioDurationSeconds(story) || null,
    audio_generated_at: story.aiAudioGeneratedAt || null,
    created_at: story.createdAt || new Date().toISOString(),
  };
}

function cloudRowToStory(row) {
  return {
    id: row.id,
    cloudId: row.id,
    plan: row.plan || "free",
    childName: row.child_name,
    childAge: row.child_age || "",
    duration: String(row.duration_minutes || 5),
    storyType: row.story_type || "bedtime",
    moods: row.moods || ["relaxing"],
    storyIdea: row.story_idea || "",
    title: row.title,
    text: Array.isArray(row.paragraphs) ? row.paragraphs : [],
    wordCount: row.word_count || 0,
    voiceStyle: row.voice_style || "female calm",
    audioNarration: Boolean(
      row.audio_requested || row.audio_generated_at || row.audio_duration_seconds || row.audio_paths?.length
    ),
    aiAudioTracks: [],
    aiAudioPaths: row.audio_paths || [],
    aiAudioTrackDurations: row.audio_track_durations || [],
    aiAudioDurationSeconds: row.audio_duration_seconds || 0,
    aiAudioGeneratedAt: row.audio_generated_at || "",
    createdAt: row.created_at,
    savedAt: row.updated_at || row.created_at,
  };
}

async function saveStoryToCloud(story) {
  if (!canUseCloudLibrary()) return false;

  const row = storyToCloudRow(story);
  let query = story.cloudId
    ? supabaseClient.from("stories").update(row).eq("id", story.cloudId || story.id).select().single()
    : supabaseClient.from("stories").insert(row).select().single();
  let { data, error } = await query;

  if (error && String(error.message || "").includes("word_count")) {
    const fallbackRow = { ...row };
    delete fallbackRow.word_count;
    query = story.cloudId
      ? supabaseClient.from("stories").update(fallbackRow).eq("id", story.cloudId || story.id).select().single()
      : supabaseClient.from("stories").insert(fallbackRow).select().single();
    ({ data, error } = await query);
  }

  if (error) throw error;

  const savedStory = cloudRowToStory(data);
  currentStory = {
    ...story,
    ...savedStory,
    audioNarration: Boolean(story.audioNarration || savedStory.audioNarration),
    aiAudioTracks: story.aiAudioTracks || [],
    aiAudioPaths: story.aiAudioPaths || savedStory.aiAudioPaths || [],
    aiAudioTrackDurations: story.aiAudioTrackDurations || [],
  };
  cloudStories = [currentStory, ...cloudStories.filter((savedStory) => savedStory.id !== currentStory.id)];
  cloudStoriesLoaded = true;
  return currentStory;
}

async function saveGeneratedStoryToLibrary(story) {
  const plan = getPlan(story.plan);

  if (!plan.canSave) {
    statusNote.textContent = "Free stories are not saved. Saved libraries are included with Premier and DreamScapes Plus.";
    return false;
  }

  if (!canUseCloudLibrary()) {
    const saved = saveStoryToLibrary(story, { silent: true });
    statusNote.textContent = saved
      ? "Story saved automatically to your library."
      : "This story could not be saved.";
    return saved;
  }

  try {
    currentStory = await saveStoryToCloud({
      ...story,
      id: story.id || createStoryId(),
      savedAt: new Date().toISOString(),
    });
    updateAccountUI();
    statusNote.textContent = "Story saved automatically to your cloud library.";
    return true;
  } catch (error) {
    statusNote.textContent = `Cloud save failed: ${error.message || "try again from the Save Story button."}`;
    return false;
  }
}

async function loadCloudStories() {
  if (!canUseCloudLibrary()) return [];

  const { data, error } = await supabaseClient
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_LIBRARY_RENDER_ITEMS);

  if (error) throw error;

  cloudStories = (data || []).map(cloudRowToStory);
  cloudStoriesLoaded = true;
  return cloudStories;
}

async function deleteCloudStory(story) {
  if (!canUseCloudLibrary() || !story?.cloudId) return false;

  const { error } = await supabaseClient.from("stories").delete().eq("id", story.cloudId);
  if (error) throw error;

  cloudStories = cloudStories.filter((savedStory) => savedStory.cloudId !== story.cloudId);
  updateAccountUI();
  return true;
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

  if (canUseCloudLibrary()) {
    saveStoryToCloud(storyToSave)
      .then((savedStory) => {
        currentStory = savedStory;
        updateAccountUI();
        if (!silent) statusNote.textContent = "Story saved to your cloud library.";
        if (screens.library.classList.contains("active")) renderLibrary();
        trackEvent("story_saved", {
          plan: story.plan,
          hasAudio: Boolean(storyToSave.aiAudioTracks?.length),
          source: "cloud",
        });
      })
      .catch(() => {
        if (!silent) statusNote.textContent = "Cloud save failed, so this story stayed on this device.";
      });
    return true;
  }

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
  utterance.rate = style.rate;
  utterance.pitch = style.pitch;
  utterance.volume = style.volume;
  utterance.lang = "en-GB";
  const preferredVoice = getPreferredDeviceVoice(story?.voiceStyle);
  if (preferredVoice) utterance.voice = preferredVoice;
}

function getPreferredDeviceVoice(style = "female calm") {
  if (!("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const gender = style.includes("male") ? "male" : "female";
  const hints = britishVoiceHints[gender];
  const britishVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith("en-gb"));
  const hintedVoice = britishVoices.find((voice) =>
    hints.some((hint) => voice.name.toLowerCase().includes(hint))
  );

  return hintedVoice || britishVoices[0] || voices.find((voice) => voice.lang?.toLowerCase().startsWith("en")) || null;
}

document.querySelector("#start-button").addEventListener("click", () => showScreen("builder"));
document.querySelector("#welcome-back-button").addEventListener("click", () => showScreen("welcome"));
document.querySelectorAll("[data-screen-target]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.screenTarget));
});

audioToggle.addEventListener("change", () => {
  if (audioToggle.checked) {
    requestPlusForAudio().catch(() => {
      audioToggle.checked = false;
      planNote.textContent = "Audio narration is included with DreamScapes Plus.";
    });
  }
});

durationInputs.forEach((input) => {
  input.addEventListener("change", () => {
    const plan = getPlan(getCurrentPlanKey());
    const duration = Number(input.value);

    if (duration <= plan.maxDuration) return;

    keepDurationWithinPlan(plan);
    planNote.textContent = `${plan.label} includes stories up to ${plan.maxDuration} minutes. Premier and Plus subscriptions are coming soon in the app stores.`;
  });
});

authForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#sign-in-button")?.click();
});

document.querySelector("#sign-in-button")?.addEventListener("click", async () => {
  if (!supabaseClient) {
    setAuthStatus("Account login is not ready yet. Try refreshing the page.", true);
    return;
  }

  const { email, password } = getAuthCredentials();
  const validationMessage = validateAuthCredentials(email, password, "sign-in");

  if (validationMessage) {
    setAuthStatus(validationMessage, true);
    return;
  }

  setAuthStatus("Signing in...");
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setAuthStatus(error.message, true);
    return;
  }

  setAuthStatus("Signed in.");
  trackEvent("account_signed_in");
});

document.querySelector("#sign-up-button")?.addEventListener("click", async () => {
  if (!supabaseClient) {
    setAuthStatus("Account signup is not ready yet. Try refreshing the page.", true);
    return;
  }

  const { email, password } = getAuthCredentials();
  const validationMessage = validateAuthCredentials(email, password, "sign-up");

  if (validationMessage) {
    setAuthStatus(validationMessage, true);
    return;
  }

  setAuthStatus("Creating account...");
  const { error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    setAuthStatus(error.message, true);
    return;
  }

  setAuthStatus("Account created. Check your email to confirm your DreamScapes account.");
  trackEvent("account_signed_up");
});

document.querySelector("#forgot-password-button")?.addEventListener("click", async () => {
  if (!supabaseClient) {
    setAuthStatus("Password reset is not ready yet. Try refreshing the page.", true);
    return;
  }

  const email = authEmail.value.trim();

  if (!email) {
    setAuthStatus("Enter your email first, then press Forgot Password.", true);
    return;
  }

  setAuthStatus("Sending password reset email...");
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname}`,
  });

  if (error) {
    setAuthStatus(error.message, true);
    return;
  }

  setAuthStatus("Password reset email sent. Check your inbox.");
  trackEvent("password_reset_requested");
});

document.querySelector("#update-password-button")?.addEventListener("click", async () => {
  if (!supabaseClient) {
    setAuthStatus("Password reset is not ready yet. Try refreshing the page.", true);
    return;
  }

  const password = newPassword.value;

  if (password.length < 6) {
    setAuthStatus("Use a new password with at least 6 characters.", true);
    return;
  }

  setAuthStatus("Updating password...");
  const { error } = await supabaseClient.auth.updateUser({ password });

  if (error) {
    setAuthStatus(error.message, true);
    return;
  }

  newPassword.value = "";
  passwordRecoveryActive = false;
  if (passwordResetCard) passwordResetCard.hidden = true;
  setAuthStatus("Password updated. You are signed in.");
  updateAccountUI();
  window.history.replaceState({}, document.title, window.location.pathname);
  trackEvent("password_reset_completed");
});

document.querySelector("#sign-out-button")?.addEventListener("click", async () => {
  if (!supabaseClient) return;

  setAuthStatus("Signing out...");
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    setAuthStatus(error.message, true);
    return;
  }

  setAuthStatus("Signed out.");
  trackEvent("account_signed_out");
});

document.querySelectorAll("[data-idea]").forEach((button) => {
  button.addEventListener("click", () => {
    storyIdea.value = button.dataset.idea;
    trackEvent("idea_example_selected", { label: button.textContent.trim() });
  });
});

async function playAiVoicePreview() {
  const selectedVoiceStyle = voiceStyle.value;
  const previewFile = VOICE_PREVIEW_FILES[selectedVoiceStyle];
  if (previewFile) {
    const previewAudio = new Audio(previewFile);
    await previewAudio.play();
    return "fixed-file";
  }

  const response = await fetch(NARRATION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: VOICE_PREVIEW_TEXT,
      voice: getAiNarrationVoice(selectedVoiceStyle),
      instructions: getAiNarrationInstructions({
        childAge: "5",
        moods: ["relaxing"],
        storyType: "bedtime",
        voiceStyle: selectedVoiceStyle,
      }),
    }),
  });

  if (!response.ok) return false;

  const data = await response.json();
  if (!Array.isArray(data.audio) || !data.audio[0]) return false;

  const previewAudio = new Audio(data.audio[0]);
  await previewAudio.play();
  return "new-ai";
}

function playDeviceVoicePreview() {
  if (!("speechSynthesis" in window)) {
    return false;
  }

  window.speechSynthesis.cancel();
  const preview = new SpeechSynthesisUtterance(VOICE_PREVIEW_TEXT);
  applyNarrationSettings(preview, {
    voiceStyle: voiceStyle.value,
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
      planNote.textContent =
        usedAiPreview === "fixed-file"
          ? "Playing fixed premium AI voice preview."
          : "Playing premium AI voice preview.";
      trackEvent("voice_preview", { voiceStyle: voiceStyle.value, source: usedAiPreview });
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

document.querySelectorAll("[data-plan-preview]").forEach((button) => {
  button.addEventListener("click", () => {
    const planKey = button.dataset.planPreview;
    const plan = getPlan(planKey);
    upgradeNote.textContent =
      planKey === "free"
        ? "Free is the active starter plan."
        : `${plan.label} subscriptions will be available through the App Store and Google Play.`;
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    planNote.textContent = "Sign in or create a free DreamScapes account before creating stories.";
    showScreen("account");
    return;
  }

  if (audioToggle.checked && getCurrentPlanKey() !== "plus") {
    try {
      await requestPlusForAudio();
    } catch {
      return;
    }
  }

  const selectedPlanKey = getCurrentPlanKey();
  const selectedPlan = getPlan(selectedPlanKey);
  const selectedDuration = Number(getValue("durationChoice"));
  if (canUseCloudLibrary()) {
    try {
      await loadCloudUsage();
    } catch {
      planNote.textContent = "Could not check your monthly cloud usage. Try again.";
      return;
    }
  }
  const usedStories = getStoriesUsed(selectedPlanKey);
  const audioSecondsUsed = getAudioSecondsUsed();

  if (usedStories >= selectedPlan.monthlyStories) {
    planNote.textContent = `${selectedPlan.label} has reached its ${selectedPlan.monthlyStories} story monthly limit. Choose another package to continue.`;
    return;
  }

  if (audioToggle.checked && selectedPlan.audioMinutes > 0 && audioSecondsUsed >= selectedPlan.audioMinutes * 60) {
    planNote.textContent = `${selectedPlan.label} has reached its ${selectedPlan.audioMinutes} audio minute monthly limit.`;
    return;
  }

  if (selectedDuration > selectedPlan.maxDuration) {
    planNote.textContent = `${selectedPlan.label} includes stories up to ${selectedPlan.maxDuration} minutes. App Store and Google Play subscriptions are coming soon for longer stories.`;
    showScreen("upgrade");
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
  };

  window.setTimeout(async () => {
    try {
      currentStory = {
        ...(await createStory(storyData)),
        id: createStoryId(),
        aiAudioTracks: [],
        aiAudioPaths: [],
        aiAudioGeneratedAt: "",
      };
      if (!canUseCloudLibrary()) incrementStoriesUsed(selectedPlanKey);
      renderStory(currentStory);
      await saveGeneratedStoryToLibrary(currentStory);
      trackEvent("story_generated", {
        plan: selectedPlanKey,
        duration: storyData.duration,
        audio: storyData.audioNarration,
        wordCount: currentStory.wordCount || 0,
        targetWords: currentStory.durationTarget?.words || 0,
      });
      showScreen("result");
    } catch (error) {
      showScreen("builder");
      planNote.textContent = error.message || "Could not create that story. Try again.";
    }
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

async function renderLibrary() {
  if (canUseCloudLibrary() && !cloudStoriesLoaded) {
    libraryList.innerHTML = `
      <article class="library-item">
        <h3>Loading your cloud library...</h3>
        <p>DreamScapes is checking your saved stories.</p>
      </article>
    `;

    try {
      await loadCloudStories();
    } catch {
      libraryList.innerHTML = `
        <article class="library-item">
          <h3>Cloud library could not load</h3>
          <p>Check the Supabase table setup, then try again.</p>
        </article>
      `;
      return;
    }
  }

  const usingCloudLibrary = canUseCloudLibrary();
  const savedStories = usingCloudLibrary ? cloudStories : getSavedStories();
  const visibleStories = savedStories.slice(0, MAX_LIBRARY_RENDER_ITEMS);

  if (savedStories.length === 0) {
    libraryList.innerHTML = `
      <article class="library-item">
        <h3>No saved stories yet</h3>
        <p>${usingCloudLibrary ? "Stories you create while signed in will save to your cloud library." : "Premier and DreamScapes Plus stories can be saved here."}</p>
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
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.deleteIndex);

      if (usingCloudLibrary) {
        try {
          await deleteCloudStory(savedStories[index]);
        } catch {
          libraryList.insertAdjacentHTML(
            "afterbegin",
            '<p class="status-note account-status error">Could not delete that cloud story. Try again.</p>'
          );
          return;
        }
      } else {
        const nextStories = getSavedStories();
        nextStories.splice(index, 1);
        setSavedStories(nextStories);
      }

      trackEvent("story_deleted", { index, source: usingCloudLibrary ? "cloud" : "local" });
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

function setAudioProgressVisible(visible) {
  audioProgressWrap.hidden = !visible;
}

function setAudioProgress(percent) {
  const safePercent = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  audioProgress.value = String(Math.round(safePercent));
  audioProgressLabel.textContent = getAudioProgressLabel(safePercent);
}

function getAudioProgressLabel(percent) {
  const totalSeconds = getSavedAudioDurationSeconds(currentStory);
  if (!totalSeconds || !currentAudioTracks.length) return `${Math.round(percent)}%`;

  const elapsedSeconds = getAiAudioElapsedSeconds(percent);
  return `${formatAudioTime(elapsedSeconds)} / ${formatAudioTime(totalSeconds)}`;
}

function resetAudioProgress() {
  pendingAudioSeekPercent = null;
  setAudioProgress(0);
}

function finishAudioProgress() {
  pendingAudioSeekPercent = null;
  setAudioProgress(100);
}

function getAiAudioProgress() {
  if (!currentAudioTracks.length) return 0;
  const totalSeconds = getSavedAudioDurationSeconds(currentStory);
  if (totalSeconds && currentAudioTrackDurations.length === currentAudioTracks.length) {
    return (getAiAudioElapsedSeconds() / totalSeconds) * 100;
  }

  const trackProgress =
    currentAudio && Number.isFinite(currentAudio.duration) && currentAudio.duration > 0
      ? currentAudio.currentTime / currentAudio.duration
      : 0;
  return ((currentAudioIndex + trackProgress) / currentAudioTracks.length) * 100;
}

function getAiAudioElapsedSeconds(percent = null) {
  const totalSeconds = getSavedAudioDurationSeconds(currentStory);
  if (Number.isFinite(percent) && totalSeconds) {
    return (Math.max(0, Math.min(100, percent)) / 100) * totalSeconds;
  }

  if (!currentAudioTracks.length || currentAudioTrackDurations.length !== currentAudioTracks.length) {
    return 0;
  }

  const completedTrackSeconds = currentAudioTrackDurations
    .slice(0, currentAudioIndex)
    .reduce((total, duration) => total + (Number.isFinite(duration) ? duration : 0), 0);
  const completedPauseSeconds = Math.min(currentAudioIndex, currentAudioTracks.length - 1) * getAudioPauseSeconds();
  const currentTrackSeconds =
    currentAudio && Number.isFinite(currentAudio.currentTime) ? currentAudio.currentTime : 0;

  return completedTrackSeconds + completedPauseSeconds + currentTrackSeconds;
}

function updateAiAudioProgress() {
  setAudioProgress(getAiAudioProgress());
}

function updateDeviceAudioProgress() {
  if (!currentNarrationSegments.length) return;
  setAudioProgress((currentNarrationIndex / currentNarrationSegments.length) * 100);
}

function seekAiAudio(percent) {
  if (!currentAudioTracks.length) return false;

  window.clearTimeout(currentNarrationTimer);
  currentNarrationTimer = null;
  aiAudioPausedBetweenTracks = false;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
  }

  const totalSeconds = getSavedAudioDurationSeconds(currentStory);
  if (totalSeconds && currentAudioTrackDurations.length === currentAudioTracks.length) {
    let remainingSeconds = (Math.max(0, Math.min(100, percent)) / 100) * totalSeconds;
    currentAudioIndex = 0;

    for (let index = 0; index < currentAudioTrackDurations.length; index += 1) {
      const trackSeconds = currentAudioTrackDurations[index] || 0;
      if (remainingSeconds <= trackSeconds || index === currentAudioTrackDurations.length - 1) {
        currentAudioIndex = index;
        pendingAudioSeekPercent =
          trackSeconds > 0 ? (Math.max(0, remainingSeconds) / trackSeconds) * 100 : 0;
        break;
      }

      remainingSeconds -= trackSeconds + getAudioPauseSeconds();
    }
  } else {
    const target = (percent / 100) * currentAudioTracks.length;
    currentAudioIndex = Math.min(currentAudioTracks.length - 1, Math.floor(target));
    pendingAudioSeekPercent = Math.max(0, Math.min(100, (target - currentAudioIndex) * 100));
  }
  playAiAudioTrack();
  statusNote.textContent = "AI narration moved to a new part of the story.";
  return true;
}

function seekDeviceNarration(percent) {
  if (!currentNarrationSegments.length || !("speechSynthesis" in window)) return false;

  window.clearTimeout(currentNarrationTimer);
  currentNarrationTimer = null;
  window.speechSynthesis.cancel();
  currentNarrationIndex = Math.min(
    currentNarrationSegments.length - 1,
    Math.floor((percent / 100) * currentNarrationSegments.length)
  );
  narrationPausedBetweenSegments = false;
  speakNarrationSegment();
  statusNote.textContent = "Audio narration moved to a new part of the story.";
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
  currentAudioTrackDurations = [];
  aiAudioPausedBetweenTracks = false;
  resetAudioProgress();
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
    finishAudioProgress();
    statusNote.textContent = "Audio narration finished.";
    return;
  }

  updateDeviceAudioProgress();
  currentNarration = new SpeechSynthesisUtterance(currentNarrationSegments[currentNarrationIndex]);
  applyNarrationSettings(currentNarration);
  currentNarration.onend = () => {
    currentNarrationIndex += 1;
    updateDeviceAudioProgress();
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
    finishAudioProgress();
    statusNote.textContent = "AI narration finished.";
    return;
  }

  currentAudio = new Audio(currentAudioTracks[currentAudioIndex]);
  currentAudio.ontimeupdate = updateAiAudioProgress;
  currentAudio.onloadedmetadata = () => {
    if (Number.isFinite(currentAudio.duration) && currentAudio.duration > 0) {
      currentAudioTrackDurations[currentAudioIndex] = currentAudio.duration;
    }
    if (pendingAudioSeekPercent !== null && Number.isFinite(currentAudio.duration)) {
      currentAudio.currentTime = (pendingAudioSeekPercent / 100) * currentAudio.duration;
      pendingAudioSeekPercent = null;
    }
    updateAiAudioProgress();
  };
  currentAudio.onended = () => {
    currentAudioIndex += 1;
    updateAiAudioProgress();
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
    currentAudioTrackDurations = Array.isArray(currentStory.aiAudioTrackDurations)
      ? currentStory.aiAudioTrackDurations
      : [];
    currentAudioIndex = 0;
    playAiAudioTrack();
    statusNote.textContent = "Playing saved premium AI narration.";
    narrationNote.textContent = getSavedAudioDurationSeconds(currentStory)
      ? `Using saved audio: ${formatAudioTime(getSavedAudioDurationSeconds(currentStory))}`
      : "Using saved audio, no new AI request";
    trackEvent("cached_ai_audio_played", { voiceStyle: currentStory.voiceStyle });
    return true;
  }

  if (Array.isArray(currentStory.aiAudioPaths) && currentStory.aiAudioPaths.length > 0) {
    try {
      currentAudioTracks = await getSignedAudioUrls(currentStory.aiAudioPaths);
      currentAudioTrackDurations = Array.isArray(currentStory.aiAudioTrackDurations)
        ? currentStory.aiAudioTrackDurations
        : [];
      currentAudioIndex = 0;
      playAiAudioTrack();
      statusNote.textContent = "Playing saved cloud AI narration.";
      narrationNote.textContent = getSavedAudioDurationSeconds(currentStory)
        ? `Using cloud audio: ${formatAudioTime(getSavedAudioDurationSeconds(currentStory))}`
        : "Using saved cloud audio";
      trackEvent("cloud_ai_audio_played", { voiceStyle: currentStory.voiceStyle });
      return true;
    } catch {
      statusNote.textContent = "Cloud audio could not load. Creating audio again.";
    }
  }

  try {
    statusNote.textContent = "Creating audio. This can take a moment...";
    narrationNote.textContent = "Creating audio";
    const response = await fetch(NARRATION_ENDPOINT, {
      method: "POST",
      headers: await getApiHeaders(),
      body: JSON.stringify({
        title: currentStory.title,
        text: storyAsText(currentStory),
        duration: currentStory.duration,
        voice: getAiNarrationVoice(currentStory.voiceStyle),
        instructions: getAiNarrationInstructions(currentStory),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      statusNote.textContent = error.detail || error.error || "Audio could not be created.";
      narrationNote.textContent = "Audio not created";
      return response.status === 401 || response.status === 403 || response.status === 429 ? "blocked" : false;
    }

    const data = await response.json();
    if (!Array.isArray(data.audio) || data.audio.length === 0) return false;
    if (data.usage) {
      currentUsage = data.usage;
      updateAccountUI();
      updatePlanFeatures();
    }

    currentAudioTracks = data.audio;
    currentAudioTrackDurations = await measureAudioTrackDurations(data.audio);
    const aiAudioDurationSeconds = getPlaybackDurationSeconds(currentAudioTrackDurations, currentStory);
    let aiAudioPaths = currentStory.aiAudioPaths || [];
    if (canUseCloudLibrary()) {
      try {
        aiAudioPaths = await uploadAudioTracksToCloud(currentStory, data.audio);
      } catch {
        aiAudioPaths = [];
      }
    }
    currentAudioIndex = 0;
    currentStory = {
      ...currentStory,
      aiAudioTracks: aiAudioPaths.length ? [] : data.audio,
      aiAudioPaths,
      aiAudioTrackDurations: currentAudioTrackDurations,
      aiAudioDurationSeconds,
      aiAudioGeneratedAt: new Date().toISOString(),
    };
    saveStoryToLibrary(currentStory, { silent: true });
    playAiAudioTrack();
    statusNote.textContent = "Audio complete. Playing now.";
    narrationNote.textContent = aiAudioDurationSeconds
      ? `Audio complete and saved: ${formatAudioTime(aiAudioDurationSeconds)}`
      : "Audio complete and saved";
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
  statusNote.textContent = "Creating audio. This can take a moment...";
  narrationNote.textContent = "Creating audio";
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

audioProgress.addEventListener("input", () => {
  audioProgressLabel.textContent = getAudioProgressLabel(Number(audioProgress.value));
});

audioProgress.addEventListener("change", () => {
  if (!canUseNarration()) return;

  const percent = Number(audioProgress.value);
  if (seekAiAudio(percent) || seekDeviceNarration(percent)) {
    trackEvent("audio_seek", { percent });
    return;
  }

  statusNote.textContent = "Start the narration before moving through the story.";
  resetAudioProgress();
});

updatePlanFeatures();
updateAccountUI();
initSupabase();
