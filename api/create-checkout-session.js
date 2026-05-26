const STRIPE_CHECKOUT_URL = "https://api.stripe.com/v1/checkout/sessions";

const planPrices = {
  premier: process.env.STRIPE_PREMIER_PRICE_ID,
  plus: process.env.STRIPE_PLUS_PRICE_ID,
};

function getOrigin(request) {
  const forwardedHost = request.headers["x-forwarded-host"];
  const forwardedProto = request.headers["x-forwarded-proto"] || "https";
  const host = forwardedHost || request.headers.host;

  return process.env.SITE_URL || `${forwardedProto}://${host}`;
}

async function createCheckoutSession({ plan, origin }) {
  const price = planPrices[plan];

  if (!price) {
    throw new Error(`Missing Stripe price ID for ${plan}`);
  }

  const params = new URLSearchParams({
    mode: "subscription",
    success_url: `${origin}/?checkout=success&plan=${plan}`,
    cancel_url: `${origin}/?checkout=cancelled&plan=${plan}`,
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    "metadata[plan]": plan,
    allow_promotion_codes: "true",
  });

  const response = await fetch(STRIPE_CHECKOUT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Stripe checkout failed");
  }

  return data;
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return response.status(501).json({ error: "Stripe is not configured yet" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const plan = body.plan === "plus" ? "plus" : body.plan === "premier" ? "premier" : "";

    if (!plan) return response.status(400).json({ error: "Paid plan is required" });

    const session = await createCheckoutSession({
      plan,
      origin: getOrigin(request),
    });

    return response.status(200).json({
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    return response.status(500).json({
      error: "Could not start checkout",
      detail: error.message,
    });
  }
};
