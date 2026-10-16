const {
  getAccountContext,
  handleCorsPreflight,
  sendApiError,
  supabaseServiceRequest,
} = require("../lib/auth");

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

/* A second, narrower list: these addresses may top up a parent's audio credits
   and nothing else. The dashboard is every user's email, every story title and
   every piece of feedback, which is more than someone needs in order to fix an
   audio problem for one family.

   Anyone on the full ADMIN_EMAILS list can do this too, so an address only
   needs to be in one of the two. */
function getCreditOnlyEmails() {
  return String(process.env.CREDIT_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isCreditOnlyEmail(email) {
  return getCreditOnlyEmails().includes(String(email || "").trim().toLowerCase());
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

async function safeServiceRpc(path, body, tableErrors, label) {
  try {
    return await supabaseServiceRequest(path, { method: "POST", body });
  } catch (error) {
    tableErrors.push({ label, message: error.message || "Could not load analytics" });
    return [];
  }
}

// The question the free-story work was a bet on: how many strangers who read a
// story go on to make an account.
function buildPreviewFunnel(eventCounts) {
  const visits = (name) => Number(eventCounts.find((row) => row.name === name)?.visits || 0);
  const generated = visits("preview_story_generated");
  const chose = visits("preview_account_create_selected") + visits("preview_account_signin_selected");
  const claimed = visits("preview_story_claimed");
  const rate = (part) => (generated ? Math.round((part / generated) * 1000) / 10 : 0);

  return {
    generated,
    limitReached: visits("preview_limit_reached"),
    failed: visits("preview_story_failed"),
    choseAccount: chose,
    claimed,
    chosePercent: rate(chose),
    claimedPercent: rate(claimed),
  };
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

  if (isAdminEmail(email)) {
    return { account, email, allowed: true, canSeeDashboard: true };
  }

  if (isCreditOnlyEmail(email)) {
    return { account, email, allowed: true, canSeeDashboard: false };
  }

  return { account, email, allowed: false, canSeeDashboard: false };
}

/* Credits are given out by hand when something has gone wrong for a family, so
   they have to be takeable back by hand too - a typo that grants 50 instead of
   5 was previously only fixable in the database. Removing floors at zero rather
   than erroring, because the intent of "remove 10" from a balance of 3 is
   plainly to clear it. */
async function changeAudioCreditsOnProfile(body, direction) {
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
  const nextCredits =
    direction === "remove" ? Math.max(0, previousCredits - credits) : previousCredits + credits;
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
      creditsChanged: credits,
      direction,
      previousCredits,
      nextCredits,
      // The resulting balance is the thing worth confirming: it is what the
      // parent will actually have, and it is how a floored removal explains
      // itself without an error.
      message:
        direction === "remove"
          ? `${profile.email || email} now has ${nextCredits} audio ${nextCredits === 1 ? "credit" : "credits"}.`
          : `${credits} audio ${credits === 1 ? "credit has" : "credits have"} been added to ${profile.email || email}. They now have ${nextCredits}.`,
    },
  };
}

module.exports = async function handler(request, response) {
  if (handleCorsPreflight(request, response, "GET, POST, OPTIONS")) return;

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
      const directions = { addAudioCredits: "add", removeAudioCredits: "remove" };
      const direction = directions[body.action];
      if (!direction) {
        return response.status(400).json({ error: "Unknown admin action." });
      }

      const result = await changeAudioCreditsOnProfile(body, direction);
      return response.status(result.status).json(result.body);
    }

    /* Who is holding credits, which is the one part of the user base a
       credits-only account legitimately needs: without it they cannot tell
       whether a top-up landed, or find the balance they are about to correct.
       Only accounts that actually hold credits, and only the address and the
       number - not the plan, the stories or anything else on the row. */
    const tableErrors = [];

    const creditHolders = await safeServiceRequest(
      "/rest/v1/profiles?audio_story_credits=gt.0&select=email,audio_story_credits&order=audio_story_credits.desc&limit=200",
      tableErrors,
      "credit holders"
    );

    /* Who has just joined. Not the dashboard's user list: the address, the
       plan and when they signed up, and only the most recent few. Enough to
       welcome somebody or to put credits on a brand new account, which is the
       moment it is usually needed. */
    const recentSignups = await safeServiceRequest(
      "/rest/v1/profiles?select=email,plan,created_at&order=created_at.desc&limit=25",
      tableErrors,
      "recent signups"
    );

    if (!admin.canSeeDashboard) {
      return response.status(200).json({
        ok: true,
        adminEmail: admin.email,
        generatedAt: new Date().toISOString(),
        creditsOnly: true,
        creditHolders,
        recentSignups,
      });
    }

    const currentMonth = getCurrentMonthKey();
    const [profiles, stories, usageRows, audioIssues, feedbackReports, redeemCodes, redemptions, eventCounts, builderStepCounts] =
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
        safeServiceRpc("/rest/v1/rpc/analytics_summary", { p_days: 30 }, tableErrors, "analytics"),
        safeServiceRpc("/rest/v1/rpc/analytics_builder_steps", { p_days: 30 }, tableErrors, "builder steps"),
      ]);

    /* Neither role is stored in the database - both are lists of addresses in
       the environment - so nothing on a profile row says who can do what, and
       the only way to check used to be to ask the person to sign in and look.
       This reports it: a tag on the rows that have a role, and the configured
       addresses with whether an account exists for each yet, since an address
       can be granted access long before anybody signs up on it. */
    const roleFor = (email) => {
      if (isAdminEmail(email)) return "admin";
      if (isCreditOnlyEmail(email)) return "credits";
      return null;
    };

    const knownEmails = new Set(
      profiles.map((profile) => String(profile.email || "").trim().toLowerCase()).filter(Boolean)
    );
    const access = [
      ...getAdminEmails().map((email) => ({ email, role: "admin" })),
      ...getCreditOnlyEmails().map((email) => ({ email, role: "credits" })),
    ].map((row) => ({ ...row, hasAccount: knownEmails.has(row.email) }));

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
      access,
      creditHolders,
      previewFunnel: buildPreviewFunnel(Array.isArray(eventCounts) ? eventCounts : []),
      analytics: {
        windowDays: 30,
        events: Array.isArray(eventCounts) ? eventCounts.slice(0, 40) : [],
        builderSteps: Array.isArray(builderStepCounts) ? builderStepCounts : [],
      },
      tables: {
        profiles: profiles.slice(0, 40).map((profile) => ({ ...profile, role: roleFor(profile.email) })),
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
