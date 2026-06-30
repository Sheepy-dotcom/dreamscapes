const screens = {
  welcome: document.querySelector("#welcome-screen"),
  builder: document.querySelector("#builder-screen"),
  loading: document.querySelector("#loading-screen"),
  result: document.querySelector("#result-screen"),
  library: document.querySelector("#library-screen"),
  upgrade: document.querySelector("#upgrade-screen"),
  account: document.querySelector("#account-screen"),
  signup: document.querySelector("#signup-screen"),
  admin: document.querySelector("#admin-screen"),
  legal: document.querySelector("#legal-screen"),
};

const form = document.querySelector("#story-form");
const statusNote = document.querySelector("#status-note");
const planNote = document.querySelector("#plan-note");
const loadingMessage = document.querySelector("#loading-message");
const currentPlanName = document.querySelector("#current-plan-name");
const currentPlanSummary = document.querySelector("#current-plan-summary");
const upgradeNote = document.querySelector("#upgrade-note");
const planAuthNotice = document.querySelector("#plan-auth-notice");
const planAuthTitle = document.querySelector("#plan-auth-title");
const planAuthCopy = document.querySelector("#plan-auth-copy");
const planAuthCreateButton = document.querySelector("#plan-auth-create-button");
const planAuthSigninButton = document.querySelector("#plan-auth-signin-button");
const audioToggle = document.querySelector("#audio-narration");
const audioPlayButton = document.querySelector("#audio-play-button");
const audioPauseButton = document.querySelector("#audio-pause-button");
const narrationNote = document.querySelector("#narration-note");
const audioProgressWrap = document.querySelector("#audio-progress-wrap");
const audioProgress = document.querySelector("#audio-progress");
const audioProgressLabel = document.querySelector("#audio-progress-label");
const reportAudioButton = document.querySelector("#report-audio-button");
const sleepTimerNote = document.querySelector("#sleep-timer-note");
const voiceStyle = document.querySelector("#voice-style");
const voicePreviewButton = document.querySelector("#voice-preview-button");
const storyIdea = document.querySelector("#story-idea");
const libraryStatus = document.querySelector("#library-status");
const libraryList = document.querySelector("#library-list");
const libraryFilterButtons = Array.from(document.querySelectorAll("[data-library-filter]"));
const librarySort = document.querySelector("#library-sort");
const durationInputs = Array.from(document.querySelectorAll('input[name="durationChoice"]'));
const authForm = document.querySelector("#auth-form");
const authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const authStatus = document.querySelector("#auth-status");
const signupForm = document.querySelector("#signup-form");
const signupEmail = document.querySelector("#signup-email");
const signupPassword = document.querySelector("#signup-password");
const signupPasswordConfirm = document.querySelector("#signup-password-confirm");
const signupStatus = document.querySelector("#signup-status");
const authSignedOut = document.querySelector("#auth-signed-out");
const authSignedIn = document.querySelector("#auth-signed-in");
const passwordResetCard = document.querySelector("#password-reset-card");
const redeemCard = document.querySelector("#redeem-card");
const redeemForm = document.querySelector("#redeem-form");
const redeemCodeInput = document.querySelector("#redeem-code");
const redeemStatus = document.querySelector("#redeem-status");
const newPassword = document.querySelector("#new-password");
const accountEmail = document.querySelector("#account-email");
const accountCloudStatus = document.querySelector("#account-cloud-status");
const accountPlan = document.querySelector("#account-plan");
const accountStories = document.querySelector("#account-stories");
const accountSavedStories = document.querySelector("#account-saved-stories");
const accountAudio = document.querySelector("#account-audio");
const accountAudioCredits = document.querySelector("#account-audio-credits");
const openAdminButton = document.querySelector("#open-admin-button");
const adminStatus = document.querySelector("#admin-status");
const adminSummary = document.querySelector("#admin-summary");
const adminDashboard = document.querySelector("#admin-dashboard");
const refreshAdminButton = document.querySelector("#refresh-admin-button");
const adminCreditForm = document.querySelector("#admin-credit-form");
const adminCreditEmail = document.querySelector("#admin-credit-email");
const adminCreditAmount = document.querySelector("#admin-credit-amount");
const adminCreditStatus = document.querySelector("#admin-credit-status");
const childProfilesCard = document.querySelector("#child-profiles-card");
const childProfileForm = document.querySelector("#child-profile-form");
const childProfileList = document.querySelector("#child-profile-list");
const childProfileId = document.querySelector("#child-profile-id");
const toggleProfileFormButton = document.querySelector("#toggle-profile-form");
const builderChildProfiles = document.querySelector("#builder-child-profiles");
const builderProfileList = document.querySelector("#builder-profile-list");
const clearProfileSelectionButton = document.querySelector("#clear-profile-selection");
const feedbackCard = document.querySelector("#feedback-card");
const feedbackForm = document.querySelector("#feedback-form");
const feedbackCategory = document.querySelector("#feedback-category");
const feedbackMessage = document.querySelector("#feedback-message");
const feedbackStatus = document.querySelector("#feedback-status");
let currentStory = null;
let currentUser = null;
let supabaseClient = null;
let cloudStories = [];
let cloudStoriesLoaded = false;
let childProfiles = [];
let childProfilesLoaded = false;
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
let sleepTimerId = null;
let sleepTimerCountdownId = null;
let sleepTimerEndsAt = null;
let loadingMessageTimer = null;
let revenueCatConfiguredForUser = "";
let libraryNotice = "";
let highlightedStoryId = "";
let currentLibraryFilter = "all";
const PRODUCTION_API_BASE = "https://www.dreamscapes.cloud";
function resolveApiEndpoint(value, fallbackPath) {
  const endpoint = value || fallbackPath;
  if (/^https?:\/\//i.test(endpoint)) return endpoint;

  const platform = getCapacitorPlatform();
  const protocol = window.location.protocol;
  const isBundledApp = ["ios", "android"].includes(platform) || protocol === "capacitor:";
  const apiBase = window.DREAMSCAPES_API_BASE || (isBundledApp ? PRODUCTION_API_BASE : "");

  return apiBase ? `${apiBase}${endpoint}` : endpoint;
}

const AI_ENDPOINT = resolveApiEndpoint(window.DREAMSCAPES_AI_ENDPOINT, "/api/story");
const NARRATION_ENDPOINT = resolveApiEndpoint(window.DREAMSCAPES_NARRATION_ENDPOINT, "/api/narrate");
const AUDIO_USAGE_ENDPOINT = resolveApiEndpoint(window.DREAMSCAPES_AUDIO_USAGE_ENDPOINT, "/api/audio-usage");
const REDEEM_CODE_ENDPOINT = resolveApiEndpoint(window.DREAMSCAPES_REDEEM_CODE_ENDPOINT, "/api/redeem-code");
const ADMIN_ENDPOINT = resolveApiEndpoint(window.DREAMSCAPES_ADMIN_ENDPOINT, "/api/admin");
const REVENUECAT_API_KEYS = {
  ios: window.DREAMSCAPES_REVENUECAT_IOS_KEY || "",
  android: window.DREAMSCAPES_REVENUECAT_ANDROID_KEY || "",
};
const REVENUECAT_PRODUCT_IDS = {
  premier: "dreamscapes_premier_monthly",
  plus: "dreamscapes_plus_monthly",
};
const REVENUECAT_ENTITLEMENTS = {
  premier: ["dreamscapes_premier", "premier"],
  plus: ["dreamscapes_plus", "plus"],
};
const SUPABASE_URL = "https://khgzzrixhetaontmdhez.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZ3p6cml4aGV0YW9udG1kaGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTkwMjMsImV4cCI6MjA5NTU3NTAyM30.Zij8eBhzxNecuPRsMliWChxYmogLBFbd1GScpKPM_5g";
const SUPABASE_SCRIPT_URLS = [
  "./assets/supabase.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "https://unpkg.com/@supabase/supabase-js@2",
];
const AUDIO_BUCKET = "story-audio";
const AI_NARRATION_REQUEST_MAX_LENGTH = 3400;
const AUDIO_CREDIT_MAX_MINUTES = 10;
const VOICE_PREVIEW_TEXT = "Hello from DreamScapes. Settle in, take a gentle breath, and let the story begin.";
const VOICE_PREVIEW_CACHE_VERSION = "2026061529";
const VOICE_PREVIEW_GAIN = 0.82;
const VOICE_PREVIEW_GAINS = {
  "female sage calm": 3.4,
};
const VOICE_PREVIEW_FILES = {
  "female calm": "./assets/voice-preview-female-british-calm.mp3",
  "female sage calm": "./assets/voice-preview-female-sage-calm-v3.mp3",
  "male calm": "./assets/voice-preview-male-british-calm.mp3",
  "ash storyteller": "./assets/voice-preview-ash-storyteller.mp3",
};
const AI_VOICE_PROFILES = {
  "female calm": {
    voice: "nova",
    label: "a British English female storyteller",
    direction:
      "Use the same consistent voice every time: a warm British female storyteller, natural, expressive, clear, and reassuring. Keep a steady storybook pace with gentle emotion and a friendly bedtime feel. Do not sound robotic, theatrical, American, sales-like, or like an announcer. Do not drag words.",
  },
  "female sage calm": {
    voice: "sage",
    label: "a calm British English woman reading softly at bedtime",
    direction:
      "Use the same consistent voice every time: a very calm British bedtime storyteller with a soft, close, reassuring tone. Sound gentle, cosy, natural, warm, and quietly expressive, like a parent reading slowly beside the bed. Keep the pace unhurried with light pauses at commas and longer pauses at full stops. Do not sound robotic, theatrical, American, bright, sales-like, or like an announcer. Do not overact character voices, drag words, or change voice style between paragraphs.",
  },
  "male calm": {
    voice: "fable",
    label: "a British English male storyteller",
    direction:
      "Use the same consistent voice every time: a warm British male storyteller, steady, natural, clear, and reassuring. Keep a gentle storybook pace with enough character to feel engaging without overacting. Do not sound robotic, theatrical, American, sales-like, or like an announcer. Do not drag words.",
  },
  "ash storyteller": {
    voice: "ash",
    label: "a calm British English male storyteller",
    direction:
      "Use the same consistent voice every time: a calm British male storyteller, clear, gentle, expressive, and reassuring. Keep a natural bedtime story pace with soft warmth and calm character. Do not sound robotic, theatrical, American, sales-like, or like an announcer. Do not drag words or change voice style between paragraphs.",
  },
};
const MAX_LOCAL_SAVED_STORIES = 30;
const MAX_LIBRARY_RENDER_ITEMS = 30;
const STORY_FAVOURITES_KEY = "dreamscapesStoryFavourites";
const ADMIN_EMAILS = ["shaunrussett@gmail.com"];
const ADMIN_LAST_SEEN_KEY = "dreamscapesAdminLastSeenAt";

const plans = {
  free: {
    label: "Free",
    price: "£0",
    summary: "£0, 3 stories/month, up to 10 min",
    monthlyStories: 3,
    maxDuration: 10,
    canSave: true,
    canUseAudio: false,
    savedLimit: 3,
    audioMinutes: 0,
    note: "Free package: 3 stories this month, 3 saved stories, no audio narration.",
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

const planRanks = {
  free: 0,
  premier: 1,
  plus: 2,
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
  "female sage calm": { rate: 0.64, pitch: 1, volume: 0.86, pause: 1150 },
  "female default": { rate: 0.64, pitch: 1, volume: 0.86, pause: 1150 },
  "female cheerful": { rate: 0.64, pitch: 1, volume: 0.86, pause: 1150 },
  "male calm": { rate: 0.64, pitch: 0.88, volume: 0.86, pause: 1150 },
  "ash storyteller": { rate: 0.64, pitch: 0.94, volume: 0.86, pause: 1150 },
  "male default": { rate: 0.64, pitch: 0.88, volume: 0.86, pause: 1150 },
  "male cheerful": { rate: 0.64, pitch: 0.88, volume: 0.86, pause: 1150 },
};

function getPreviewAudioSource(source) {
  if (!source || source.startsWith("data:")) return source;
  return source.includes("?") ? `${source}&v=${VOICE_PREVIEW_CACHE_VERSION}` : `${source}?v=${VOICE_PREVIEW_CACHE_VERSION}`;
}

async function playPreviewAudio(source, gain = VOICE_PREVIEW_GAIN) {
  const previewSource = getPreviewAudioSource(source);
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("AudioContext unavailable");

    const audioContext = new AudioContextClass();
    const response = await fetch(previewSource);
    if (!response.ok) throw new Error("Preview audio could not load");

    const audioBuffer = await audioContext.decodeAudioData(await response.arrayBuffer());
    const bufferSource = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    gainNode.gain.value = gain;
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(gainNode);
    gainNode.connect(audioContext.destination);
    bufferSource.start(0);
    return "web-audio";
  } catch {
    const previewAudio = new Audio(previewSource);
    previewAudio.volume = Math.min(Math.max(gain, 0), 1);
    await previewAudio.play();
    return "html-audio";
  }
}

const britishVoiceHints = {
  female: ["serena", "susan", "kate", "karen", "moira", "tessa", "samantha"],
  male: ["daniel", "arthur", "oliver", "george", "tom"],
};

const loadingMessages = [
  "Opening the storybook under the stars",
  "Choosing kind characters and cosy details",
  "Building the adventure scene by scene",
  "Sprinkling in gentle surprises",
  "Checking the story feels close to your chosen time",
  "Saving the story safely to your library",
  "Tucking in a warm, happy ending",
];

function startLoadingMessages() {
  if (!loadingMessage) return;
  let index = 0;
  loadingMessage.textContent = loadingMessages[index];
  window.clearInterval(loadingMessageTimer);
  loadingMessageTimer = window.setInterval(() => {
    index = (index + 1) % loadingMessages.length;
    loadingMessage.textContent = loadingMessages[index];
  }, 2200);
}

function stopLoadingMessages() {
  window.clearInterval(loadingMessageTimer);
  loadingMessageTimer = null;
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
  document.body.classList.toggle("home-active", name === "welcome");
  document.querySelectorAll("[data-screen-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.screenTarget === name);
  });
  if (name === "library") {
    renderLibrary().catch(() => {
      libraryList.innerHTML = `
        <article class="library-item">
          <h3>Library needs a refresh</h3>
          <p>DreamScapes could not load your saved stories just now. Try opening the library again.</p>
        </article>
      `;
    });
  }
  if (name === "account") refreshAccountSummary();
  if (name === "admin") loadAdminDashboard();
  if (name === "loading") startLoadingMessages();
  else stopLoadingMessages();
  trackEvent("screen_view", { screen: name });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setAuthStatus(message, isError = false) {
  if (!authStatus) return;
  authStatus.textContent = message;
  authStatus.classList.toggle("error", Boolean(isError));
}

function setSignupStatus(message, isError = false) {
  if (!signupStatus) return;
  signupStatus.textContent = message;
  signupStatus.classList.toggle("error", Boolean(isError));
}

function getAuthCredentials() {
  return {
    email: authEmail?.value.trim() || "",
    password: authPassword?.value || "",
  };
}

function getSignupCredentials() {
  return {
    email: signupEmail?.value.trim() || "",
    password: signupPassword?.value || "",
    passwordConfirm: signupPasswordConfirm?.value || "",
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

function validateSignupCredentials(email, password, passwordConfirm) {
  const validationMessage = validateAuthCredentials(email, password, "sign-up");
  if (validationMessage) return validationMessage;
  if (!passwordConfirm) return "Confirm your password.";
  if (password !== passwordConfirm) return "Passwords do not match.";
  return "";
}

function getStoryTargetSeconds(story) {
  return Math.max(0, Number(story?.duration || story?.duration_minutes || 0) * 60);
}

function getEstimatedTextDurationSeconds(story) {
  const wordCount = Number(story?.wordCount || story?.word_count || 0);
  return wordCount > 0 ? (wordCount / 125) * 60 : 0;
}

function getStoryActualDurationSeconds(story) {
  return getSavedAudioDurationSeconds(story) || getEstimatedTextDurationSeconds(story);
}

function isPasswordRecoveryUrl() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);

  return hash.get("type") === "recovery" || query.get("type") === "recovery";
}

function updateAccountUI() {
  const signedIn = Boolean(currentUser);
  const stories = signedIn ? cloudStories : [];
  const plan = getPlan(getCurrentPlanKey());
  const storiesUsed = signedIn ? getStoriesUsed(getCurrentPlanKey()) : 0;
  const audioUsed = signedIn ? getAudioSecondsUsed() : 0;
  const audioUsedLabel = formatPlanMinutesFromSeconds(audioUsed);
  const audioLimit = plan.audioMinutes > 0 ? `${plan.audioMinutes} min` : "Plus only";

  if (authSignedOut) authSignedOut.hidden = signedIn;
  if (authSignedIn) authSignedIn.hidden = !signedIn;
  if (authSignedIn) {
    authSignedIn.classList.toggle("plan-free", plan.key === "free");
    authSignedIn.classList.toggle("plan-premier", plan.key === "premier");
    authSignedIn.classList.toggle("plan-plus", plan.key === "plus");
  }
  if (redeemCard) redeemCard.hidden = !signedIn;
  if (feedbackCard) feedbackCard.hidden = !signedIn;
  if (childProfilesCard) childProfilesCard.hidden = !signedIn;
  if (passwordResetCard && !passwordRecoveryActive) {
    passwordResetCard.hidden = true;
  }
  if (accountEmail) accountEmail.textContent = currentUser?.email || "";
  if (accountPlan) accountPlan.textContent = plan.label;
  if (accountStories) accountStories.textContent = `${storiesUsed}/${plan.monthlyStories}`;
  if (accountSavedStories) accountSavedStories.textContent = `${stories.length}/${plan.savedLimit}`;
  if (accountAudio) accountAudio.textContent = `${audioUsedLabel} / ${audioLimit}`;
  if (accountAudioCredits) accountAudioCredits.textContent = String(signedIn ? getAudioStoryCredits() : 0);
  if (openAdminButton) openAdminButton.hidden = !isCurrentUserAdmin();
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
    loadLocalChildProfiles();
    updateAccountUI();
    return;
  }

  try {
    await loadProfile();
    await loadCloudUsage();
    await loadCloudStories();
    await loadChildProfiles();
  } catch {
    setAuthStatus("Could not refresh account totals yet.", true);
  }

  updateAccountUI();
}

function setCurrentUser(user) {
  currentUser = user || null;
  if (!currentUser) revenueCatConfiguredForUser = "";
  if (!currentUser) {
    childProfiles = [];
    childProfilesLoaded = false;
  }
  loadLocalChildProfiles();
  updateAccountUI();
}

function getChildProfileStorageKey() {
  return `dreamscapesChildProfiles:${currentUser?.id || "local"}`;
}

function cleanProfileValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normaliseChildProfile(profile = {}) {
  const id = profile.id || profile.localId || createStoryId();
  return {
    id,
    localId: profile.localId || id,
    childName: cleanProfileValue(profile.childName || profile.child_name),
    childAge: cleanProfileValue(profile.childAge || profile.child_age),
    eyeColour: cleanProfileValue(profile.eyeColour || profile.eye_colour),
    hairColour: cleanProfileValue(profile.hairColour || profile.hair_colour),
    parentNames: cleanProfileValue(profile.parentNames || profile.parent_names),
    interests: cleanProfileValue(profile.interests),
    friends: cleanProfileValue(profile.friends),
    avoidTopics: cleanProfileValue(profile.avoidTopics || profile.avoid_topics),
    otherDetails: cleanProfileValue(profile.otherDetails || profile.other_details),
    createdAt: profile.createdAt || profile.created_at || new Date().toISOString(),
    updatedAt: profile.updatedAt || profile.updated_at || new Date().toISOString(),
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function loadLocalChildProfiles() {
  try {
    const profiles = JSON.parse(localStorage.getItem(getChildProfileStorageKey()) || "[]");
    childProfiles = Array.isArray(profiles) ? profiles.map(normaliseChildProfile) : [];
  } catch {
    childProfiles = [];
  }
  renderChildProfiles();
  renderBuilderProfileChoices();
  return childProfiles;
}

function saveLocalChildProfiles(profiles = childProfiles) {
  localStorage.setItem(getChildProfileStorageKey(), JSON.stringify(profiles.map(normaliseChildProfile)));
}

function profileToCloudRow(profile) {
  return {
    user_id: currentUser.id,
    child_name: profile.childName,
    child_age: profile.childAge || null,
    eye_colour: profile.eyeColour || null,
    hair_colour: profile.hairColour || null,
    parent_names: profile.parentNames || null,
    interests: profile.interests || null,
    friends: profile.friends || null,
    avoid_topics: profile.avoidTopics || null,
    other_details: profile.otherDetails || null,
  };
}

async function loadChildProfiles() {
  if (!canUseCloudLibrary()) return loadLocalChildProfiles();

  try {
    const { data, error } = await supabaseClient
      .from("child_profiles")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    childProfiles = (data || []).map(normaliseChildProfile);
    childProfilesLoaded = true;
    saveLocalChildProfiles(childProfiles);
  } catch {
    childProfilesLoaded = false;
    loadLocalChildProfiles();
  }

  renderChildProfiles();
  renderBuilderProfileChoices();
  return childProfiles;
}

async function saveChildProfile(profile) {
  const savedAt = new Date().toISOString();
  const profileToSave = normaliseChildProfile({ ...profile, updatedAt: savedAt });

  if (canUseCloudLibrary()) {
    try {
      const isCloudProfile =
        isUuid(profileToSave.id) && childProfiles.some((savedProfile) => savedProfile.id === profileToSave.id);
      const query = isCloudProfile
        ? supabaseClient
            .from("child_profiles")
            .update(profileToCloudRow(profileToSave))
            .eq("id", profileToSave.id)
            .select()
            .single()
        : supabaseClient
            .from("child_profiles")
            .insert(profileToCloudRow(profileToSave))
            .select()
            .single();
      const { data, error } = await query;
      if (error) throw error;
      const cloudProfile = normaliseChildProfile(data);
      childProfiles = [cloudProfile, ...childProfiles.filter((savedProfile) => savedProfile.id !== cloudProfile.id)];
      childProfilesLoaded = true;
      saveLocalChildProfiles(childProfiles);
      renderChildProfiles();
      renderBuilderProfileChoices();
      return cloudProfile;
    } catch {
      setAuthStatus("Profile saved on this device. Cloud profile sync needs the child_profiles table.", true);
    }
  }

  childProfiles = [profileToSave, ...childProfiles.filter((savedProfile) => savedProfile.id !== profileToSave.id)];
  saveLocalChildProfiles(childProfiles);
  renderChildProfiles();
  renderBuilderProfileChoices();
  return profileToSave;
}

async function deleteChildProfile(profileId) {
  const profile = childProfiles.find((savedProfile) => savedProfile.id === profileId);

  if (canUseCloudLibrary() && profile) {
    await supabaseClient.from("child_profiles").delete().eq("id", profile.id).throwOnError();
  }

  childProfiles = childProfiles.filter((savedProfile) => savedProfile.id !== profileId);
  saveLocalChildProfiles(childProfiles);
  renderChildProfiles();
  renderBuilderProfileChoices();
}

function getProfileSummary(profile) {
  return [
    profile.childAge ? `Age ${profile.childAge}` : "",
    profile.eyeColour ? `${profile.eyeColour} eyes` : "",
    profile.hairColour ? profile.hairColour : "",
    profile.interests ? `Likes ${profile.interests}` : "",
    profile.friends ? `Friends: ${profile.friends}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function renderChildProfiles() {
  if (!childProfileList) return;

  if (!currentUser) {
    childProfileList.innerHTML = "";
    return;
  }

  if (childProfiles.length === 0) {
    childProfileList.innerHTML = '<p class="helper-text">No child profiles yet. Add one above when you are ready.</p>';
    return;
  }

  childProfileList.innerHTML = childProfiles
    .map(
      (profile) => `
        <article class="child-profile-item">
          <div>
            <h4>${escapeHtml(profile.childName || "Child profile")}</h4>
            <p>${escapeHtml(getProfileSummary(profile) || "Optional story details saved.")}</p>
          </div>
          <div class="profile-actions">
            <button class="button secondary-button compact-button" data-edit-profile="${escapeHtml(profile.id)}" type="button">Edit</button>
            <button class="button secondary-button compact-button delete-button" data-delete-profile="${escapeHtml(profile.id)}" type="button">Delete</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderBuilderProfileChoices() {
  if (!builderChildProfiles || !builderProfileList) return;

  builderChildProfiles.hidden = childProfiles.length === 0;
  builderProfileList.innerHTML = childProfiles
    .map(
      (profile) => `
        <label>
          <input type="checkbox" name="childProfiles" value="${escapeHtml(profile.id)}" />
          <span>
            <strong>${escapeHtml(profile.childName || "Child profile")}</strong>
            <small>${escapeHtml(getProfileSummary(profile) || "Use saved details")}</small>
          </span>
        </label>
      `
    )
    .join("");
}

function setChildProfileFormOpen(open) {
  if (!childProfileForm) return;
  childProfileForm.hidden = !open;
  if (toggleProfileFormButton) {
    toggleProfileFormButton.textContent = open ? "Close" : "Add Profile";
    toggleProfileFormButton.setAttribute("aria-expanded", String(open));
  }
}

function clearChildProfileForm() {
  childProfileForm?.reset();
  if (childProfileId) childProfileId.value = "";
}

function fillChildProfileForm(profile) {
  if (!childProfileForm || !profile) return;
  childProfileId.value = profile.id;
  childProfileForm.elements.profileChildName.value = profile.childName || "";
  childProfileForm.elements.profileChildAge.value = profile.childAge || "";
  childProfileForm.elements.profileEyeColour.value = profile.eyeColour || "";
  childProfileForm.elements.profileHairColour.value = profile.hairColour || "";
  childProfileForm.elements.profileParentNames.value = profile.parentNames || "";
  childProfileForm.elements.profileInterests.value = profile.interests || "";
  childProfileForm.elements.profileFriends.value = profile.friends || "";
  childProfileForm.elements.profileAvoidTopics.value = profile.avoidTopics || "";
  childProfileForm.elements.profileOtherDetails.value = profile.otherDetails || "";
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

function isExpiredSessionMessage(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("session_not_found") || text.includes("session has expired");
}

async function handleExpiredSession(message = "Your sign-in session has expired. Please sign in again.") {
  if (!isExpiredSessionMessage(message)) return false;

  try {
    await supabaseClient?.auth?.signOut();
  } catch {
    // Local cleanup still happens below.
  }

  setCurrentUser(null);
  currentProfile = null;
  currentUsage = null;
  cloudStories = [];
  cloudStoriesLoaded = false;
  updatePlanFeatures();
  setAuthStatus("Your sign-in session expired. Please sign in again.", true);
  showScreen("account");
  return true;
}

async function readApiError(response, fallback) {
  const error = await response.json().catch(() => ({}));
  const message = error.detail || error.error || error.msg || fallback;
  if (await handleExpiredSession(message)) {
    return "Your sign-in session expired. Please sign in again.";
  }
  return getFriendlyFaultMessage(message, fallback);
}

function getFriendlyFaultMessage(errorOrMessage, fallback = "Something went wrong. Please try again.") {
  const rawMessage = String(errorOrMessage?.message || errorOrMessage || "").trim();
  const lowerMessage = rawMessage.toLowerCase();

  if (!rawMessage) return fallback;
  if (isExpiredSessionMessage(rawMessage) || /jwt|session_not_found|session from session_id/i.test(rawMessage)) {
    return "Your sign-in session expired. Please sign in again.";
  }
  if (/failed to fetch|networkerror|load failed|could not connect/i.test(rawMessage)) {
    return "DreamScapes could not connect. Check your connection and try again.";
  }
  if (/not valid|invalid|expired|already used|redeem/i.test(lowerMessage) && !/[{}]|stack|code:/i.test(rawMessage)) {
    return rawMessage;
  }
  if (/[{}]|\"stack\"|error_code|trace|jwt|code:\s*\d+|underlying|at\s+\w+/i.test(rawMessage)) {
    return fallback;
  }

  return rawMessage.length > 140 ? fallback : rawMessage;
}

function getCapacitorPlatform() {
  return window.Capacitor?.getPlatform?.() || window.Capacitor?.platform || "web";
}

function isNativeMobileApp() {
  return ["ios", "android"].includes(getCapacitorPlatform());
}

function getRevenueCatPlugin() {
  return window.Capacitor?.Plugins?.Purchases || null;
}

function getRevenueCatApiKey() {
  return REVENUECAT_API_KEYS[getCapacitorPlatform()] || "";
}

function getRevenueCatErrorMessage(error, fallback = "Purchase could not be started. Please try again.") {
  const candidates = [
    error?.message,
    error?.underlyingErrorMessage,
    error?.readableErrorCode,
    error?.userInfo?.underlyingErrorMessage,
    error?.userInfo?.readableErrorCode,
    error?.userInfo?.message,
    error?.details?.underlyingErrorMessage,
    error?.error?.underlyingErrorMessage,
    error?.error?.message,
  ];
  const message = candidates
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" ");

  if (/configuration|offering|product|billing|store/i.test(message)) {
    return "Purchases are not available just now. Please try again later or contact support.";
  }

  return getFriendlyFaultMessage(message, fallback);
}

function getPlanFromCustomerInfo(customerInfo) {
  const active = customerInfo?.entitlements?.active || {};
  if (REVENUECAT_ENTITLEMENTS.plus.some((id) => active[id])) return "plus";
  if (REVENUECAT_ENTITLEMENTS.premier.some((id) => active[id])) return "premier";
  return "free";
}

async function configureRevenueCat() {
  if (!currentUser) throw new Error("Sign in before choosing a paid package.");
  if (!isNativeMobileApp()) {
    throw new Error("Subscriptions will be available inside the iOS and Android app.");
  }

  const Purchases = getRevenueCatPlugin();
  const apiKey = getRevenueCatApiKey();

  if (!Purchases || !apiKey) {
    throw new Error("RevenueCat is not configured for this app build yet.");
  }

  if (!revenueCatConfiguredForUser) {
    await Purchases.configure({
      apiKey,
      appUserID: currentUser.id,
    });
    revenueCatConfiguredForUser = currentUser.id;
  } else if (revenueCatConfiguredForUser !== currentUser.id) {
    await Purchases.logIn({ appUserID: currentUser.id });
    revenueCatConfiguredForUser = currentUser.id;
  }

  if (currentUser.email && Purchases.setEmail) {
    try {
      await Promise.resolve(Purchases.setEmail({ email: currentUser.email }));
    } catch {
      // Email attribution is helpful for RevenueCat, but purchases can continue without it.
    }
  }

  return Purchases;
}

function findRevenueCatPackage(offerings, planKey) {
  const productId = REVENUECAT_PRODUCT_IDS[planKey];
  const packages = offerings?.current?.availablePackages || [];
  const matchesProductId = (value) => String(value || "").split(":")[0] === productId;

  return packages.find(
    (availablePackage) =>
      matchesProductId(availablePackage?.product?.identifier) ||
      matchesProductId(availablePackage?.identifier) ||
      matchesProductId(availablePackage?.offeringIdentifier)
  );
}

async function refreshProfileAfterPurchase() {
  upgradeNote.textContent = "Purchase complete. Updating your DreamScapes plan...";
  await new Promise((resolve) => window.setTimeout(resolve, 2500));
  await refreshAccountSummary();
  updatePlanFeatures();
}

async function purchasePlan(planKey) {
  const plan = getPlan(planKey);
  const currentPlanKey = getCurrentPlanKey();
  if (planKey === currentPlanKey) {
    upgradeNote.textContent = `${plan.label} is already active.`;
    return;
  }
  if ((planRanks[planKey] || 0) < (planRanks[currentPlanKey] || 0)) {
    upgradeNote.textContent = `${plan.label} is already included with your current subscription.`;
    return;
  }

  upgradeNote.textContent = `Opening ${plan.label} checkout...`;

  const Purchases = await configureRevenueCat();
  const offerings = await Purchases.getOfferings();
  const packageToBuy = findRevenueCatPackage(offerings, planKey);

  if (!packageToBuy) {
    throw new Error(`${plan.label} is not available in RevenueCat offerings yet.`);
  }

  const result = await Purchases.purchasePackage({ aPackage: packageToBuy });
  const purchasedPlan = getPlanFromCustomerInfo(result.customerInfo);

  if (purchasedPlan === "free") {
    throw new Error("Purchase finished, but no DreamScapes entitlement was returned yet.");
  }

  await refreshProfileAfterPurchase();
  currentProfile = {
    ...(currentProfile || {}),
    plan: purchasedPlan,
  };
  updatePlanFeatures();
  updateAccountUI();
  upgradeNote.textContent = `${getPlan(purchasedPlan).label} is active.`;
  trackEvent("revenuecat_purchase_completed", { plan: purchasedPlan });
}

async function restorePurchases() {
  upgradeNote.textContent = "Restoring purchases...";
  const Purchases = await configureRevenueCat();
  const result = await Purchases.restorePurchases();
  const restoredPlan = getPlanFromCustomerInfo(result.customerInfo);
  await refreshProfileAfterPurchase();
  if (restoredPlan !== "free") {
    currentProfile = {
      ...(currentProfile || {}),
      plan: restoredPlan,
    };
    updatePlanFeatures();
    updateAccountUI();
  }
  upgradeNote.textContent =
    restoredPlan === "free"
      ? "No active DreamScapes subscription was found."
      : `${getPlan(restoredPlan).label} restored.`;
  trackEvent("revenuecat_restore_completed", { plan: restoredPlan });
}

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

let supabaseInitPromise = null;

async function ensureSupabaseScript() {
  if (globalThis.supabase?.createClient) return true;

  for (const src of SUPABASE_SCRIPT_URLS) {
    try {
      await loadExternalScript(src);
      if (globalThis.supabase?.createClient) return true;
    } catch {
      // Try the next script source.
    }
  }

  return false;
}

async function ensureSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (supabaseInitPromise) return supabaseInitPromise;

  supabaseInitPromise = initSupabase().finally(() => {
    supabaseInitPromise = null;
  });

  return supabaseInitPromise;
}

async function initSupabase() {
  const scriptReady = await ensureSupabaseScript();
  const supabaseBrowser = globalThis.supabase;

  if (!scriptReady || !supabaseBrowser?.createClient) {
    setAuthStatus("Account login could not load. Check your connection and refresh DreamScapes.", true);
    updateAccountUI();
    return null;
  }

  supabaseClient = supabaseBrowser.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

  return supabaseClient;
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

function getSelectedChildProfiles() {
  const selectedIds = getValues("childProfiles");
  return childProfiles.filter((profile) => selectedIds.includes(profile.id));
}

function joinProfileValues(profiles, key) {
  return profiles
    .map((profile) => profile[key])
    .filter(Boolean)
    .join(", ");
}

function describeChildProfiles(profiles) {
  return profiles.map((profile) => {
    const details = [
      profile.childAge ? `age ${profile.childAge}` : "",
      profile.eyeColour ? `${profile.eyeColour} eyes` : "",
      profile.hairColour ? `${profile.hairColour} hair` : "",
      profile.parentNames ? `parent names: ${profile.parentNames}` : "",
      profile.interests ? `interests: ${profile.interests}` : "",
      profile.friends ? `friends: ${profile.friends}` : "",
      profile.avoidTopics ? `avoid: ${profile.avoidTopics}` : "",
      profile.otherDetails ? `other details: ${profile.otherDetails}` : "",
    ].filter(Boolean);
    return `${profile.childName}${details.length ? ` (${details.join("; ")})` : ""}`;
  });
}

function buildProfileAwareStoryData(selectedPlan, selectedPlanKey) {
  const selectedProfiles = getSelectedChildProfiles();
  const profileNames = joinProfileValues(selectedProfiles, "childName");
  const manualName = getValue("childName");
  const childName = manualName || profileNames;
  const childAge = getValue("childAge") || (selectedProfiles.length === 1 ? selectedProfiles[0].childAge : "");
  const interests = [getValue("interests"), joinProfileValues(selectedProfiles, "interests")]
    .filter(Boolean)
    .join(", ");
  const friends = joinProfileValues(selectedProfiles, "friends");
  const avoidTopics = [getValue("avoidTopics"), joinProfileValues(selectedProfiles, "avoidTopics")]
    .filter(Boolean)
    .join(", ");

  return {
    plan: selectedPlanKey,
    childName,
    childAge,
    interests,
    friends,
    duration: getValue("durationChoice"),
    storyType: getValue("storyType"),
    moods: getValues("moods"),
    storyIdea: getValue("storyIdea"),
    avoidTopics,
    preferredLesson: getValue("preferredLesson"),
    calmMode: new FormData(form).has("calmMode"),
    audioNarration: canUseAudioNarration() && audioToggle.checked,
    voiceStyle: getValue("voiceStyle"),
    childProfiles: selectedProfiles.map((profile) => ({
      childName: profile.childName,
      childAge: profile.childAge,
      eyeColour: profile.eyeColour,
      hairColour: profile.hairColour,
      parentNames: profile.parentNames,
      interests: profile.interests,
      friends: profile.friends,
      avoidTopics: profile.avoidTopics,
      otherDetails: profile.otherDetails,
    })),
    childProfileSummary: describeChildProfiles(selectedProfiles),
  };
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

function getAudioStoryCredits() {
  return canUseCloudLibrary() && currentProfile ? Number(currentProfile.audio_story_credits || 0) : 0;
}

function canUseAudioCreditForDuration(duration = getValue("durationChoice")) {
  return getAudioStoryCredits() > 0 && Number(duration || 0) <= AUDIO_CREDIT_MAX_MINUTES;
}

function canUseAudioNarration(duration = getValue("durationChoice")) {
  return getPlan(getCurrentPlanKey()).canUseAudio || canUseAudioCreditForDuration(duration);
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
  const audioAllowed = canUseAudioNarration();

  if (currentUser) hidePlanAuthNotice();
  if (currentPlanName) currentPlanName.textContent = plan.label;
  if (currentPlanSummary) currentPlanSummary.textContent = plan.summary;
  if (planNote) planNote.textContent = "";
  audioToggle.closest(".feature-toggle").classList.toggle("locked", !audioAllowed);
  updateDurationLocks(plan);
  keepDurationWithinPlan(plan);
  syncDurationChoiceHighlight();
  updatePlanActionButtons(planKey);
}

function updatePlanActionButtons(planKey = getCurrentPlanKey()) {
  const currentRank = planRanks[planKey] || 0;

  document.querySelectorAll("[data-plan-preview]").forEach((button) => {
    button.textContent = planKey === "free" ? "Current" : "Included";
    button.disabled = planKey === "free";
  });

  document.querySelectorAll("[data-purchase-plan]").forEach((button) => {
    const targetPlan = button.dataset.purchasePlan;
    const targetRank = planRanks[targetPlan] || 0;
    const targetLabel = targetPlan === "plus" ? "Plus" : "Premier";

    if (targetPlan === planKey) {
      button.textContent = "Active";
      button.disabled = true;
      return;
    }

    if (targetRank < currentRank) {
      button.textContent = "Included";
      button.disabled = true;
      return;
    }

    button.textContent = targetLabel;
    button.disabled = false;
  });
}

function hidePlanAuthNotice() {
  if (planAuthNotice) planAuthNotice.hidden = true;
}

function showPlanAuthNotice(planKey) {
  const plan = getPlan(planKey);
  if (upgradeNote) upgradeNote.textContent = "";
  if (planAuthTitle) planAuthTitle.textContent = "Create a free account first";
  if (planAuthCopy) {
    planAuthCopy.textContent = `${plan.label} needs a DreamScapes account so your package, stories, and audio stay linked to you.`;
  }
  if (planAuthNotice) planAuthNotice.hidden = false;
  trackEvent("plan_account_required", { plan: planKey });
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
  if (canUseAudioNarration()) return;

  audioToggle.checked = false;
  const selectedDuration = Number(getValue("durationChoice"));
  planNote.textContent =
    getAudioStoryCredits() > 0 && selectedDuration > AUDIO_CREDIT_MAX_MINUTES
      ? `Redeemed audio credits can be used on stories up to ${AUDIO_CREDIT_MAX_MINUTES} minutes. Choose a shorter story or upgrade to DreamScapes Plus.`
      : "Audio narration is included with DreamScapes Plus, or with a redeemed audio credit.";
  throw new Error("DreamScapes Plus or an audio credit is required for audio.");
}

function escapeHtml(value) {
  return String(value || "")
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
  return sentences.map(addNarrationWordBreathing).join("\n\n\n");
}

function addNarrationWordBreathing(text) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const phraseLength = 4;
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
  const profileLine = Array.isArray(data.childProfileSummary) && data.childProfileSummary.length
    ? `The DreamScape remembered the little details that made this story feel personal: ${data.childProfileSummary.join(" ")}`
    : "";
  const calmLine = data.calmMode
    ? "Every exciting moment softened before bedtime, like a bright lantern turned low."
    : "";

  const paragraphs = [
    `${opener}, ${data.childName}${getChildAgePhrase(data.childAge)} heard a tiny whisper from a place where stories are born. ${typeLine} The whisper carried one special idea: ${idea}`,
    `${data.childName} stepped carefully into the DreamScape, where clouds curled like cushions and stars blinked hello. Everything felt ${mood.tone}. ${duration.pacing}`,
    `Soon, ${data.childName} met a small problem that needed a gentle heart. Instead of rushing, ${data.childName} listened, noticed who needed help, and chose the kindest next step. Bit by bit, the story became warmer.`,
  ];

  [profileLine, interestLine, safetyLine, lessonLine, calmLine].filter(Boolean).forEach((line) => {
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
  const profileSummary = Array.isArray(data.childProfileSummary) && data.childProfileSummary.length
    ? data.childProfileSummary.join(" | ")
    : "not selected";
  return [
    "Write a safe, child-friendly personalised children's story.",
    `Child name: ${data.childName}`,
    `Child age: ${getChildAgePrompt(data.childAge)}`,
    `Selected child profile details: ${profileSummary}`,
    "Use profile details naturally where helpful, but do not list physical details awkwardly or make appearance the focus.",
    "If multiple profiles are selected, include both children as important characters and give each a kind moment.",
    `Package: ${plan.label}`,
    `Interests: ${data.interests || "not specified"}`,
    `Friends: ${data.friends || "not specified"}`,
    `Avoid topics: ${data.avoidTopics || "none specified"}`,
    `Preferred lesson: ${data.preferredLesson || "use a gentle relevant lesson"}`,
    `Bedtime calm mode: ${data.calmMode ? "yes" : "no"}`,
    `Target reading time: ${getDuration(data.duration).label}`,
    `Premium tier: ${getDuration(data.duration).premium ? "yes, over 10 minutes" : "no"}`,
    `Audio narration requested: ${data.audioNarration ? "yes" : "no"}`,
    `Story type: ${data.storyType === "bedtime" ? "bedtime story" : "anytime story"}`,
    `Moods: ${getSelectedMoods(data.moods).join(", ")}`,
    `Story idea: ${tidyIdea(data.storyIdea, data.childName)}`,
    "Make it feel like a real children's story, not a template or summary.",
    "Use warm imaginative language, clear scenes, character moments, a positive ending, and a gentle lesson where appropriate.",
    "Write in British English throughout, using UK spelling and natural British wording such as mum, favourite, cosy, colour, and realised.",
    "Use short, gentle sentences with frequent natural pauses between phrases, especially for bedtime narration.",
    "Longer stories must include more complete scenes, not just longer sentences.",
    "Do not announce or explain that the story is written in British English.",
    "Do not end with farewell phrases such as ta-ta, ta ta for now, bye, or goodbye.",
    "Do not mention AI, prompts, packages, subscriptions, or app settings.",
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
      throw new Error(await readApiError(response, "Story endpoint unavailable"));
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
      cloudId: aiStory.cloudId || "",
      savedAt: aiStory.savedAt || "",
      saveError: aiStory.saveError || "",
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    if (String(error.message || "").toLowerCase().includes("failed to fetch")) {
      throw new Error("DreamScapes could not connect to the story service. Check your connection and try again.");
    }

    throw new Error(getFriendlyFaultMessage(error, "Story could not be created. Please try again."));
  }
}

function renderStory(story) {
  const selectedMoods = getSelectedMoods(story.moods);
  const plan = getPlan(story.plan);
  const savedAudioDuration = getSavedAudioDurationSeconds(story);
  const actualLengthSeconds = getStoryActualDurationSeconds(story);
  document.querySelector("#story-title").textContent = story.title;
  document.querySelector("#story-meta").innerHTML = `
    <span>${plan.label}</span>
    ${actualLengthSeconds ? `<span>Story length ${formatAudioTime(actualLengthSeconds)}</span>` : ""}
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
    ? savedAudioDuration || story.aiAudioTracks?.length || story.aiAudioPaths?.length
      ? savedAudioDuration
        ? `Saved audio ready: ${formatAudioTime(savedAudioDuration)}`
        : "Saved audio ready"
      : "Audio not created yet. First play creates and saves narration."
    : "Turn on audio before generating a story";
  audioPlayButton.title =
    story.audioNarration && !savedAudioDuration && !story.aiAudioTracks?.length && !story.aiAudioPaths?.length
      ? "Create narration"
      : "Play narration";
  audioPlayButton.setAttribute("aria-label", audioPlayButton.title);
  if (reportAudioButton) reportAudioButton.hidden = !story.audioNarration;
  resetAudioProgress();
  setAudioProgressVisible(Boolean(story.audioNarration));
}

function storyAsText(story) {
  return `${story.title}\n\n\n${story.text.map(addNarrationSentenceBreaks).join("\n\n\n\n")}`;
}

function splitAiNarrationRequestText(text) {
  const cleanText = cleanNarrationText(text);
  if (cleanText.length <= AI_NARRATION_REQUEST_MAX_LENGTH) return [cleanText];

  const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
  const chunks = [];
  let chunk = "";

  sentences.forEach((sentence) => {
    const nextChunk = `${chunk} ${sentence}`.trim();
    if (nextChunk.length > AI_NARRATION_REQUEST_MAX_LENGTH && chunk) {
      chunks.push(chunk);
      chunk = sentence.trim();
      return;
    }

    chunk = nextChunk;
  });

  if (chunk) chunks.push(chunk);
  return chunks;
}

async function requestAiNarrationPart({ text, duration, voice, instructions }) {
  const response = await fetch(NARRATION_ENDPOINT, {
    method: "POST",
    headers: await getApiHeaders(),
    body: JSON.stringify({
      text,
      duration,
      voice,
      instructions,
      chargeAudio: false,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Audio could not be created."));
  }

  const data = await response.json();
  if (!Array.isArray(data.audio) || data.audio.length === 0) {
    throw new Error("Audio could not be created. No narration was returned.");
  }

  return data;
}

async function updateAudioUsage(action, audioSeconds, options = {}) {
  const requestedAudioSeconds = Number(options.requestedAudioSeconds || audioSeconds || 0);
  const response = await fetch(AUDIO_USAGE_ENDPOINT, {
    method: "POST",
    headers: await getApiHeaders(),
    body: JSON.stringify({
      action,
      audioSeconds,
      requestedAudioSeconds,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Audio usage could not be updated."));
  }

  const data = await response.json();
  if (data.usage) {
    currentUsage = data.usage;
  }
  if (data.profile) {
    currentProfile = data.profile;
  }
  updateAccountUI();
  updatePlanFeatures();

  return data;
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

function formatPlanMinutesFromSeconds(totalSeconds) {
  const minutes = Math.ceil(Math.max(0, Number(totalSeconds) || 0) / 60);
  return `${minutes} min`;
}

function formatAdminDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function getAdminPlanLabel(plan) {
  return getPlan(plan).label || sentenceCase(String(plan || "free"));
}

function isCurrentUserAdmin() {
  return ADMIN_EMAILS.includes(String(currentUser?.email || "").trim().toLowerCase());
}

function setAdminStatus(message, isError = false) {
  if (!adminStatus) return;
  adminStatus.textContent = message;
  adminStatus.classList.toggle("error", Boolean(isError));
}

function adminEmpty(label) {
  return `<p class="admin-empty">${escapeHtml(label)}</p>`;
}

function renderAdminList(items, emptyText, renderer) {
  if (!Array.isArray(items) || items.length === 0) return adminEmpty(emptyText);
  return `<div class="admin-list">${items.map(renderer).join("")}</div>`;
}

function getAdminLastSeenTime() {
  try {
    const storedTime = new Date(localStorage.getItem(ADMIN_LAST_SEEN_KEY) || "").getTime();
    if (Number.isFinite(storedTime)) return storedTime;
  } catch {
    // Fall back to recent activity below.
  }

  return Date.now() - 7 * 24 * 60 * 60 * 1000;
}

function setAdminLastSeenTime(value = new Date().toISOString()) {
  try {
    localStorage.setItem(ADMIN_LAST_SEEN_KEY, value);
  } catch {
    // Local storage can be unavailable in private browsing.
  }
}

function countNewAdminItems(items, sinceTime) {
  if (!Array.isArray(items)) return 0;

  return items.filter((item) => {
    const createdTime = new Date(item?.created_at || "").getTime();
    return Number.isFinite(createdTime) && createdTime > sinceTime;
  }).length;
}

function renderAdminBadge(count) {
  return count > 0 ? `<span class="admin-badge">${count} new</span>` : "";
}

function renderAdminSection(title, content, footnote = "", options = {}) {
  const badge = renderAdminBadge(options.newCount || 0);

  if (options.collapsible) {
    return `
      <details class="admin-panel admin-details" ${options.open ? "open" : ""}>
        <summary>
          <span class="admin-section-title">
            <span>${escapeHtml(title)}</span>
            ${badge}
          </span>
        </summary>
        ${content}
        ${footnote ? `<p class="admin-footnote">${escapeHtml(footnote)}</p>` : ""}
      </details>
    `;
  }

  return `
    <article class="admin-panel">
      <h3 class="admin-section-title">
        <span>${escapeHtml(title)}</span>
        ${badge}
      </h3>
      ${content}
      ${footnote ? `<p class="admin-footnote">${escapeHtml(footnote)}</p>` : ""}
    </article>
  `;
}

function renderAdminDashboard(data) {
  if (!adminSummary || !adminDashboard) return;
  const summary = data.summary || {};
  const tables = data.tables || {};
  const planCounts = summary.plans || {};
  const adminLastSeenTime = getAdminLastSeenTime();
  const newCounts = {
    profiles: countNewAdminItems(tables.profiles, adminLastSeenTime),
    stories: countNewAdminItems(tables.stories, adminLastSeenTime),
    audioIssues: countNewAdminItems(tables.audioIssues, adminLastSeenTime),
    feedbackReports: countNewAdminItems(tables.feedbackReports, adminLastSeenTime),
    redemptions: countNewAdminItems(tables.redemptions, adminLastSeenTime),
    redeemCodes: countNewAdminItems(tables.redeemCodes, adminLastSeenTime),
  };

  adminSummary.innerHTML = [
    ["Users", summary.users || 0],
    ["Stories", summary.stories || 0],
    ["This month", summary.storiesThisMonth || 0],
    ["Audio used", formatAudioTime(summary.audioSecondsThisMonth || 0)],
    ["Audio issues", summary.openAudioIssues || 0],
    ["Feedback", summary.openFeedback || 0],
    ["Credits redeemed", summary.redeemedCredits || 0],
    ["Plus users", planCounts.plus || 0],
  ]
    .map(
      ([label, value]) => `
        <span>
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(value)}</strong>
        </span>
      `
    )
    .join("");

  const tableErrors = Array.isArray(data.tableErrors) ? data.tableErrors : [];
  const errorPanel = tableErrors.length
    ? renderAdminSection(
        "Setup notes",
        renderAdminList(tableErrors, "", (error) => `
          <div class="admin-row warning-row">
            <strong>${escapeHtml(error.label)}</strong>
            <span>${escapeHtml(error.message)}</span>
          </div>
        `)
      )
    : "";

  adminDashboard.innerHTML = [
    errorPanel,
    renderAdminSection(
      "Recent Users",
      renderAdminList(tables.profiles, "No users found.", (profile) => `
        <div class="admin-row">
          <strong>${escapeHtml(profile.email || profile.id)}</strong>
          <span>${escapeHtml(getAdminPlanLabel(profile.plan))} · Credits ${Number(profile.audio_story_credits || 0)} · ${escapeHtml(formatAdminDate(profile.created_at))}</span>
        </div>
      `),
      "",
      { collapsible: true, newCount: newCounts.profiles }
    ),
    renderAdminSection(
      "Recent Stories",
      renderAdminList(tables.stories, "No stories found.", (story) => `
        <div class="admin-row">
          <strong>${escapeHtml(story.title || "Untitled story")}</strong>
          <span>${escapeHtml(story.child_name || "Child")} · ${Number(story.duration_minutes || 0)} min · ${story.word_count ? `${Number(story.word_count)} words` : "Words not tracked"} · ${story.audio_requested ? "Audio requested" : "Text"} · ${escapeHtml(formatAdminDate(story.created_at))}</span>
        </div>
      `),
      "",
      { collapsible: true, newCount: newCounts.stories }
    ),
    renderAdminSection(
      "Audio Issues",
      renderAdminList(tables.audioIssues, "No audio issues reported.", (issue) => `
        <div class="admin-row">
          <strong>${escapeHtml(issue.story_title || "Audio issue")}</strong>
          <span>${escapeHtml(issue.status || "open")} · ${escapeHtml(issue.voice_style || "voice unknown")} · ${escapeHtml(issue.message || "")}</span>
        </div>
      `),
      "",
      { collapsible: true, newCount: newCounts.audioIssues }
    ),
    renderAdminSection(
      "Tester Feedback",
      renderAdminList(tables.feedbackReports, "No tester feedback yet.", (report) => `
        <div class="admin-row">
          <strong>${escapeHtml(report.category || "feedback")} · ${escapeHtml(report.user_email || report.user_id || "user")}</strong>
          <span>${escapeHtml(report.message || "")}</span>
        </div>
      `),
      "Run supabase-feedback-reports.sql if this section shows a setup note.",
      { collapsible: true, newCount: newCounts.feedbackReports }
    ),
    renderAdminSection(
      "Redeem Activity",
      renderAdminList(tables.redemptions, "No redemptions yet.", (redemption) => `
        <div class="admin-row">
          <strong>${escapeHtml(redemption.redeem_code || "Code")}</strong>
          <span>${escapeHtml(redemption.user_email || redemption.user_id || "user")} · Credits ${Number(redemption.audio_story_credits || 0)} · ${escapeHtml(formatAdminDate(redemption.created_at))}</span>
        </div>
      `),
      "",
      { collapsible: true, newCount: newCounts.redemptions }
    ),
    renderAdminSection(
      "Codes",
      renderAdminList(tables.redeemCodes, "No redeem codes found.", (code) => `
        <div class="admin-row">
          <strong>${escapeHtml(code.code || "Code")}</strong>
          <span>${code.active ? "Active" : "Paused"} · Credits ${Number(code.audio_story_credits || 0)} · Used ${Number(code.times_redeemed || 0)}${code.max_redemptions ? `/${Number(code.max_redemptions)}` : ""}</span>
        </div>
      `),
      "",
      { collapsible: true, newCount: newCounts.redeemCodes }
    ),
  ]
    .filter(Boolean)
    .join("");

  setAdminLastSeenTime(data.generatedAt || new Date().toISOString());
}

async function loadAdminDashboard() {
  if (!isCurrentUserAdmin()) {
    setAdminStatus("Admin access is only enabled for the DreamScapes owner account.", true);
    if (adminSummary) adminSummary.innerHTML = "";
    if (adminDashboard) adminDashboard.innerHTML = "";
    return;
  }

  setAdminStatus("Loading admin dashboard...");

  try {
    const response = await fetch(ADMIN_ENDPOINT, {
      method: "GET",
      headers: await getApiHeaders(),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Admin dashboard could not load."));
    }

    const data = await response.json();
    renderAdminDashboard(data);
    setAdminStatus(`Admin updated ${new Date(data.generatedAt || Date.now()).toLocaleTimeString()}.`);
    trackEvent("admin_dashboard_loaded");
  } catch (error) {
    setAdminStatus(error.message || "Admin dashboard could not load.", true);
  }
}

async function addAdminAudioCredits() {
  if (!isCurrentUserAdmin()) {
    if (adminCreditStatus) adminCreditStatus.textContent = "Admin access is not enabled for this account.";
    return false;
  }

  const email = adminCreditEmail?.value.trim() || "";
  const credits = Math.max(0, Math.floor(Number(adminCreditAmount?.value || 0)));

  if (!email) {
    if (adminCreditStatus) adminCreditStatus.textContent = "Enter the user's email address.";
    return false;
  }

  if (!credits) {
    if (adminCreditStatus) adminCreditStatus.textContent = "Enter at least 1 credit.";
    return false;
  }

  if (adminCreditStatus) adminCreditStatus.textContent = "Adding credits...";

  try {
    const response = await fetch(ADMIN_ENDPOINT, {
      method: "POST",
      headers: await getApiHeaders(),
      body: JSON.stringify({
        action: "addAudioCredits",
        email,
        credits,
      }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Credits could not be added."));
    }

    const data = await response.json();
    if (adminCreditStatus) adminCreditStatus.textContent = data.message || "Credits added.";
    if (adminCreditAmount) adminCreditAmount.value = "1";
    await loadAdminDashboard();
    trackEvent("admin_audio_credits_added", { credits });
    return true;
  } catch (error) {
    if (adminCreditStatus) adminCreditStatus.textContent = error.message || "Credits could not be added.";
    return false;
  }
}

function getAudioPauseSeconds(story = currentStory) {
  return getNarrationPause(story) / 1000;
}

function getAiAudioPauseSeconds() {
  return 0;
}

function getPlaybackDurationSeconds(trackDurations, story = currentStory) {
  if (!Array.isArray(trackDurations) || trackDurations.length === 0) return 0;

  const audioSeconds = trackDurations.reduce(
    (total, duration) => total + (Number.isFinite(duration) ? duration : 0),
    0
  );
  const pauseSeconds = Math.max(0, trackDurations.length - 1) * getAiAudioPauseSeconds(story);

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
    "Leave a little breathing space between phrases, and make each word feel clearly separated without sounding slow, broken, or robotic.",
    "Sound close, human, and reassuring, like a parent calmly reading beside the bed.",
    "Do not add extra words that are not in the story.",
    "Do not add farewell sign-offs such as ta-ta, ta ta for now, bye, or goodbye.",
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
    JSON.stringify(trimSavedStoriesForLimit(stories, MAX_LOCAL_SAVED_STORIES))
  );
}

function createStoryId() {
  if ("crypto" in window && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `story-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStoryIdentity(story) {
  return story?.cloudId || story?.id || "";
}

function storiesMatch(left, right) {
  const leftId = getStoryIdentity(left);
  const rightId = getStoryIdentity(right);
  return Boolean(leftId && rightId && leftId === rightId);
}

function getStoryFavouriteIds() {
  try {
    const favouriteIds = JSON.parse(localStorage.getItem(STORY_FAVOURITES_KEY) || "[]");
    return Array.isArray(favouriteIds) ? favouriteIds.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function setStoryFavouriteIds(favouriteIds) {
  localStorage.setItem(
    STORY_FAVOURITES_KEY,
    JSON.stringify([...new Set(favouriteIds.filter(Boolean))].slice(0, 200))
  );
}

function getStoryFavouriteKey(story) {
  return getStoryIdentity(story);
}

function isStoryFavourite(story) {
  const favouriteKey = getStoryFavouriteKey(story);
  return Boolean(
    story?.isFavourite ||
      story?.is_favourite ||
      story?.favourite ||
      (favouriteKey && getStoryFavouriteIds().includes(favouriteKey))
  );
}

function setStoryFavouriteFlag(story, isFavourite) {
  const favouriteKey = getStoryFavouriteKey(story);
  if (!favouriteKey) return;

  const favouriteIds = getStoryFavouriteIds().filter((savedKey) => savedKey !== favouriteKey);
  if (isFavourite) favouriteIds.unshift(favouriteKey);
  setStoryFavouriteIds(favouriteIds);
}

function trimSavedStoriesForLimit(stories, limit = MAX_LOCAL_SAVED_STORIES) {
  const parsedLimit = Number(limit);
  const safeLimit = Math.max(
    0,
    Math.min(Number.isFinite(parsedLimit) ? parsedLimit : MAX_LOCAL_SAVED_STORIES, MAX_LOCAL_SAVED_STORIES)
  );
  const normalisedStories = stories.map((story) => ({
    ...story,
    isFavourite: isStoryFavourite(story),
  }));

  if (normalisedStories.length <= safeLimit) return normalisedStories;

  const favouriteStories = normalisedStories.filter(isStoryFavourite);
  const otherStories = normalisedStories.filter((story) => !isStoryFavourite(story));
  return [...favouriteStories, ...otherStories].slice(0, safeLimit);
}

function isHighlightedStory(story) {
  return Boolean(
    highlightedStoryId && (story?.cloudId === highlightedStoryId || story?.id === highlightedStoryId)
  );
}

function storyHasSavedAudio(story) {
  return Boolean(getSavedAudioDurationSeconds(story) || story?.aiAudioTracks?.length || story?.aiAudioPaths?.length);
}

function getStoryTimeValue(story) {
  return new Date(story?.savedAt || story?.createdAt || 0).getTime() || 0;
}

function sortLibraryStories(stories, sortModeOverride = "") {
  const sortMode = sortModeOverride || librarySort?.value || "newest";
  return [...stories].sort((firstStory, secondStory) => {
    if (isHighlightedStory(firstStory) !== isHighlightedStory(secondStory)) {
      return Number(isHighlightedStory(secondStory)) - Number(isHighlightedStory(firstStory));
    }

    if (isStoryFavourite(firstStory) !== isStoryFavourite(secondStory)) {
      return Number(isStoryFavourite(secondStory)) - Number(isStoryFavourite(firstStory));
    }

    if (sortMode === "oldest") return getStoryTimeValue(firstStory) - getStoryTimeValue(secondStory);
    if (sortMode === "duration") return Number(secondStory.duration || 0) - Number(firstStory.duration || 0);
    return getStoryTimeValue(secondStory) - getStoryTimeValue(firstStory);
  });
}

function filterLibraryStories(stories) {
  if (currentLibraryFilter === "audio") return stories.filter(storyHasSavedAudio);
  if (currentLibraryFilter === "text") return stories.filter((story) => !storyHasSavedAudio(story));
  if (currentLibraryFilter === "favourites") return stories.filter(isStoryFavourite);
  return stories;
}

function upsertCloudStory(story) {
  const storyId = getStoryIdentity(story);
  if (!storyId) return;

  cloudStories = [story, ...cloudStories.filter((savedStory) => !storiesMatch(savedStory, story))];
  cloudStoriesLoaded = true;
}

function prepareLibraryHandoff(story, message) {
  highlightedStoryId = getStoryIdentity(story);
  libraryNotice = message;
  if (canUseCloudLibrary() && story) upsertCloudStory(story);
}

function getStoryStorageSize(story) {
  return JSON.stringify(story).length;
}

function saveStoryLocally(story, plan, { silent = false } = {}) {
  const existingStory = getSavedStories().find((savedStory) => storiesMatch(savedStory, story) || savedStory.id === story.id);
  const storyToSave = {
    ...story,
    id: story.id || createStoryId(),
    savedAt: story.savedAt || new Date().toISOString(),
    isFavourite: Boolean(isStoryFavourite(story) || existingStory?.isFavourite),
  };
  const savedStories = getSavedStories().filter((savedStory) => !storiesMatch(savedStory, storyToSave) && savedStory.id !== storyToSave.id);
  savedStories.unshift(storyToSave);

  try {
    setSavedStories(trimSavedStoriesForLimit(savedStories, Math.min(plan.savedLimit, MAX_LOCAL_SAVED_STORIES)));
  } catch {
    const withoutAudio = {
      ...storyToSave,
      aiAudioTracks: [],
      aiAudioGeneratedAt: "",
    };
    const smallerStories = [withoutAudio, ...savedStories.slice(1)];
    try {
      setSavedStories(trimSavedStoriesForLimit(smallerStories, Math.min(plan.savedLimit, MAX_LOCAL_SAVED_STORIES)));
    } catch {
      if (!silent) {
        statusNote.textContent = "This device storage is full, so the story could not be saved here.";
      }
      return false;
    }
  }

  currentStory = storyToSave;
  if (screens.library.classList.contains("active")) renderLibrary();
  return true;
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
    is_favourite: isStoryFavourite(story),
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
    isFavourite: Boolean(row.is_favourite || getStoryFavouriteIds().includes(row.id)),
    createdAt: row.created_at,
    savedAt: row.updated_at || row.created_at,
  };
}

async function saveStoryToCloud(story) {
  if (!canUseCloudLibrary()) return false;

  let row = storyToCloudRow(story);
  let data;
  let error;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const query = story.cloudId
      ? supabaseClient.from("stories").update(row).eq("id", story.cloudId || story.id).select().single()
      : supabaseClient.from("stories").insert(row).select().single();
    ({ data, error } = await query);
    if (!error) break;

    const message = String(error.message || "");
    const fallbackRow = { ...row };
    if (message.includes("word_count")) delete fallbackRow.word_count;
    if (message.includes("is_favourite")) delete fallbackRow.is_favourite;
    if (Object.keys(fallbackRow).length === Object.keys(row).length) break;
    row = fallbackRow;
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
    saveError: "",
  };
  upsertCloudStory(currentStory);
  return currentStory;
}

async function saveGeneratedStoryToLibrary(story) {
  const plan = getPlan(story.plan);

  if (!plan.canSave) {
    statusNote.textContent = "Story ready. Saved libraries are included with DreamScapes plans.";
    return false;
  }

  if (!canUseCloudLibrary()) {
    const saved = saveStoryToLibrary(story, { silent: true });
    statusNote.textContent = saved
      ? "Saved to your library."
      : "This story could not be saved.";
    return saved;
  }

  if (story.cloudId) {
    currentStory = {
      ...story,
      id: story.cloudId,
      savedAt: story.savedAt || story.createdAt || new Date().toISOString(),
    };
    upsertCloudStory(currentStory);
    statusNote.textContent = "Saved to your library.";
    return true;
  }

  try {
    currentStory = await saveStoryToCloud({
      ...story,
      id: story.id || createStoryId(),
      savedAt: new Date().toISOString(),
    });
    updateAccountUI();
    statusNote.textContent = "Saved to your library.";
    return true;
  } catch (error) {
    const backedUp = saveStoryLocally(story, plan, { silent: true });
    statusNote.textContent = backedUp
      ? "Story created. Cloud saving could not connect, so it has been saved on this device for now."
      : "Story created, but cloud saving could not connect. Try refreshing and saving again.";
    trackEvent("cloud_story_save_failed", {
      reason: error.message || "unknown",
      localBackup: backedUp,
    });
    return backedUp;
  }
}

async function loadCloudStories() {
  if (!canUseCloudLibrary()) return [];

  let { data, error } = await supabaseClient
    .from("stories")
    .select("*")
    .order("is_favourite", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(MAX_LIBRARY_RENDER_ITEMS);

  if (error && String(error.message || "").includes("is_favourite")) {
    ({ data, error } = await supabaseClient
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(MAX_LIBRARY_RENDER_ITEMS));
  }

  if (error) throw error;

  cloudStories = (data || []).map(cloudRowToStory);
  cloudStoriesLoaded = true;
  return cloudStories;
}

async function updateCloudStoryFavourite(story, isFavourite) {
  if (!canUseCloudLibrary() || !story?.cloudId) return false;

  const { data, error } = await supabaseClient
    .from("stories")
    .update({ is_favourite: isFavourite })
    .eq("id", story.cloudId)
    .select()
    .single();

  if (error) {
    if (String(error.message || "").includes("is_favourite")) return false;
    throw error;
  }

  const updatedStory = {
    ...story,
    ...cloudRowToStory(data),
    isFavourite,
  };
  upsertCloudStory(updatedStory);
  return true;
}

async function toggleStoryFavourite(story) {
  if (!story) return;

  const isFavourite = !isStoryFavourite(story);
  setStoryFavouriteFlag(story, isFavourite);

  const localStories = getSavedStories();
  const localIndex = localStories.findIndex((savedStory) => storiesMatch(savedStory, story) || savedStory.id === story.id);
  if (localIndex >= 0) {
    localStories[localIndex] = {
      ...localStories[localIndex],
      isFavourite,
    };
    setSavedStories(localStories);
  }

  cloudStories = cloudStories.map((savedStory) =>
    storiesMatch(savedStory, story) ? { ...savedStory, isFavourite } : savedStory
  );

  if (currentStory && storiesMatch(currentStory, story)) {
    currentStory = {
      ...currentStory,
      isFavourite,
    };
  }

  let cloudSynced = true;
  try {
    cloudSynced = await updateCloudStoryFavourite(story, isFavourite);
  } catch {
    cloudSynced = false;
  }

  libraryNotice = isFavourite
    ? cloudSynced
      ? "Story saved and protected. DreamScapes will keep it before older stories."
      : "Story saved and protected on this device. Run the library setup SQL to sync it across devices."
    : "Save removed. This story can now be deleted.";
  trackEvent("story_favourite_changed", { isFavourite, cloudSynced });
}

async function deleteCloudStory(story) {
  if (!canUseCloudLibrary() || !story?.cloudId) return false;

  const { error } = await supabaseClient.from("stories").delete().eq("id", story.cloudId);
  if (error) throw error;

  setStoryFavouriteFlag(story, false);
  cloudStories = cloudStories.filter((savedStory) => savedStory.cloudId !== story.cloudId);
  updateAccountUI();
  return true;
}

function getAudioIssueReports() {
  try {
    const reports = JSON.parse(localStorage.getItem("dreamscapesAudioIssueReports") || "[]");
    return Array.isArray(reports) ? reports : [];
  } catch {
    return [];
  }
}

function saveAudioIssueReportLocally(report) {
  const reports = getAudioIssueReports();
  reports.unshift({ ...report, localId: createStoryId(), createdAt: new Date().toISOString() });
  localStorage.setItem("dreamscapesAudioIssueReports", JSON.stringify(reports.slice(0, 20)));
}

async function reportAudioIssue(story, source = "result") {
  if (!story?.audioNarration) {
    statusNote.textContent = "This story does not have audio to report.";
    return false;
  }

  const message =
    window.prompt(
      "Tell us what happened with the audio. For example: failed to generate, wrong voice, too short, or sounded uneven."
    ) || "";
  const cleanMessage = message.trim();

  if (!cleanMessage) {
    statusNote.textContent = "Audio report cancelled.";
    return false;
  }

  const report = {
    user_id: currentUser?.id || null,
    story_id: story.cloudId || null,
    story_title: story.title || "Untitled story",
    voice_style: story.voiceStyle || null,
    duration_minutes: Number(story.duration) || null,
    audio_duration_seconds: getSavedAudioDurationSeconds(story) || null,
    source,
    message: cleanMessage,
    status: "open",
  };

  if (!canUseCloudLibrary()) {
    saveAudioIssueReportLocally(report);
    statusNote.textContent = "Audio issue noted. Please contact support@dreamscapes.cloud so we can help with credits.";
    return true;
  }

  try {
    const { error } = await supabaseClient.from("audio_issue_reports").insert(report);
    if (error) throw error;
    statusNote.textContent = "Audio issue sent. Support can review this and help with credits where appropriate.";
    return true;
  } catch {
    saveAudioIssueReportLocally(report);
    statusNote.textContent =
      "Audio issue saved on this device. Please contact support@dreamscapes.cloud so we can help with credits.";
    return false;
  }
}

function getFeedbackReports() {
  try {
    const reports = JSON.parse(localStorage.getItem("dreamscapesFeedbackReports") || "[]");
    return Array.isArray(reports) ? reports : [];
  } catch {
    return [];
  }
}

function saveFeedbackReportLocally(report) {
  const reports = getFeedbackReports();
  reports.unshift({ ...report, localId: createStoryId(), createdAt: new Date().toISOString() });
  localStorage.setItem("dreamscapesFeedbackReports", JSON.stringify(reports.slice(0, 30)));
}

async function sendTesterFeedback() {
  const message = feedbackMessage?.value.trim() || "";
  const category = feedbackCategory?.value || "bug";

  if (!message) {
    if (feedbackStatus) feedbackStatus.textContent = "Add a short message before sending.";
    return false;
  }

  const report = {
    user_id: currentUser?.id || null,
    user_email: currentUser?.email || null,
    category,
    message,
    app_screen: Object.entries(screens).find(([, screen]) => screen.classList.contains("active"))?.[0] || "account",
    story_id: currentStory?.cloudId || null,
    story_title: currentStory?.title || null,
    device_info: {
      platform: getCapacitorPlatform(),
      native: isNativeMobileApp(),
      userAgent: navigator.userAgent,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    status: "open",
  };

  if (!canUseCloudLibrary()) {
    saveFeedbackReportLocally(report);
    if (feedbackStatus) feedbackStatus.textContent = "Feedback saved on this device. Thank you.";
    return true;
  }

  try {
    const { error } = await supabaseClient.from("feedback_reports").insert(report);
    if (error) throw error;
    if (feedbackMessage) feedbackMessage.value = "";
    if (feedbackStatus) feedbackStatus.textContent = "Feedback sent. Thank you.";
    trackEvent("tester_feedback_sent", { category });
    return true;
  } catch {
    saveFeedbackReportLocally(report);
    if (feedbackStatus) {
      feedbackStatus.textContent = "Feedback saved on this device. Run the feedback SQL to store it in Supabase.";
    }
    return false;
  }
}

function saveStoryToLibrary(story, { silent = false } = {}) {
  const plan = getPlan(story.plan);

  if (!plan.canSave) {
    if (!silent) statusNote.textContent = "Saved story libraries are included with DreamScapes plans.";
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

  const saved = saveStoryLocally(storyToSave, plan, { silent });
  if (!saved) return false;

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
    });
  }
});

function syncDurationChoiceHighlight() {
  durationInputs.forEach((input) => {
    input.closest("label")?.classList.toggle("selected-choice", input.checked);
  });
}

function handleDurationChoiceChange(input) {
  syncDurationChoiceHighlight();
  const plan = getPlan(getCurrentPlanKey());
  const duration = Number(input.value);
  const audioAllowed = canUseAudioNarration(duration);

  audioToggle.closest(".feature-toggle").classList.toggle("locked", !audioAllowed);

  if (audioToggle.checked && !audioAllowed) {
    audioToggle.checked = false;
    planNote.textContent =
      getAudioStoryCredits() > 0 && duration > AUDIO_CREDIT_MAX_MINUTES
        ? `Redeemed audio credits can be used on stories up to ${AUDIO_CREDIT_MAX_MINUTES} minutes. Choose a shorter story or upgrade to DreamScapes Plus.`
        : "Audio narration is included with DreamScapes Plus, or with a redeemed audio credit.";
    return;
  }

  if (duration <= plan.maxDuration) return;

  keepDurationWithinPlan(plan);
  syncDurationChoiceHighlight();
  planNote.textContent = `${plan.label} includes stories up to ${plan.maxDuration} minutes. Premier and Plus subscriptions are coming soon in the app stores.`;
}

durationInputs.forEach((input) => {
  input.closest("label")?.addEventListener("pointerdown", () => {
    if (input.disabled) return;
    input.checked = true;
    syncDurationChoiceHighlight();
  });
  input.addEventListener("change", () => handleDurationChoiceChange(input));
});
syncDurationChoiceHighlight();

authForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#sign-in-button")?.click();
});

signupForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#create-account-button")?.click();
});

redeemForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    if (redeemStatus) redeemStatus.textContent = "Sign in before redeeming a code.";
    return;
  }

  const code = redeemCodeInput?.value.trim() || "";
  if (!code) {
    if (redeemStatus) redeemStatus.textContent = "Enter a redeem code.";
    return;
  }

  if (redeemStatus) redeemStatus.textContent = "Checking code...";

  try {
    const response = await fetch(REDEEM_CODE_ENDPOINT, {
      method: "POST",
      headers: await getApiHeaders(),
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Code could not be redeemed."));
    }

    const data = await response.json().catch(() => ({}));
    if (data.profile) currentProfile = data.profile;
    if (redeemCodeInput) redeemCodeInput.value = "";
    if (redeemStatus) redeemStatus.textContent = data.message || "Code redeemed.";
    updateAccountUI();
    updatePlanFeatures();
    trackEvent("redeem_code_success", { audioStoryCreditsAdded: data.audioStoryCreditsAdded || 0 });
  } catch (error) {
    if (redeemStatus) redeemStatus.textContent = getFriendlyFaultMessage(error, "Code could not be redeemed.");
    trackEvent("redeem_code_failed");
  }
});

feedbackForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    if (feedbackStatus) feedbackStatus.textContent = "Sign in before sending feedback.";
    return;
  }

  if (feedbackStatus) feedbackStatus.textContent = "Sending feedback...";
  await sendTesterFeedback();
});

openAdminButton?.addEventListener("click", () => {
  showScreen("admin");
});

refreshAdminButton?.addEventListener("click", () => {
  loadAdminDashboard();
});

adminCreditForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await addAdminAudioCredits();
});

document.querySelector("#sign-in-button")?.addEventListener("click", async () => {
  if (!(await ensureSupabaseClient())) {
    setAuthStatus("Account login could not load. Check your connection and refresh DreamScapes.", true);
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
    setAuthStatus(getFriendlyFaultMessage(error, "Sign in could not be completed. Please try again."), true);
    return;
  }

  setAuthStatus("Signed in.");
  trackEvent("account_signed_in");
});

document.querySelector("#open-sign-up-button")?.addEventListener("click", () => {
  const { email } = getAuthCredentials();
  if (signupEmail && email) signupEmail.value = email;
  setAuthStatus("");
  setSignupStatus("");
  showScreen("signup");
});

planAuthCreateButton?.addEventListener("click", () => {
  setSignupStatus("Create your free account, then choose your DreamScapes package.");
  showScreen("signup");
});

