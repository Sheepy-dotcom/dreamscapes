const SUPABASE_URL = process.env.SUPABASE_URL || "https://khgzzrixhetaontmdhez.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

const entitlementPlanMap = {
  dreamscapes_premier: "premier",
  premier: "premier",
  dreamscapes_plus: "plus",
  plus: "plus",
};

const productPlanMap = {
  dreamscapes_premier_monthly: "premier",
  dreamscapes_plus_monthly: "plus",
};

const paidPlanRank = {
  free: 0,
  premier: 1,
  plus: 2,
};

function getAuthHeader(request) {
  return request.headers.authorization || request.headers.Authorization || "";
}

function isAuthorized(request) {
  if (!WEBHOOK_SECRET) return false;

  const header = getAuthHeader(request);
  return header === WEBHOOK_SECRET || header === `Bearer ${WEBHOOK_SECRET}`;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function getBestPlan(plans) {
  return plans.sort((left, right) => paidPlanRank[right] - paidPlanRank[left])[0] || "free";
}

function getPlanFromEvent(event) {
  const entitlementPlans = (event.entitlement_ids || [])
    .map((id) => entitlementPlanMap[id])
    .filter(Boolean);

  if (entitlementPlans.length > 0) return getBestPlan(entitlementPlans);

  const productId = String(event.product_id || "").split(":")[0];
  return productPlanMap[productId] || "free";
}

function isEntitlementActive(event) {
  if (event.type === "EXPIRATION") return false;

  const expiresAt = Number(event.expiration_at_ms || 0);
  if (!expiresAt) return true;

  return expiresAt > Date.now();
}

async function updateUserPlan(userId, plan) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ plan }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not update Supabase profile plan");
  }

  return response.json();
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  if (!SERVICE_ROLE_KEY || !WEBHOOK_SECRET) {
    return response.status(501).json({
      error: "RevenueCat webhook is not configured",
      detail: "Set SUPABASE_SERVICE_ROLE_KEY and REVENUECAT_WEBHOOK_SECRET in Vercel.",
    });
  }

  if (!isAuthorized(request)) {
    return response.status(401).json({ error: "Unauthorized webhook" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const event = body.event || body;
    const userId = event.app_user_id;

    if (!userId) {
      return response.status(400).json({ error: "RevenueCat event missing app_user_id" });
    }

    if (!isUuid(userId)) {
      return response.status(202).json({
        received: true,
        ignored: true,
        reason: "RevenueCat app_user_id is not a Supabase user ID.",
      });
    }

    const plan = isEntitlementActive(event) ? getPlanFromEvent(event) : "free";
    const profile = await updateUserPlan(userId, plan);

    return response.status(200).json({
      received: true,
      appUserId: userId,
      plan,
      eventType: event.type || "unknown",
      profile: profile?.[0] || null,
    });
  } catch (error) {
    return response.status(500).json({
      error: "Could not process RevenueCat webhook",
      detail: error.message,
    });
  }
};
