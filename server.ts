import express from "express";
import path from "path";
import Razorpay from "razorpay";
import crypto from "crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Initialize Cloudinary
function ensureCloudinaryConfig() {
  const cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const api_key = (process.env.CLOUDINARY_API_KEY || "").trim();
  const api_secret = (process.env.CLOUDINARY_API_SECRET || "").trim();

  if (cloud_name && api_key && api_secret) {
    cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
      secure: true,
    });
    return true;
  }
  return false;
}

ensureCloudinaryConfig();

// Configure Multer (memory storage for easy Cloudinary upload)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Project constants
const DEFAULT_FIREBASE_PROJECT_ID = "digital-heroes-af8a9";

// Diagnostic and Firebase Admin app holder
let adminApp: any = null;
let firestoreInstance: any = null;
let lastAdminInitError: { message: string; code?: string; details?: string } | null = null;

// Helper function to safely format and clean the PEM private key
function formatPrivateKey(key: string): string {
  let cleaned = key.trim();
  
  // Safely remove surrounding double or single quotes if present (e.g. from env file copy-paste)
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  // Convert literal string escaped newlines "\n" or "\\n" to real newline characters
  cleaned = cleaned.replace(/\\n/g, '\n');

  return cleaned;
}

// Initialize Firebase Admin safely with support for Service Account credentials
function initFirebaseAdmin() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID).trim();
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const rawClientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  const hasPrivateKey = Boolean(rawPrivateKey && rawPrivateKey.trim());
  const hasClientEmail = Boolean(rawClientEmail && rawClientEmail.trim());

  // Safe diagnostics (never log private keys or secrets)
  console.log(`[Firebase Admin Diagnostics] credential source: split environment variables | projectId: ${projectId} | hasPrivateKey: ${hasPrivateKey} | hasClientEmail: ${hasClientEmail}`);

  try {
    // 1. Primary path: Split credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
    if (hasPrivateKey && hasClientEmail) {
      const clientEmail = rawClientEmail!.trim();
      const rawKey = rawPrivateKey!;
      const normalizedPrivateKey = formatPrivateKey(rawKey);

      // Safe diagnostic logging (reports ONLY structural metadata, NEVER key contents)
      const rawTrimmed = rawKey.trim();
      const normTrimmed = normalizedPrivateKey.trim();

      const diagnostics = {
        privateKeyLength: rawKey.length,
        startsWithBeginPrivateKey: rawTrimmed.startsWith("-----BEGIN PRIVATE KEY-----"),
        endsWithEndPrivateKey: rawTrimmed.endsWith("-----END PRIVATE KEY-----"),
        containsLiteralBackslashN: rawKey.includes("\\n"),
        containsActualNewline: rawKey.includes("\n"),
        normalizedPrivateKeyLength: normalizedPrivateKey.length,
        normalizedStartsWithBeginPrivateKey: normTrimmed.startsWith("-----BEGIN PRIVATE KEY-----"),
        normalizedEndsWithEndPrivateKey: normTrimmed.endsWith("-----END PRIVATE KEY-----"),
      };

      console.log(`[Firebase Admin Diagnostics] Key Analysis:`, JSON.stringify(diagnostics));

      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: normalizedPrivateKey,
        }),
        projectId,
      });

      console.log(`[Firebase Admin] Successfully initialized Firebase Admin app via split environment variables for project: ${projectId}`);
      lastAdminInitError = null;
      return adminApp;
    }

    // 2. Fallback only in local dev environment when credentials are not configured
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
      console.log(`[Firebase Admin] Local development fallback: Initializing with project ID only: ${projectId}`);
      adminApp = initializeApp({
        projectId,
      });
      lastAdminInitError = null;
      return adminApp;
    }

    // In production / Vercel, do NOT fall back to applicationDefault()
    throw new Error(
      `Firebase Admin credentials missing in production. Missing: ${[!hasPrivateKey ? 'FIREBASE_PRIVATE_KEY' : '', !hasClientEmail ? 'FIREBASE_CLIENT_EMAIL' : ''].filter(Boolean).join(', ')}`
    );
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    const errCode = err?.code || err?.errorInfo?.code;
    lastAdminInitError = {
      message: errMsg,
      code: errCode,
    };
    console.error(`[Firebase Admin] Initialization failed - code: ${errCode || 'N/A'}, error: ${errMsg}`);
    throw err;
  }
}