planAuthSigninButton?.addEventListener("click", () => {
  setAuthStatus("Sign in, then return to Plans to choose your package.");
  showScreen("account");
});

document.querySelector("#create-account-button")?.addEventListener("click", async () => {
  if (!(await ensureSupabaseClient())) {
    setSignupStatus("Account signup could not load. Check your connection and refresh DreamScapes.", true);
    return;
  }

  const { email, password, passwordConfirm } = getSignupCredentials();
  const validationMessage = validateSignupCredentials(email, password, passwordConfirm);

  if (validationMessage) {
    setSignupStatus(validationMessage, true);
    return;
  }

  setSignupStatus("Creating account...");
  const { error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    setSignupStatus(getFriendlyFaultMessage(error, "Account could not be created. Please try again."), true);
    return;
  }

  if (authEmail) authEmail.value = email;
  if (authPassword) authPassword.value = "";
  if (signupPassword) signupPassword.value = "";
  if (signupPasswordConfirm) signupPasswordConfirm.value = "";
  showScreen("account");
  setAuthStatus("Account created. Check your email to confirm your DreamScapes account.");
  trackEvent("account_signed_up");
});

document.querySelector("#forgot-password-button")?.addEventListener("click", async () => {
  if (!(await ensureSupabaseClient())) {
    setAuthStatus("Password reset could not load. Check your connection and refresh DreamScapes.", true);
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
    setAuthStatus(getFriendlyFaultMessage(error, "Password reset email could not be sent. Please try again."), true);
    return;
  }

  setAuthStatus("Password reset email sent. Check your inbox.");
  trackEvent("password_reset_requested");
});

