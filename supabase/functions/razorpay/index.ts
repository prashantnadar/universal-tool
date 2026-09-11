import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function verifySignature(orderId: string, paymentId: string, signature: string) {
  if (!RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay secret is not configured");
  }

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(RAZORPAY_KEY_SECRET),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${orderId}|${paymentId}`),
  );

  const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return generatedSignature === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return jsonResponse(
      {
        error: "Razorpay server configuration is missing",
      },
      500,
    );
  }

  try {
    const body = await req.json();

    const action = body?.action;

    /*
     * ------------------------------------------------------------
     * CREATE ORDER
     * ------------------------------------------------------------
     *
     * Pro Lifetime test:
     * ₹2 = 200 paise
     */
    if (action === "create_order") {
      const plan = body?.plan;

      if (plan !== "pro_lifetime") {
        return jsonResponse(
          {
            error: "Invalid order plan",
          },
          400,
        );
      }

      const amount = 200;
      const currency = "INR";

      const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

      const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency,
          receipt: `ut_pro_${Date.now()}`,
          notes: {
            product: "UniversalTools",
            plan: "Pro Lifetime",
            environment: "test",
          },
        }),
      });

      const razorpayData = await razorpayResponse.json();

      if (!razorpayResponse.ok) {
        console.error("Razorpay order creation failed:", razorpayData);

        return jsonResponse(
          {
            error: razorpayData?.error?.description || "Unable to create Razorpay order",
          },
          400,
        );
      }

      return jsonResponse({
        success: true,
        type: "order",
        plan: "pro_lifetime",
        order: {
          id: razorpayData.id,
          amount: razorpayData.amount,
          currency: razorpayData.currency,
        },
        keyId: RAZORPAY_KEY_ID,
      });
    }

    /*
     * ------------------------------------------------------------
     * CREATE PREMIUM SUBSCRIPTION
     * ------------------------------------------------------------
     *
     * Premium test price:
     * ₹1/month
     *
     * NOTE:
     * Razorpay subscriptions require a Razorpay Plan ID.
     * We will add the actual plan ID after creating the plan
     * inside Razorpay Dashboard.
     */
    if (action === "create_subscription") {
      const plan = body?.plan;

      if (plan !== "premium_monthly") {
        return jsonResponse(
          {
            error: "Invalid subscription plan",
          },
          400,
        );
      }

      const razorpayPlanId = Deno.env.get("RAZORPAY_PREMIUM_PLAN_ID");

      if (!razorpayPlanId) {
        return jsonResponse(
          {
            error:
              "Premium subscription plan is not configured yet. Create the Razorpay ₹1 monthly plan and add its Plan ID as RAZORPAY_PREMIUM_PLAN_ID.",
          },
          500,
        );
      }

      const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

      const razorpayResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: razorpayPlanId,
          total_count: 12,
          customer_notify: 1,
          notes: {
            product: "UniversalTools",
            plan: "Premium Monthly",
            environment: "test",
          },
        }),
      });

      const razorpayData = await razorpayResponse.json();

      if (!razorpayResponse.ok) {
        console.error("Razorpay subscription creation failed:", razorpayData);

        return jsonResponse(
          {
            error: razorpayData?.error?.description || "Unable to create Razorpay subscription",
          },
          400,
        );
      }

      return jsonResponse({
        success: true,
        type: "subscription",
        plan: "premium_monthly",
        subscription: {
          id: razorpayData.id,
          status: razorpayData.status,
        },
        keyId: RAZORPAY_KEY_ID,
      });
    }

    /*
     * ------------------------------------------------------------
     * VERIFY PRO PAYMENT
     * ------------------------------------------------------------
     */
    if (action === "verify_payment") {
      const { plan, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

      if (plan !== "pro_lifetime") {
        return jsonResponse(
          {
            error: "Invalid payment plan",
          },
          400,
        );
      }

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return jsonResponse(
          {
            error: "Missing payment verification details",
          },
          400,
        );
      }

      const isValid = await verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      );

      if (!isValid) {
        return jsonResponse(
          {
            success: false,
            verified: false,
            error: "Payment signature verification failed",
          },
          400,
        );
      }

      /*
       * IMPORTANT:
       * At this point the payment signature is valid.
       *
       * We will connect this to the user's Supabase profile/
       * subscription record after the Checkout flow is working.
       */

      return jsonResponse({
        success: true,
        verified: true,
        plan: "pro_lifetime",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
    }

    return jsonResponse(
      {
        error: "Invalid action",
      },
      400,
    );
  } catch (error) {
    console.error("Razorpay function error:", error);

    return jsonResponse(
      {
        error: "Something went wrong with the Razorpay request",
      },
      500,
    );
  }
});