// Initial initialization attempt
try {
  initFirebaseAdmin();
} catch (e: any) {
  console.warn(`[Firebase Admin] Eager initialization note: ${e?.message || e}`);
}

export const app = express();
const PORT = 3000;

// Lazy Firestore initialization
function getFirestoreInstance() {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  try {
    const existingApps = getApps();
    const currentApp = existingApps.length > 0 ? existingApps[0] : initFirebaseAdmin();

    if (!currentApp) {
      const errDetail = lastAdminInitError?.message || "No initialized Firebase Admin app";
      throw new Error(`Firestore unavailable: ${errDetail}`);
    }

    firestoreInstance = getFirestore(currentApp);
    return firestoreInstance;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    const errCode = err?.code || err?.errorInfo?.code;
    lastAdminInitError = { message: errMsg, code: errCode };
    console.error(`[Firebase Admin] Firestore instance acquisition failed: ${errMsg}`);
    return null;
  }
}

// Lazy Razorpay initialization to prevent startup crash if keys are missing
let razorpayInstance: Razorpay | null = null;
function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!key_id || !key_secret) {
    const missing: string[] = [];
    if (!key_id) missing.push("RAZORPAY_KEY_ID (or VITE_RAZORPAY_KEY_ID)");
    if (!key_secret) missing.push("RAZORPAY_KEY_SECRET");
    console.error(`Razorpay configuration error: Missing environment variables [${missing.join(", ")}]`);
    return null;
  }
  
  if (!razorpayInstance) {
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
  const envPlanId = type === 'monthly' ? process.env.RAZORPAY_MONTHLY_PLAN_ID : process.env.RAZORPAY_YEARLY_PLAN_ID;
  if (envPlanId && envPlanId.trim()) {
    return envPlanId.trim();
  }

  if (planCache[type]) return planCache[type];

  const rzp = getRazorpay();
  if (!rzp) throw new Error("Razorpay not configured on server (missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET)");

  console.log(`Razorpay: Searching for existing ${type} plan...`);
  try {
    const plans = await rzp.plans.all();
    if (plans && Array.isArray(plans.items)) {
      const targetName = `Digital Heroes ${type === 'monthly' ? 'Monthly' : 'Yearly'} Membership`;
      const existing = plans.items.find(
        (p: any) => p.item?.name === targetName || (p.item?.amount === (type === 'monthly' ? 2900 : 29000) && p.period === (type === 'monthly' ? 'monthly' : 'yearly'))
      );
      if (existing) {
        console.log(`Razorpay: Found existing ${type} plan with ID ${existing.id}`);
        planCache[type] = existing.id;
        return existing.id;
      }
    }
  } catch (err: any) {
    const msg = err?.error?.description || err?.description || err?.message || String(err);
    console.warn(`Razorpay plan search note (${msg}), creating new plan...`);
  }

  console.log(`Razorpay: Creating new ${type} plan...`);
  const plan = await rzp.plans.create({
    period: type === 'monthly' ? 'monthly' : 'yearly',
    interval: 1,
    item: {
      name: `Digital Heroes ${type === 'monthly' ? 'Monthly' : 'Yearly'} Membership`,
      amount: (type === 'monthly' ? 29 : 290) * 100, // in paise: ₹29 -> 2900, ₹290 -> 29000
      currency: "INR",
      description: `Access to Digital Heroes score tracking and prize draws (${type})`,
    },
  });

  if (!plan || !plan.id) {
    throw new Error(`Razorpay plan creation failed: no plan ID returned.`);
  }

  console.log(`Razorpay: Created new ${type} plan with ID ${plan.id}`);
  planCache[type] = plan.id;
  return plan.id;
}

app.use(express.json());

// Helper to verify auth
async function verifyAuth(req: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const existingApps = getApps();
    const currentApp = existingApps.length > 0 ? existingApps[0] : initFirebaseAdmin();
    const authInstance = currentApp ? getAuth(currentApp) : getAuth();
    const decodedToken = await authInstance.verifyIdToken(idToken);
    return decodedToken;
  } catch (err: any) {
    console.error("Auth verification failed:", err?.message || err);
    return null;
  }
}

