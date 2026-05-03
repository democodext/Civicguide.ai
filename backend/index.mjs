import cors from "cors";
import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "0.0.0.0";
const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const MAX_MESSAGE_LENGTH = 8000;

const ALLOWED_PERSONAS = new Set(["first-time", "student", "senior", "busy", "educator"]);
const ALLOWED_GOALS = new Set(["register", "documents", "timeline", "voting-day", "teach"]);
const ALLOWED_LANGUAGES = new Set(["Hinglish", "English", "Hindi"]);

app.set("trust proxy", 1);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.googleapis.com https://www.gstatic.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  next();
});

app.use(cors({ origin: true }));
app.use(express.json({ limit: "64kb" }));

const assistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

function sanitizeContext(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out = {};
  if (typeof raw.persona === "string" && ALLOWED_PERSONAS.has(raw.persona)) {
    out.persona = raw.persona;
  }
  if (typeof raw.goal === "string" && ALLOWED_GOALS.has(raw.goal)) {
    out.goal = raw.goal;
  }
  if (typeof raw.location === "string") {
    out.location = raw.location.trim().slice(0, 200);
  }
  if (typeof raw.language === "string" && ALLOWED_LANGUAGES.has(raw.language)) {
    out.language = raw.language;
  }
  if (typeof raw.accessibility === "boolean") {
    out.accessibility = raw.accessibility;
  }
  return out;
}

// Serve static frontend files for production
app.use(express.static(path.join(__dirname, "../dist")));

const safetyInstruction = `You are CivicGuide AI, a neutral election process education assistant.
You can explain registration, documents, timelines, polling-day preparation, accessibility, and official-source verification.
Do not endorse or oppose a party, candidate, ideology, or voting choice.
If asked who to vote for, redirect to neutral comparison and official sources.
Keep answers practical, concise, and easy for first-time voters.`;

function localReply(message, context) {
  const lower = String(message || "").toLowerCase();
  const location = context?.location || "your area";
  const persona = context?.persona || "user";
  const goal = context?.goal || "election readiness";

  if (lower.includes("party") || lower.includes("candidate") || lower.includes("vote for")) {
    return "I cannot recommend a party or candidate. I can help you compare official manifestos, verify candidate details from official sources, and prepare for voting day without influencing your choice.";
  }

  if (lower.includes("document") || lower.includes("id")) {
    return `For a ${persona} in ${location}, start with identity proof, address proof, age proof, and one phone number or email for updates. Keep scanned copies ready and verify the accepted document list on the official election authority portal before submission.`;
  }

  if (lower.includes("timeline") || lower.includes("date") || lower.includes("deadline")) {
    return `A simple timeline for ${location}: first confirm eligibility, then collect documents, submit or review registration early, track the verification status, and finally prepare for polling day. Since official dates vary by region, use this as a planning guide and confirm final deadlines from the election authority.`;
  }

  if (lower.includes("first time") || lower.includes("start")) {
    return `If you are starting for the first time, follow this order: 1. check eligibility, 2. gather documents, 3. submit or verify registration, 4. track status, 5. prepare for voting day. That gives you a calm path instead of figuring everything out at the last minute.`;
  }

  if (lower.includes("senior") || lower.includes("access")) {
    return `For senior citizens or accessibility needs, check whether wheelchair access, priority queues, companion rules, or assisted voting options are available in ${location}. Save the official helpline and confirm required ID before leaving home.`;
  }

  if (lower.includes("plan") || lower.includes("week")) {
    return "Here is a simple 7-day plan: Day 1 eligibility, Day 2 documents, Day 3 registration, Day 4 status check, Day 5 polling-day rules, Day 6 route and reminder setup, Day 7 final official verification. This keeps your election preparation structured and stress-free.";
  }

  return `For a ${persona} focused on ${goal}, start with eligibility, documents, registration or status check, verification, and voting-day planning. Ask me about documents, registration, timeline, accessibility, or official sources and I will break it into clear next steps.`;
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, geminiConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

app.post("/api/assistant", assistantLimiter, async (request, response) => {
  const rawMessage = request.body?.message;
  if (typeof rawMessage !== "string") {
    response.status(400).json({ error: "Message is required." });
    return;
  }

  const message = rawMessage.trim();
  if (!message) {
    response.status(400).json({ error: "Message is required." });
    return;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    response.status(400).json({ error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters.` });
    return;
  }

  const context = sanitizeContext(request.body?.context);

  if (!process.env.GEMINI_API_KEY) {
    response.json({ source: "local-fallback", text: localReply(message, context) });
    return;
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: safetyInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `User context: ${JSON.stringify(context)}\n\nUser question: ${message}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 420,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini request failed with ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join("\n") || localReply(message, context);

    response.json({ source: "gemini", text });
  } catch (error) {
    console.error(error);
    response.json({ source: "local-fallback", text: localReply(message, context) });
  }
});

// Catch-all route to serve the React app
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(port, host, () => {
  console.log(`CivicGuide API listening on http://${host}:${port}`);
});
