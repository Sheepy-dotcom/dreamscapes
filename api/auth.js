const SUPABASE_URL = process.env.SUPABASE_URL || "https://khgzzrixhetaontmdhez.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZ3p6cml4aGV0YW9udG1kaGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTkwMjMsImV4cCI6MjA5NTU3NTAyM30.Zij8eBhzxNecuPRsMliWChxYmogLBFbd1GScpKPM_5g";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const AUDIO_CREDIT_MAX_SECONDS = 10 * 60;

const plans = {
  free: {
    label: "Free",
    monthlyStories: 3,
    maxDuration: 10,
    canSave: false,
    canUseAudio: false,
    audioMinutes: 0,
  },
  premier: {
    label: "Premier",
    monthlyStories: 15,
    maxDuration: 20,
    canSave: true,
    canUseAudio: false,
    audioMinutes: 0,
  },
  plus: {
    label: "DreamScapes Plus",
    monthlyStories: 30,
    maxDuration: 30,
    canSave: true,
    canUseAudio: true,
    audioMinutes: 150,
  },
};

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getPlan(planKey) {
  return plans[planKey] || plans.free;
}

function getBearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function getCurrentMonthKey() {
  const date = new Date();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function supabaseRequest(path, { token, method = "GET", body, prefer, apiKey = SUPABASE_ANON_KEY } = {}) {
  const headers = {
    apikey: apiKey,
    Authorization: `Bearer ${token}`,
  };

  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(response.status, message || "Supabase request failed");
  }

  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(response.status, text || "Supabase returned an invalid response");
  }
}

async function supabaseServiceRequest(path, { method = "GET", body, prefer } = {}) {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new ApiError(501, "SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return supabaseRequest(path, {
    token: SUPABASE_SERVICE_ROLE_KEY,
    apiKey: SUPABASE_SERVICE_ROLE_KEY,
    method,
    body,
    prefer,
  });
}

async function getAccountContext(request) {
  const token = getBearerToken(request);
  if (!token) {
    throw new ApiError(401, "Sign in to create DreamScapes stories.");
  }

  const user = await supabaseRequest("/auth/v1/user", { token });
  if (!user?.id) {
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }

  const profiles = await supabaseRequest(`/rest/v1/profiles?id=eq.${user.id}&select=*`, { token });
  const profile = profiles?.[0] || { id: user.id, plan: "free", audio_story_credits: 0 };
  const plan = getPlan(profile.plan);
  const monthKey = getCurrentMonthKey();
  const usageRows = await supabaseRequest(
    `/rest/v1/usage_months?user_id=eq.${user.id}&month_key=eq.${monthKey}&select=*`,
    { token }
  );
  let usage = usageRows?.[0];

  if (!usage) {
    const inserted = await supabaseRequest("/rest/v1/usage_months?select=*", {
      token,
      method: "POST",
      prefer: "return=representation",
      body: {
        user_id: user.id,
        month_key: monthKey,
        stories_created: 0,
        audio_seconds_used: 0,
      },
    });
    usage = inserted?.[0];
  }

  return { token, user, profile, plan, usage };
}

function getRequestedDuration(body) {
  const duration = Number(body.duration || body.duration_minutes || 5);
  return Number.isFinite(duration) && duration > 0 ? duration : 5;
}

function getNarrationChargeSeconds(body) {
  const durationSeconds = getRequestedDuration(body) * 60;
  const wordCount = String(body.text || "")
    .split(/\s+/)
    .filter(Boolean).length;
  const textEstimateSeconds = wordCount > 0 ? Math.ceil((wordCount / 125) * 60) : durationSeconds;

  return Math.max(durationSeconds, textEstimateSeconds);
}