document.querySelector("#update-password-button")?.addEventListener("click", async () => {
  if (!(await ensureSupabaseClient())) {
    setAuthStatus("Password reset could not load. Check your connection and refresh DreamScapes.", true);
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
    setAuthStatus(getFriendlyFaultMessage(error, "Password could not be updated. Please try again."), true);
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
  if (!(await ensureSupabaseClient())) return;

  setAuthStatus("Signing out...");
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    setAuthStatus(getFriendlyFaultMessage(error, "Sign out could not be completed. Please try again."), true);
    return;
  }

  setAuthStatus("Signed out.");
  trackEvent("account_signed_out");
});

childProfileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const profile = {
    id: childProfileId?.value || "",
    childName: cleanProfileValue(childProfileForm.elements.profileChildName.value),
    childAge: cleanProfileValue(childProfileForm.elements.profileChildAge.value),
    eyeColour: cleanProfileValue(childProfileForm.elements.profileEyeColour.value),
    hairColour: cleanProfileValue(childProfileForm.elements.profileHairColour.value),
    parentNames: cleanProfileValue(childProfileForm.elements.profileParentNames.value),
    interests: cleanProfileValue(childProfileForm.elements.profileInterests.value),
    friends: cleanProfileValue(childProfileForm.elements.profileFriends.value),
    avoidTopics: cleanProfileValue(childProfileForm.elements.profileAvoidTopics.value),
    otherDetails: cleanProfileValue(childProfileForm.elements.profileOtherDetails.value),
  };

  if (!profile.childName) {
    setAuthStatus("Add a child name before saving a profile.", true);
    return;
  }

  await saveChildProfile(profile);
  clearChildProfileForm();
  setChildProfileFormOpen(false);
  setAuthStatus("Child profile saved.");
  trackEvent("child_profile_saved");
});