// API: Create Subscription
app.post("/api/subscriptions/create", async (req, res) => {
  try {
    const { plan, userId } = req.body || {};
    if (!plan || !userId) {
      return res.status(400).json({ error: "Missing required fields: plan and userId are required." });
    }

    if (plan !== 'monthly' && plan !== 'yearly') {
      return res.status(400).json({ error: `Invalid plan "${plan}". Must be "monthly" or "yearly".` });
    }

    const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      const missing: string[] = [];
      if (!key_id) missing.push("RAZORPAY_KEY_ID (or VITE_RAZORPAY_KEY_ID)");
      if (!key_secret) missing.push("RAZORPAY_KEY_SECRET");
      console.error(`Razorpay configuration error: Missing [${missing.join(", ")}]`);
      return res.status(500).json({ 
        error: `Server payment configuration error: Missing ${missing.join(", ")}. Please configure these environment variables in Vercel.` 
      });
    }

    const rzp = getRazorpay();
    if (!rzp) {
      return res.status(500).json({ error: "Razorpay initialization failed on server." });
    }

    let planId: string;
    try {
      planId = await getOrCreatePlan(plan as 'monthly' | 'yearly');
    } catch (planErr: any) {
      const planErrMsg = planErr?.error?.description || planErr?.description || planErr?.message || String(planErr);
      console.error("Razorpay Plan Error:", planErrMsg, planErr);
      return res.status(500).json({ error: `Razorpay Plan Error: ${planErrMsg}` });
    }

    const subscription = await rzp.subscriptions.create({
      plan_id: planId,
      total_count: plan === 'monthly' ? 60 : 10, // 5 years max
      customer_notify: 1,
      notes: { 
        userId, 
        plan,
        env: process.env.NODE_ENV || 'production'
      },
    });

    if (!subscription || !subscription.id) {
      throw new Error("Razorpay subscription creation returned an empty response.");
    }

    return res.status(200).json({ 
      subscriptionId: subscription.id,
      keyId: key_id 
    });
  } catch (err: any) {
    const errorDetails = err?.error?.description || err?.description || err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
    console.error("Razorpay Sub Creation Error:", errorDetails, err);
    return res.status(500).json({ error: errorDetails || "Failed to create Razorpay subscription." });
  }
});

// API: Cancel Subscription
app.post("/api/subscriptions/cancel", async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Missing required field: userId." });

    const rzp = getRazorpay();
    if (!rzp) return res.status(500).json({ error: "Razorpay not configured on server." });

    const firestore = getFirestoreInstance();
    if (!firestore) return res.status(500).json({ error: "Firestore database unavailable on server." });

    const subDoc = await firestore.collection("subscriptions").doc(userId).get();
    if (!subDoc.exists) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    const subData = subDoc.data();
    const subscriptionId = subData?.id;

    if (subData?.provider === 'razorpay' && subscriptionId) {
      try {
        await rzp.subscriptions.cancel(subscriptionId, false); // false = immediate
      } catch (cancelErr: any) {
        console.warn("Razorpay subscription cancel note:", cancelErr?.message || cancelErr);
      }
      
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

      return res.status(200).json({ 
        success: true, 
        message: "Subscription cancelled successfully",
        subscription: { ...subData, status: 'cancelled', cancelledAt: now }
      });
    } else {
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
      return res.status(200).json({ success: true, message: "Subscription cancelled successfully." });
    }
  } catch (err: any) {
    const errorDetails = err?.error?.description || err?.description || err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
    console.error("Razorpay Sub Cancel Error:", errorDetails, err);
    return res.status(500).json({ error: errorDetails || "Failed to cancel subscription." });
  }
});