async function enforceStoryAccess(request, body) {
  const context = await getAccountContext(request);
  const duration = getRequestedDuration(body);
  const storiesUsed = Number(context.usage?.stories_created || 0);
  const audioCredits = Number(context.profile?.audio_story_credits || 0);

  if (duration > context.plan.maxDuration) {
    throw new ApiError(
      403,
      `${context.plan.label} includes stories up to ${context.plan.maxDuration} minutes.`
    );
  }

  if (body.audioNarration && !context.plan.canUseAudio) {
    if (audioCredits <= 0) {
      throw new ApiError(403, "Audio narration is included with DreamScapes Plus.");
    }

    if (duration * 60 > AUDIO_CREDIT_MAX_SECONDS) {
      throw new ApiError(
        403,
        "Redeemed audio credits can be used on stories up to 10 minutes. Choose a shorter story or upgrade to DreamScapes Plus."
      );
    }
  }

  if (storiesUsed >= context.plan.monthlyStories) {
    throw new ApiError(
      429,
      `${context.plan.label} has reached its ${context.plan.monthlyStories} story monthly limit.`
    );
  }

  return context;
}

async function enforceNarrationAccess(request, body) {
  const context = await getAccountContext(request);
  const requestedSeconds = getNarrationChargeSeconds(body);
  const usedSeconds = Number(context.usage?.audio_seconds_used || 0);
  const limitSeconds = context.plan.audioMinutes * 60;
  const audioCredits = Number(context.profile?.audio_story_credits || 0);
  const canUsePlanAudio =
    context.plan.canUseAudio && limitSeconds > 0 && usedSeconds + requestedSeconds <= limitSeconds;

  if (canUsePlanAudio) {
    return { ...context, requestedAudioSeconds: requestedSeconds };
  }

  if (audioCredits > 0 && requestedSeconds <= AUDIO_CREDIT_MAX_SECONDS) {
    return { ...context, requestedAudioSeconds: requestedSeconds, useAudioCredit: true };
  }

  if (audioCredits > 0 && requestedSeconds > AUDIO_CREDIT_MAX_SECONDS) {
    throw new ApiError(
      403,
      "Redeemed audio credits can be used on stories up to 10 minutes. Choose a shorter story or upgrade to DreamScapes Plus."
    );
  }

  if (!context.plan.canUseAudio) {
    throw new ApiError(403, "Audio narration is included with DreamScapes Plus.");
  }

  if (limitSeconds <= 0 || usedSeconds + requestedSeconds > limitSeconds) {
    throw new ApiError(429, `${context.plan.label} has reached its monthly audio minute limit.`);
  }

  return { ...context, requestedAudioSeconds: requestedSeconds };
}

async function incrementUsage(context, { stories = 0, audioSeconds = 0 } = {}) {
  if (audioSeconds > 0 && context.useAudioCredit) {
    const currentCredits = Math.max(0, Number(context.profile?.audio_story_credits || 0));
    const nextCredits = Math.max(0, currentCredits - 1);
    const updatedProfiles = await supabaseServiceRequest(`/rest/v1/profiles?id=eq.${context.user.id}&select=*`, {
      method: "PATCH",
      prefer: "return=representation",
      body: {
        audio_story_credits: nextCredits,
      },
    });

    context.profile = updatedProfiles?.[0] || { ...context.profile, audio_story_credits: nextCredits };
    return context.usage;
  }

  if (!context?.usage?.id) return context?.usage || null;

  const nextUsage = {
    stories_created: Number(context.usage.stories_created || 0) + stories,
    audio_seconds_used: Number(context.usage.audio_seconds_used || 0) + audioSeconds,
  };
  const updated = await supabaseRequest(`/rest/v1/usage_months?id=eq.${context.usage.id}&select=*`, {
    token: context.token,
    method: "PATCH",
    prefer: "return=representation",
    body: nextUsage,
  });

  context.usage = updated?.[0] || { ...context.usage, ...nextUsage };
  return context.usage;
}

function sendApiError(response, error, fallback = "Request failed") {
  const status = error instanceof ApiError ? error.status : 500;
  return response.status(status).json({
    error: fallback,
    detail: error.message || fallback,
  });
}

module.exports = {
  enforceNarrationAccess,
  enforceStoryAccess,
  getAccountContext,
  getPlan,
  getNarrationChargeSeconds,
  incrementUsage,
  sendApiError,
  supabaseServiceRequest,
  supabaseRequest,
};