toggleProfileFormButton?.addEventListener("click", () => {
  const nextOpen = childProfileForm?.hidden !== false;
  if (nextOpen) clearChildProfileForm();
  setChildProfileFormOpen(nextOpen);
});

document.querySelector("#cancel-profile-edit")?.addEventListener("click", () => {
  clearChildProfileForm();
  setChildProfileFormOpen(false);
  setAuthStatus("");
});

childProfileList?.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-profile]");
  const deleteButton = event.target.closest("[data-delete-profile]");

  if (editButton) {
    const profile = childProfiles.find((savedProfile) => savedProfile.id === editButton.dataset.editProfile);
    fillChildProfileForm(profile);
    setChildProfileFormOpen(true);
    setAuthStatus("Editing child profile.");
    return;
  }

  if (deleteButton) {
    try {
      await deleteChildProfile(deleteButton.dataset.deleteProfile);
      setAuthStatus("Child profile deleted.");
      trackEvent("child_profile_deleted");
    } catch {
      setAuthStatus("Could not delete that child profile. Try again.", true);
    }
  }
});

clearProfileSelectionButton?.addEventListener("click", () => {
  document.querySelectorAll('input[name="childProfiles"]').forEach((input) => {
    input.checked = false;
  });
});

document.querySelectorAll("[data-idea]").forEach((button) => {
  button.addEventListener("click", () => {
    storyIdea.value = button.dataset.idea;
    trackEvent("idea_example_selected", { label: button.textContent.trim() });
  });
});

