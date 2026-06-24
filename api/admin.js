const {
  getAccountContext,
  sendApiError,
  supabaseServiceRequest,
} = require("./auth");

const DEFAULT_ADMIN_EMAILS = "shaunrussett@gmail.com";

function getAdminEmails() {
  return String(process.env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAILS)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email) {
  return getAdminEmails().includes(String(email || "").trim().toLowerCase());
}

function getCurrentMonthKey() {
  const date = new Date();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function safeServiceRequest(path, tableErrors, label) {
  try {
    return await supabaseServiceRequest(path);
  } catch (error) {
    tableErrors.push({ label, message: error.message || "Could not load table" });
    return [];
  }
}

async function safeServiceRequestWithFallback(primaryPath, fallbackPath, tableErrors, label) {
  try {
    return await supabaseServiceRequest(primaryPath);
  } catch (primaryError) {
    try {
      return await supabaseServiceRequest(fallbackPath);
    } catch (fallbackError) {
      tableErrors.push({
        label,
        message: fallbackError.message || primaryError.message || "Could not load table",
      });
      return [];
    }
  }
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item?.[key] || "unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function sumBy(items, key) {
  return items.reduce((total, item) => total + Number(item?.[key] || 0), 0);
}

async function getVerifiedAdminAccount(request) {
  const account = await getAccountContext(request);
  const email = account.user?.email || account.profile?.email || "";

  if (!isAdminEmail(email)) {
    return { account, email, allowed: false };
  }

  return { account, email, allowed: true };
}

async function addAudioCreditsToProfile(body) {
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const credits = Math.max(0, Math.min(100, Math.floor(Number(body.credits || body.audioStoryCredits || 0))));

  if (!email) {
    return { status: 400, body: { error: "Enter the user's email address." } };
  }

  if (!credits) {
    return { status: 400, body: { error: "Enter at least 1 audio credit." } };
  }

  const matches = await supabaseServiceRequest(
    `/rest/v1/profiles?email=ilike.${encodeURIComponent(email)}&select=id,email,plan,audio_story_credits&limit=2`
  );
  const profile = matches?.[0];

  if (!profile) {
    return { status: 404, body: { error: "No DreamScapes profile was found for that email." } };
  }

  const previousCredits = Math.max(0, Number(profile.audio_story_credits || 0));
  const nextCredits = previousCredits + credits;
  const updated = await supabaseServiceRequest(`/rest/v1/profiles?id=eq.${profile.id}&select=*`, {
    method: "PATCH",
    prefer: "return=representation",
    body: {
      audio_story_credits: nextCredits,
    },
  });

  return {
    status: 200,
    body: {
      ok: true,
      profile: updated?.[0] || { ...profile, audio_story_credits: nextCredits },
      creditsAdded: credits,
      previousCredits,
      nextCredits,
      message: `${credits} audio ${credits === 1 ? "credit has" : "credits have"} been added to ${profile.email || email}.`,
    },
  };
}

module.exports = async function handler(request, response) {
  if (!["GET", "POST"].includes(request.method)) {
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const admin = await getVerifiedAdminAccount(request);

    if (!admin.allowed) {
      return response.status(403).json({ error: "Admin access is not enabled for this account." });
    }

    if (request.method === "POST") {
      const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
      if (body.action !== "addAudioCredits") {
        return response.status(400).json({ error: "Unknown admin action." });
      }

      const result = await addAudioCreditsToProfile(body);
      return response.status(result.status).json(result.body);
    }

    const tableErrors = [];
    const currentMonth = getCurrentMonthKey();
    const [profiles, stories, usageRows, audioIssues, feedbackReports, redeemCodes, redemptions] =
      await Promise.all([
        safeServiceRequest(
          "/rest/v1/profiles?select=id,email,plan,audio_story_credits,created_at,updated_at&order=created_at.desc&limit=500",
          tableErrors,
          "profiles"
        ),
        safeServiceRequestWithFallback(
          "/rest/v1/stories?select=id,user_id,title,child_name,duration_minutes,word_count,plan,audio_requested,audio_duration_seconds,created_at&order=created_at.desc&limit=500",
          "/rest/v1/stories?select=id,user_id,title,child_name,duration_minutes,plan,audio_requested,audio_duration_seconds,created_at&order=created_at.desc&limit=500",
          tableErrors,
          "stories"
        ),
        safeServiceRequest(
          "/rest/v1/usage_months?select=id,user_id,month_key,stories_created,audio_seconds_used,updated_at&order=updated_at.desc&limit=500",
          tableErrors,
          "usage"
        ),
        safeServiceRequest(
          "/rest/v1/audio_issue_reports?select=id,user_id,story_title,voice_style,duration_minutes,audio_duration_seconds,source,message,status,created_at&order=created_at.desc&limit=50",
          tableErrors,
          "audio issues"
        ),
        safeServiceRequest(
          "/rest/v1/feedback_reports?select=id,user_id,user_email,category,message,app_screen,story_title,status,created_at&order=created_at.desc&limit=50",
          tableErrors,
          "feedback"
        ),
        safeServiceRequest(
          "/rest/v1/redeem_codes?select=code,description,active,audio_story_credits,times_redeemed,max_redemptions,expires_at,created_at&order=created_at.desc&limit=50",
          tableErrors,
          "redeem codes"
        ),
        safeServiceRequestWithFallback(
          "/rest/v1/redeem_code_redemptions?select=id,redeem_code,user_id,user_email,audio_story_credits,created_at&order=created_at.desc&limit=80",
          "/rest/v1/redeem_code_redemptions?select=id,user_id,audio_story_credits&limit=80",
          tableErrors,
          "redemptions"
        ),
      ]);

    const currentUsage = usageRows.filter((row) => row.month_key === currentMonth);
    const recentAudioStories = stories.filter((story) => story.audio_requested || Number(story.audio_duration_seconds || 0) > 0);

    return response.status(200).json({
      ok: true,
      adminEmail: admin.email,
      generatedAt: new Date().toISOString(),
      currentMonth,
      summary: {
        users: profiles.length,
        plans: countBy(profiles, "plan"),
        stories: stories.length,
        audioStories: recentAudioStories.length,
        storiesThisMonth: sumBy(currentUsage, "stories_created"),
        audioSecondsThisMonth: sumBy(currentUsage, "audio_seconds_used"),
        openAudioIssues: audioIssues.filter((issue) => issue.status === "open").length,
        openFeedback: feedbackReports.filter((report) => report.status === "open").length,
        redeemedCredits: sumBy(redemptions, "audio_story_credits"),
      },
      tables: {
        profiles: profiles.slice(0, 40),
        stories: stories.slice(0, 40),
        usage: usageRows.slice(0, 60),
        audioIssues,
        feedbackReports,
        redeemCodes,
        redemptions,
      },
      tableErrors,
    });
  } catch (error) {
    return sendApiError(response, error, "Could not load admin dashboard");
  }
};
