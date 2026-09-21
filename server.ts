import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Razorpay from "razorpay";
import crypto from "crypto";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin safely
if (getApps().length === 0) {
  try {
    initializeApp();
  } catch (err) {
    console.error("Firebase Admin initialization failed. Continuing without it...", err);
  }
}

export const app = express();
const PORT = 3000;

// Lazy Firestore initialization
let firestoreInstance: any = null;
function getFirestoreInstance() {
  if (!firestoreInstance) {
    try {
      firestoreInstance = getFirestore();
    } catch (err) {
      console.error("Firestore initialization failed:", err);
      return null;
    }
  }
  return firestoreInstance;
}

// Lazy Razorpay initialization to prevent startup crash if keys are missing
let razorpayInstance: Razorpay | null = null;
function getRazorpay() {
  if (!razorpayInstance) {
    const key_id = process.env.VITE_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!key_id || !key_secret) {
      console.warn("Razorpay keys are missing in environment variables. Payment features will fail.");
      return null;
    }
    
    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
  }
  return razorpayInstance;
}

// Map to cache plan IDs
const planCache: Record<string, string> = {
  monthly: process.env.RAZORPAY_MONTHLY_PLAN_ID || '',
  yearly: process.env.RAZORPAY_YEARLY_PLAN_ID || '',
};

async function getOrCreatePlan(type: 'monthly' | 'yearly') {
  if (planCache[type]) return planCache[type];

  const rzp = getRazorpay();
  if (!rzp) throw new Error("Razorpay not configured");

  console.log(`Razorpay: Searching for ${type} plan...`);
  try {
    const plans = await rzp.plans.all();
    const existing = plans.items.find(p => p.item.name === `Digital Heroes ${type === 'monthly' ? 'Monthly' : 'Yearly'} Membership`);
    if (existing) {
      planCache[type] = existing.id;
      return existing.id;
    }
  } catch (err) {
    console.error("Error fetching plans:", err);
  }

  console.log(`Razorpay: Creating new ${type} plan...`);
  const plan = await rzp.plans.create({
    period: type === 'monthly' ? 'monthly' : 'yearly',
    interval: 1,
    item: {
      name: `Digital Heroes ${type === 'monthly' ? 'Monthly' : 'Yearly'} Membership`,
      amount: (type === 'monthly' ? 29 : 290) * 100, // in paise/cents
      currency: "INR", // Razorpay test mode usually defaults to INR
      description: `Access to Digital Heroes score tracking and prize draws (${type})`,
    },
  });
  
  planCache[type] = plan.id;
  return plan.id;
}

app.use(express.json());

// API: Create Subscription
app.post("/api/subscriptions/create", async (req, res) => {
  const { plan, userId } = req.body;
  if (!plan || !userId) return res.status(400).json({ error: "Missing fields" });

  const rzp = getRazorpay();
  if (!rzp) return res.status(500).json({ error: "Razorpay not configured on server" });

  try {
    const planId = await getOrCreatePlan(plan as 'monthly' | 'yearly');
    
    const subscription = await rzp.subscriptions.create({
      plan_id: planId,
      total_count: plan === 'monthly' ? 60 : 10, // 5 years max roughly
      customer_notify: 1,
      notes: { 
        userId, 
        plan,
        env: 'test'
      },
    });

    res.json({ 
      subscriptionId: subscription.id,
      keyId: process.env.VITE_RAZORPAY_KEY_ID 
    });
  } catch (err: any) {
    console.error("Razorpay Sub Creation Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// API: Cancel Subscription
app.post("/api/subscriptions/cancel", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const rzp = getRazorpay();
  if (!rzp) return res.status(500).json({ error: "Razorpay not configured on server" });

  try {
    const firestore = getFirestoreInstance();
    if (!firestore) return res.status(500).json({ error: "Firestore not available on server" });

    const subDoc = await firestore.collection("subscriptions").doc(userId).get();
    if (!subDoc.exists) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const subData = subDoc.data();
    const subscriptionId = subData?.id;

    if (subData?.provider === 'razorpay' && subscriptionId) {
      await rzp.subscriptions.cancel(subscriptionId, false); // false = immediate
      
      // We could wait for webhook, but let's update immediately for better UX
      const firestore = getFirestoreInstance();
      if (!firestore) return res.status(500).json({ error: "Firestore not available" });

      const now = new Date().toISOString();
      await firestore.collection("subscriptions").doc(userId).update({
        status: 'cancelled',
        cancelledAt: now,
        updatedAt: now
      });

      await firestore.collection("users").doc(userId).update({
        subscriptionStatus: 'cancelled',
        updatedAt: now
      });

      res.json({ 
        success: true, 
        message: "Subscription cancelled successfully",
        subscription: { ...subData, status: 'cancelled', cancelledAt: now }
      });
    } else {
      // Fallback for demo/legacy
      const now = new Date().toISOString();
      const firestore = getFirestoreInstance();
      if (!firestore) return res.status(500).json({ error: "Firestore not available" });

      await firestore.collection("subscriptions").doc(userId).update({
        status: 'cancelled',
        cancelledAt: now,
        updatedAt: now
      });
      await firestore.collection("users").doc(userId).update({
        subscriptionStatus: 'cancelled',
        updatedAt: now
      });
      res.json({ success: true, message: "Legacy subscription cancelled" });
    }
  } catch (err: any) {
    console.error("Razorpay Sub Cancel Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook
app.post("/api/webhooks/razorpay", async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  const signature = req.headers["x-razorpay-signature"] as string;
  
  if (secret) {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Razorpay Webhook: Invalid signature");
      return res.status(400).send("Invalid signature");
    }
  }

  const event = req.body.event;
  const payload = req.body.payload;

  console.log(`Razorpay Webhook Received: ${event}`);

  try {
    const firestore = getFirestoreInstance();
    if (!firestore) {
      console.error("Razorpay Webhook: Firestore not available");
      return res.status(500).send("Firestore not available");
    }

    if (event === "subscription.activated" || event === "subscription.charged") {
      const sub = payload.subscription.entity;
      const { userId, plan } = sub.notes;
      
      if (userId) {
        const now = new Date().toISOString();
        const renewalDate = new Date(sub.current_end * 1000).toISOString();
        
        console.log(`Activating subscription for user ${userId}, plan ${plan}`);

        await firestore.collection("subscriptions").doc(userId).set({
          id: sub.id,
          userId,
          plan,
          provider: 'razorpay',
          status: 'active',
          startedAt: now,
          renewalDate,
          updatedAt: now
        }, { merge: true });

        await firestore.collection("users").doc(userId).update({
          subscriptionStatus: 'active',
          subscriptionPlan: plan,
          subscriptionRenewalDate: renewalDate,
          subscriptionProvider: 'razorpay',
          updatedAt: now
        });
      }
    } else if (event === "subscription.cancelled" || event === "subscription.halted" || event === "subscription.expired") {
      const sub = payload.subscription.entity;
      const { userId } = sub.notes;
      
      if (userId) {
        const status = (event === "subscription.cancelled" || event === "subscription.expired") ? 'cancelled' : 'failed';
        console.log(`Updating subscription for user ${userId} to ${status}`);

        await firestore.collection("subscriptions").doc(userId).update({
          status: status,
          updatedAt: new Date().toISOString()
        });

        await firestore.collection("users").doc(userId).update({
          subscriptionStatus: status === 'cancelled' ? 'cancelled' : 'inactive',
          updatedAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error("Error processing webhook:", err);
    return res.status(500).send("Webhook processing failed");
  }

  res.send("ok");
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the server if this file is run directly (not as a module on Vercel)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

export default app;