async function playAiVoicePreview() {
  const selectedVoiceStyle = voiceStyle.value;
  const previewGain = VOICE_PREVIEW_GAINS[selectedVoiceStyle] || VOICE_PREVIEW_GAIN;
  const previewFile = VOICE_PREVIEW_FILES[selectedVoiceStyle];
  if (previewFile) {
    return `fixed-file-${await playPreviewAudio(previewFile, previewGain)}`;
  }

  const response = await fetch(NARRATION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: VOICE_PREVIEW_TEXT,
      voice: getAiNarrationVoice(selectedVoiceStyle),
      chargeAudio: false,
      instructions: getAiNarrationInstructions({
        childAge: "5",
        moods: ["relaxing"],
        storyType: "bedtime",
        voiceStyle: selectedVoiceStyle,
      }).concat(
        " This is a voice preview. Read only this exact preview sentence and stop after the word begin."
      ),
    }),
  });

  if (!response.ok) return false;

  const data = await response.json();
  if (!Array.isArray(data.audio) || !data.audio[0]) return false;

  return `new-ai-${await playPreviewAudio(data.audio[0], previewGain)}`;
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

function getSelectedVoiceLabel() {
  return voiceStyle.options[voiceStyle.selectedIndex]?.textContent?.trim() || "selected voice";
}