// API: Webhook
app.post("/api/webhooks/razorpay", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
    const signature = req.headers["x-razorpay-signature"] as string;
    
    if (secret) {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("Razorpay Webhook: Invalid signature");
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    console.log(`Razorpay Webhook Received: ${event}`);

    const firestore = getFirestoreInstance();
    if (!firestore) {
      const errorMsg = lastAdminInitError?.message 
        ? `Firestore not available: ${lastAdminInitError.message}${lastAdminInitError.details ? ` (${lastAdminInitError.details})` : ''}`
        : "Firestore not available";
      console.error(`Razorpay Webhook: ${errorMsg}`);
      return res.status(500).json({ error: errorMsg, code: lastAdminInitError?.code });
    }

    if (event === "subscription.activated" || event === "subscription.charged") {
      const sub = payload?.subscription?.entity;
      const { userId, plan } = sub?.notes || {};
      
      if (userId) {
        const now = new Date().toISOString();
        const renewalDate = sub.current_end ? new Date(sub.current_end * 1000).toISOString() : now;
        
        console.log(`Activating subscription for user ${userId}, plan ${plan}`);

        await firestore.collection("subscriptions").doc(userId).set({
          id: sub.id,
          userId,
          plan: plan || 'monthly',
          provider: 'razorpay',
          status: 'active',
          startedAt: now,
          renewalDate,
          updatedAt: now
        }, { merge: true });

        await firestore.collection("users").doc(userId).update({
          subscriptionStatus: 'active',
          subscriptionPlan: plan || 'monthly',
          subscriptionRenewalDate: renewalDate,
          subscriptionProvider: 'razorpay',
          updatedAt: now
        });
      }
    } else if (event === "subscription.cancelled" || event === "subscription.halted" || event === "subscription.expired") {
      const sub = payload?.subscription?.entity;
      const { userId } = sub?.notes || {};
      
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

    return res.status(200).json({ status: "ok" });
  } catch (err: any) {
    const errorDetails = err?.message || String(err);
    console.error("Error processing webhook:", errorDetails, err);
    return res.status(500).json({ error: "Webhook processing failed", details: errorDetails });
  }
});