voicePreviewButton.addEventListener("click", async () => {
  const selectedVoiceLabel = getSelectedVoiceLabel();
  voicePreviewButton.disabled = true;
  voicePreviewButton.textContent = `Playing ${selectedVoiceLabel}...`;
  planNote.textContent = `Preparing ${selectedVoiceLabel} preview...`;

  try {
    const usedAiPreview = await playAiVoicePreview();
    if (usedAiPreview) {
      planNote.textContent = `Playing ${selectedVoiceLabel} preview.`;
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
    planNote.textContent = `Playing ${selectedVoiceLabel} device preview. Premium AI preview needs the OpenAI key and credits.`;
    trackEvent("voice_preview", { voiceStyle: voiceStyle.value, source: "device" });
    return;
  }

  planNote.textContent = "Voice preview is not available in this browser.";
});

document.querySelector("#create-another-button").addEventListener("click", () => {
  statusNote.textContent = "";
  libraryNotice = "";
  highlightedStoryId = "";
  stopNarration();
  updatePlanFeatures();
  showScreen("builder");
});

document.querySelector("#view-library-button").addEventListener("click", () => {
  stopNarration();
  showScreen("library");
});

libraryFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentLibraryFilter = button.dataset.libraryFilter || "all";
    libraryFilterButtons.forEach((filterButton) => {
      filterButton.classList.toggle("active", filterButton === button);
    });
    libraryNotice = "";
    renderLibrary();
  });
});

librarySort?.addEventListener("change", () => {
  libraryNotice = "";
  renderLibrary();
});

reportAudioButton?.addEventListener("click", async () => {
  if (!currentStory) return;
  await reportAudioIssue(currentStory, "result");
});

document.querySelectorAll("[data-sleep-minutes]").forEach((button) => {
  button.addEventListener("click", () => {
    setSleepTimer(button.dataset.sleepMinutes);
  });
});

document.querySelector("#sleep-timer-off")?.addEventListener("click", () => {
  clearSleepTimer();
  trackEvent("sleep_timer_cleared");
});

document.querySelectorAll("[data-plan-preview]").forEach((button) => {
  button.addEventListener("click", () => {
    hidePlanAuthNotice();
    const planKey = button.dataset.planPreview;
    upgradeNote.textContent =
      planKey === "free"
        ? "Free is the active starter plan."
        : "Choose Premier or Plus inside the iOS and Android app.";
  });
});

document.querySelectorAll("[data-purchase-plan]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!currentUser) {
      showPlanAuthNotice(button.dataset.purchasePlan);
      return;
    }

    hidePlanAuthNotice();
    try {
      await purchasePlan(button.dataset.purchasePlan);
    } catch (error) {
      const message = getRevenueCatErrorMessage(error);
      console.error("RevenueCat purchase error", error);
      upgradeNote.textContent = message;
      trackEvent("revenuecat_purchase_failed", {
        plan: button.dataset.purchasePlan,
        message: message.slice(0, 300),
      });
    }
  });
});