// API: Upload Winner Proof to Cloudinary
app.post("/api/proofs/upload", upload.single('proof') as any, async (req: any, res) => {
  try {
    const user = await verifyAuth(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { winnerId, notes } = req.body;
    if (!winnerId) return res.status(400).json({ error: "Missing winnerId" });

    const firestore = getFirestoreInstance();
    if (!firestore) return res.status(500).json({ error: "Firestore unavailable" });

    const winnerDoc = await firestore.collection("winners").doc(winnerId).get();
    if (!winnerDoc.exists) return res.status(404).json({ error: "Winner record not found" });
    
    const winnerData = winnerDoc.data() || {};
    const isAdmin = user.role === 'admin' || user.email === process.env.DEFAULT_ADMIN_EMAIL;
    if (winnerData.userId !== user.uid && !isAdmin) {
      return res.status(403).json({ error: "Forbidden: You do not own this winner record" });
    }

    ensureCloudinaryConfig();

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "digital-heroes/winner-proofs",
        access_mode: "authenticated",
        resource_type: "image",
        public_id: `${winnerId}_${Date.now()}`,
      },
      async (error, result) => {
        if (error || !result) {
          console.error("Cloudinary Upload Error:", error);
          return res.status(500).json({ error: "Failed to upload to Cloudinary" });
        }

        const deliveryType = result.type || "upload";
        const resourceType = result.resource_type || "image";

        await firestore.collection("winners").doc(winnerId).update({
          proofCloudinaryPublicId: result.public_id,
          proofCloudinaryMetadata: {
            format: result.format,
            version: result.version,
            secure_url: result.secure_url,
            resource_type: resourceType,
            type: deliveryType,
            access_mode: result.access_mode || "authenticated",
          },
          proofFileName: req.file?.originalname,
          proofContentType: req.file?.mimetype,
          proofNotes: notes || '',
          proofStatus: 'Submitted',
          proofSubmittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        console.log(`[Cloudinary Upload] public_id: ${result.public_id} | resource_type: ${resourceType} | delivery_type: ${deliveryType} | access_mode: ${result.access_mode || 'authenticated'}`);

        return res.status(200).json({ success: true, publicId: result.public_id });
      }
    );

    stream.end(req.file.buffer);
  } catch (err: any) {
    const errorDetails = err?.message || String(err);
    console.error("Proof Upload Error:", errorDetails, err);
    return res.status(500).json({ error: errorDetails });
  }
});

// API: Get Signed URL for Proof View
app.get("/api/proofs/:winnerId/view", async (req: any, res) => {
  try {
    const user = await verifyAuth(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { winnerId } = req.params;

    const firestore = getFirestoreInstance();
    if (!firestore) return res.status(500).json({ error: "Firestore unavailable" });

    const winnerDoc = await firestore.collection("winners").doc(winnerId).get();
    if (!winnerDoc.exists) return res.status(404).json({ error: "Winner record not found" });

    const winnerData = winnerDoc.data() || {};
    const isAdmin = user.role === 'admin' || user.email === process.env.DEFAULT_ADMIN_EMAIL;
    if (winnerData.userId !== user.uid && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!winnerData.proofCloudinaryPublicId) {
      // Fallback if legacy base64 proof stored
      if (winnerData.proofImageData || winnerData.proofUrl) {
        return res.status(200).json({ url: winnerData.proofImageData || winnerData.proofUrl });
      }
      return res.status(404).json({ error: "No proof uploaded for this winner" });
    }

    ensureCloudinaryConfig();

    const rawPublicId = winnerData.proofCloudinaryPublicId;
    const metadata = winnerData.proofCloudinaryMetadata || {};
    const resourceType = metadata.resource_type || "image";
    const format = metadata.format || undefined;
    const version = metadata.version || undefined;

    // Handle public_id if format extension is already attached
    let publicId = rawPublicId;
    if (format && publicId.toLowerCase().endsWith(`.${format.toLowerCase()}`)) {
      publicId = publicId.slice(0, -(format.length + 1));
    }

    // Determine candidate delivery types (e.g. upload, authenticated, private)
    let primaryType = metadata.type;
    if (!primaryType) {
      if (metadata.secure_url?.includes("/image/authenticated/")) {
        primaryType = "authenticated";
      } else if (metadata.secure_url?.includes("/image/private/")) {
        primaryType = "private";
      } else {
        primaryType = "upload";
      }
    }

    const candidateTypes = Array.from(new Set([
      primaryType,
      "upload",
      "authenticated",
      "private"
    ]));

    let validSignedUrl: string | null = null;
    let verifiedDeliveryType: string = primaryType;

    for (const dType of candidateTypes) {
      const candidateUrl = cloudinary.url(publicId, {
        sign_url: true,
        secure: true,
        resource_type: resourceType,
        type: dType,
        version: version,
        format: format,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      });

      // Safe URL representation for logging (strip signatures and query params)
      const sanitizedUrlPath = candidateUrl
        .replace(/\/s--[^/]+--\//, '/s--[SIG]--/')
        .split('?')[0];

      try {
        const probeRes = await fetch(candidateUrl, {
          method: "HEAD",
          headers: { "User-Agent": "DigitalHeroes-ProofView/1.0" }
        });

        console.log(`[Cloudinary Proof View] public_id: ${rawPublicId} | resource_type: ${resourceType} | delivery_type: ${dType} | sanitized_url: ${sanitizedUrlPath} | HTTP status: ${probeRes.status}`);

        if (probeRes.status === 200 || probeRes.status === 304) {
          validSignedUrl = candidateUrl;
          verifiedDeliveryType = dType;
          break;
        }
      } catch (probeErr: any) {
        console.warn(`[Cloudinary Proof View] Probe error for ${dType}:`, probeErr?.message);
      }
    }

    if (validSignedUrl) {
      return res.status(200).json({ 
        url: validSignedUrl,
        deliveryType: verifiedDeliveryType,
        notes: winnerData.proofNotes || '' 
      });
    }

    // Fallback: Return signed URL constructed using primaryType
    const fallbackSignedUrl = cloudinary.url(publicId, {
      sign_url: true,
      secure: true,
      resource_type: resourceType,
      type: primaryType,
      version: version,
      format: format,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });

    const fallbackSanitized = fallbackSignedUrl
      .replace(/\/s--[^/]+--\//, '/s--[SIG]--/')
      .split('?')[0];

    console.log(`[Cloudinary Proof View Fallback] public_id: ${rawPublicId} | resource_type: ${resourceType} | delivery_type: ${primaryType} | sanitized_url: ${fallbackSanitized}`);

    return res.status(200).json({ 
      url: fallbackSignedUrl,
      deliveryType: primaryType,
      notes: winnerData.proofNotes || '' 
    });
  } catch (err: any) {
    const errorDetails = err?.message || String(err);
    console.error("Proof View Error:", errorDetails, err);
    return res.status(500).json({ error: errorDetails });
  }
});

// Global API 404 handler to ensure /api/* requests always return JSON
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
});

// Global error handling middleware to ensure errors always return JSON
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errorMsg = err?.error?.description || err?.description || err?.message || "Internal server error";
  console.error("Unhandled Express Error:", errorMsg, err);
  if (!res.headersSent) {
    res.status(500).json({ error: errorMsg });
  }
});

async function startServer() {
  // Vite middleware strictly for non-Vercel local development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only bind port when not running inside Vercel serverless environment
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// Only start the server if not running inside a Vercel serverless function
if (!process.env.VERCEL) {
  startServer();
}

export default app;