document.querySelector("#restore-purchases-button")?.addEventListener("click", async () => {
  try {
    await restorePurchases();
  } catch (error) {
    const message = getRevenueCatErrorMessage(error, "Purchases could not be restored.");
    console.error("RevenueCat restore error", error);
    upgradeNote.textContent = message;
    trackEvent("revenuecat_restore_failed", {
      message: message.slice(0, 300),
    });
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    planNote.textContent = "Sign in or create a free DreamScapes account before creating stories.";
    showScreen("account");
    return;
  }

  if (audioToggle.checked && !canUseAudioNarration()) {
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

  if (
    audioToggle.checked &&
    getAudioStoryCredits() <= 0 &&
    selectedPlan.audioMinutes > 0 &&
    audioSecondsUsed >= selectedPlan.audioMinutes * 60
  ) {
    planNote.textContent = `${selectedPlan.label} has reached its ${selectedPlan.audioMinutes} audio minute monthly limit.`;
    return;
  }

  if (selectedDuration > selectedPlan.maxDuration) {
    planNote.textContent = `${selectedPlan.label} includes stories up to ${selectedPlan.maxDuration} minutes. App Store and Google Play subscriptions are coming soon for longer stories.`;
    showScreen("upgrade");
    return;
  }

  const storyData = buildProfileAwareStoryData(selectedPlan, selectedPlanKey);

  if (!storyData.childName) {
    planNote.textContent = "Add a child name or choose a saved child profile before creating a story.";
    return;
  }

  showScreen("loading");

  window.setTimeout(async () => {
    let generatedStory = null;
    try {
      generatedStory = {
        ...(await createStory(storyData)),
        aiAudioTracks: [],
        aiAudioPaths: [],
        aiAudioGeneratedAt: "",
      };
    } catch (error) {
      if (canUseCloudLibrary() && /failed to fetch|could not connect|story service/i.test(error.message || "")) {
        cloudStoriesLoaded = false;
        highlightedStoryId = "";
        libraryNotice =
          "DreamScapes could not confirm the final response. Checking your library in case the story saved successfully.";
        showScreen("library");
        return;
      }

      showScreen("builder");
      planNote.textContent = getFriendlyFaultMessage(error, "Could not create that story. Try again.");
      return;
    }

    try {
      currentStory = generatedStory;
      currentStory.id = currentStory.cloudId || currentStory.id || createStoryId();
      if (!canUseCloudLibrary()) incrementStoriesUsed(selectedPlanKey);
      renderStory(currentStory);
      const savedToLibrary = await saveGeneratedStoryToLibrary(currentStory);
      trackEvent("story_generated", {
        plan: selectedPlanKey,
        duration: storyData.duration,
        audio: storyData.audioNarration,
        wordCount: currentStory.wordCount || 0,
        targetWords: currentStory.durationTarget?.words || 0,
      });
      if (savedToLibrary) {
        const savedMessage = currentStory.saveError
          ? "Story created and saved locally. Cloud saving may need a refresh."
          : currentStory.aiAudioPaths?.length || currentStory.aiAudioTracks?.length
            ? "Story and audio saved to your library."
            : "Story saved to your library. Open it when you are ready to read or create audio.";
        prepareLibraryHandoff(
          currentStory,
          savedMessage
        );
        showScreen("library");
      } else {
        libraryNotice = "";
        showScreen("result");
      }
    } catch (error) {
      libraryNotice = "";
      renderStory(currentStory || generatedStory);
      statusNote.textContent =
        "Story created. It could not be moved to the library automatically, so it is shown here.";
      showScreen("result");
    }
  }, 900);
});

document.querySelector("#save-story-button")?.addEventListener("click", () => {
  if (!currentStory) return;
  saveStoryToLibrary(currentStory);
});

async function renderLibrary() {
  if (!libraryList) return;

  if (libraryStatus) {
    libraryStatus.textContent = libraryNotice;
  }

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
  const localStories = getSavedStories();
  const savedStories = usingCloudLibrary
    ? [
        ...cloudStories,
        ...localStories.filter(
          (localStory) =>
            !cloudStories.some(
              (cloudStory) =>
                cloudStory.id === localStory.id ||
                cloudStory.cloudId === localStory.cloudId ||
                cloudStory.cloudId === localStory.id
            )
        ),
      ]
    : localStories;
  const orderedStories = sortLibraryStories(savedStories);
  const filteredStories = filterLibraryStories(orderedStories);
  const visibleStories = filteredStories.slice(0, MAX_LIBRARY_RENDER_ITEMS);

  if (savedStories.length === 0) {
    libraryList.innerHTML = `
      <article class="library-item">
        <h3>No saved stories yet</h3>
        <p>${usingCloudLibrary ? "Stories you create while signed in will save to your cloud library." : "Free saves up to 3 stories here. Premier and Plus save more."}</p>
        <button class="button primary-button" data-screen-target="builder" type="button">Create a Story</button>
      </article>
    `;
    libraryList.querySelector("[data-screen-target]")?.addEventListener("click", () => showScreen("builder"));
    return;
  }

  if (filteredStories.length === 0) {
    const emptyLabel =
      currentLibraryFilter === "audio"
        ? "audio stories"
        : currentLibraryFilter === "favourites"
          ? "protected stories"
          : "text-only stories";
    libraryList.innerHTML = `
      <article class="library-item">
        <h3>No ${emptyLabel} found</h3>
        <p>${currentLibraryFilter === "favourites" ? "Tap Save on a story to protect it here." : "Switch filters or create another story to add more to your library."}</p>
      </article>
    `;
    if (libraryStatus && !libraryNotice) {
      libraryStatus.textContent = `${savedStories.length} saved ${savedStories.length === 1 ? "story" : "stories"}.`;
    }
    return;
  }

  if (libraryStatus && !libraryNotice) {
    const shownCount = filteredStories.length;
    libraryStatus.textContent =
      currentLibraryFilter === "favourites"
        ? `${shownCount} saved and protected ${shownCount === 1 ? "story" : "stories"} shown from ${savedStories.length} in your library.`
        : `${shownCount} ${shownCount === 1 ? "story" : "stories"} shown from ${savedStories.length} saved.`;
  }

  libraryList.innerHTML = visibleStories
    .map(
      (story, index) => {
        const savedAudioDuration = getSavedAudioDurationSeconds(story);
        const isNewStory = isHighlightedStory(story);
        const isFavourite = isStoryFavourite(story);
        const audioLabel = story.audioNarration
          ? savedAudioDuration
            ? `Audio saved ${formatAudioTime(savedAudioDuration)}`
            : "Audio will be created on first play"
          : "Text only";
        const storyLengthSeconds = getStoryActualDurationSeconds(story);
        const metadata = [
          getPlan(story.plan).label,
          storyLengthSeconds ? `Story ${formatAudioTime(storyLengthSeconds)}` : "",
          audioLabel,
          new Date(story.createdAt).toLocaleDateString(),
        ].filter(Boolean);
        return `
        <article class="library-item ${isNewStory ? "new-story" : ""} ${isFavourite ? "favourite-story" : ""}">
          ${
            isNewStory || isFavourite
              ? `<div class="library-badges">
                  ${isNewStory ? '<span class="new-story-badge">New story</span>' : ""}
                  ${isFavourite ? '<span class="favourite-story-badge">Saved</span>' : ""}
                </div>`
              : ""
          }
          <h3>${escapeHtml(story.title)}</h3>
          <p class="library-meta">${escapeHtml(metadata.join(" · "))}</p>
          <p class="library-preview">${escapeHtml(story.text?.[0]?.slice(0, 150) || "Saved story")}...</p>
          <div class="library-actions">
            <button class="button primary-button library-open-button" data-library-index="${index}" type="button">Open Story</button>
            <button class="button secondary-button favourite-button ${isFavourite ? "active" : ""}" data-favourite-index="${index}" type="button" aria-pressed="${isFavourite ? "true" : "false"}">${isFavourite ? "Saved" : "Save"}</button>
            <button class="button secondary-button delete-button ${isFavourite ? "protected-delete-button" : ""}" data-delete-index="${index}" type="button" aria-label="${isFavourite ? "Saved story locked from deletion" : "Delete story"}">${isFavourite ? "Locked" : "Delete"}</button>
          </div>
        </article>
      `;
      }
    )
    .join("");

  libraryList.querySelectorAll("[data-library-index]").forEach((button) => {
    button.addEventListener("click", () => {
      currentStory = visibleStories[Number(button.dataset.libraryIndex)];
      renderStory(currentStory);
      statusNote.textContent = "";
      showScreen("result");
    });
  });

  libraryList.querySelectorAll("[data-favourite-index]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.favouriteIndex);
      const storyToFavourite = visibleStories[index];
      button.disabled = true;
      await toggleStoryFavourite(storyToFavourite);
      renderLibrary();
    });
  });

  libraryList.querySelectorAll("[data-delete-index]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.deleteIndex);
      const storyToDelete = visibleStories[index];

      if (isStoryFavourite(storyToDelete)) {
        libraryNotice = "This story is protected. Tap Saved to remove its protection before deleting.";
        trackEvent("protected_story_delete_blocked", { index });
        renderLibrary();
        return;
      }

      if (usingCloudLibrary && storyToDelete?.cloudId) {
        try {
          await deleteCloudStory(storyToDelete);
        } catch {
          libraryList.insertAdjacentHTML(
            "afterbegin",
            '<p class="status-note account-status error">Could not delete that cloud story. Try again.</p>'
          );
          return;
        }
      } else {
        const nextStories = getSavedStories();
        const localIndex = nextStories.findIndex((story) => story.id === storyToDelete?.id);
        if (localIndex >= 0) nextStories.splice(localIndex, 1);
        setStoryFavouriteFlag(storyToDelete, false);
        setSavedStories(nextStories);
      }

      trackEvent("story_deleted", { index, source: usingCloudLibrary ? "cloud" : "local" });
      renderLibrary();
    });
  });
}

function canUseNarration() {
  if (!currentStory) return;
  const accountPlan = getPlan(getCurrentPlanKey());
  const storyDuration = Number(currentStory.duration || 0);

  if (!accountPlan.canUseAudio && getAudioStoryCredits() <= 0) {
    statusNote.textContent = "Audio narration is included with DreamScapes Plus, or with a redeemed audio credit.";
    return false;
  }

  if (!accountPlan.canUseAudio && getAudioStoryCredits() > 0 && storyDuration > AUDIO_CREDIT_MAX_MINUTES) {
    statusNote.textContent = `Redeemed audio credits can be used on stories up to ${AUDIO_CREDIT_MAX_MINUTES} minutes. Create a shorter audio story or upgrade to DreamScapes Plus.`;
    return false;
  }

  if (!currentStory.audioNarration) {
    statusNote.textContent =
      "This story was created without audio selected. Turn audio on in the builder before generating a story.";
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

function setAudioGenerationProgress(partIndex, totalParts, state = "creating") {
  const safeTotal = Math.max(1, Number(totalParts) || 1);
  const safeIndex = Math.max(0, Math.min(safeTotal, Number(partIndex) || 0));
  const percent = (safeIndex / safeTotal) * 100;

  audioProgressWrap.hidden = false;
  audioProgress.value = String(Math.round(percent));
  audioProgressLabel.textContent =
    state === "complete"
      ? "Audio ready"
      : `Audio part ${Math.min(safeIndex + 1, safeTotal)} of ${safeTotal}`;
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
  const completedPauseSeconds = Math.min(currentAudioIndex, currentAudioTracks.length - 1) * getAiAudioPauseSeconds();
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

      remainingSeconds -= trackSeconds + getAiAudioPauseSeconds();
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

function updateSleepTimerNote() {
  if (!sleepTimerNote) return;

  if (!sleepTimerEndsAt) {
    sleepTimerNote.textContent = "Off";
    return;
  }

  const remainingMs = Math.max(0, sleepTimerEndsAt - Date.now());
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  sleepTimerNote.textContent = remainingMinutes > 1 ? `${remainingMinutes} minutes left` : "Less than 1 minute left";
}

function clearSleepTimer({ silent = false } = {}) {
  window.clearTimeout(sleepTimerId);
  window.clearInterval(sleepTimerCountdownId);
  sleepTimerId = null;
  sleepTimerCountdownId = null;
  sleepTimerEndsAt = null;
  updateSleepTimerNote();
  document.querySelectorAll("[data-sleep-minutes]").forEach((button) => button.classList.remove("active"));
  if (!silent) statusNote.textContent = "Sleep timer turned off.";
}

function finishSleepTimer() {
  clearSleepTimer({ silent: true });
  stopNarration();
  statusNote.textContent = "Sleep timer finished. Narration stopped.";
}

function setSleepTimer(minutes) {
  const safeMinutes = Number(minutes);
  if (!Number.isFinite(safeMinutes) || safeMinutes <= 0) return;

  clearSleepTimer({ silent: true });
  sleepTimerEndsAt = Date.now() + safeMinutes * 60000;
  sleepTimerId = window.setTimeout(finishSleepTimer, safeMinutes * 60000);
  sleepTimerCountdownId = window.setInterval(updateSleepTimerNote, 15000);
  updateSleepTimerNote();
  document.querySelectorAll("[data-sleep-minutes]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.sleepMinutes) === safeMinutes);
  });
  statusNote.textContent = `Sleep timer set for ${safeMinutes} minutes.`;
  trackEvent("sleep_timer_set", { minutes: safeMinutes });
}

function stopNarration({ clearTimer = true } = {}) {
  if (clearTimer) clearSleepTimer({ silent: true });
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
    clearSleepTimer({ silent: true });
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
    clearSleepTimer({ silent: true });
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
    currentAudio = null;
    playAiAudioTrack();
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
      statusNote.textContent =
        "Saved cloud audio could not load. Try again in a moment or report the audio issue so support can help.";
      narrationNote.textContent = "Saved audio could not load";
      trackEvent("cloud_ai_audio_load_failed", { storyId: currentStory.cloudId || currentStory.id });
      return "blocked";
    }
  }

  try {
    statusNote.textContent = "Creating audio. This can take a moment...";
    narrationNote.textContent = "Creating and saving audio";
    const narrationParts = splitAiNarrationRequestText(storyAsText(currentStory));
    const partDuration = Math.max(0.1, (Number(currentStory.duration) || 5) / narrationParts.length);
    const chargeAudioSeconds = (Number(currentStory.duration) || 5) * 60;
    setAudioGenerationProgress(0, narrationParts.length);
    await updateAudioUsage("check", chargeAudioSeconds);
    const audioTracks = [];

    for (let index = 0; index < narrationParts.length; index += 1) {
      const totalParts = narrationParts.length;
      statusNote.textContent = `Creating audio part ${index + 1} of ${totalParts}. This can take a moment...`;
      narrationNote.textContent = `Creating audio ${index + 1}/${totalParts}`;
      setAudioGenerationProgress(index, totalParts);
      const data = await requestAiNarrationPart({
        text: narrationParts[index],
        duration: partDuration,
        voice: getAiNarrationVoice(currentStory.voiceStyle),
        instructions: getAiNarrationInstructions(currentStory),
      });

      audioTracks.push(...data.audio);
      setAudioGenerationProgress(index + 1, totalParts);
    }

    currentAudioTracks = audioTracks;
    currentAudioTrackDurations = await measureAudioTrackDurations(audioTracks);
    const aiAudioDurationSeconds = getPlaybackDurationSeconds(currentAudioTrackDurations, currentStory);
    const completedAudioSeconds = aiAudioDurationSeconds > 0 ? Math.ceil(aiAudioDurationSeconds) : chargeAudioSeconds;
    await updateAudioUsage("complete", completedAudioSeconds, { requestedAudioSeconds: chargeAudioSeconds });
    let aiAudioPaths = currentStory.aiAudioPaths || [];
    if (canUseCloudLibrary()) {
      try {
        aiAudioPaths = await uploadAudioTracksToCloud(currentStory, audioTracks);
      } catch {
        aiAudioPaths = [];
      }
    }
    currentAudioIndex = 0;
    currentStory = {
      ...currentStory,
      aiAudioTracks: aiAudioPaths.length ? [] : audioTracks,
      aiAudioPaths,
      aiAudioTrackDurations: currentAudioTrackDurations,
      aiAudioDurationSeconds,
      aiAudioGeneratedAt: new Date().toISOString(),
    };
    saveStoryToLibrary(currentStory, { silent: true });
    setAudioGenerationProgress(narrationParts.length, narrationParts.length, "complete");
    playAiAudioTrack();
    statusNote.textContent = "Audio complete. Playing now.";
    narrationNote.textContent = aiAudioDurationSeconds
      ? `Audio complete and saved: ${formatAudioTime(aiAudioDurationSeconds)}`
      : "Audio complete and saved";
    trackEvent("ai_audio_played", {
      voiceStyle: currentStory.voiceStyle,
      chunks: audioTracks.length,
    });
    return true;
  } catch (error) {
    statusNote.textContent = getFriendlyFaultMessage(
      error,
      "Audio could not be created. Try again in a moment."
    );
    narrationNote.textContent = "Audio not created";
    return "blocked";
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

  stopNarration({ clearTimer: false });
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
ensureSupabaseClient();
