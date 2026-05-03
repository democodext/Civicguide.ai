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
Keep answers practical, concise, and easy for first-time voters.
If the user message is short or vague (for example "how can I do this" or "help me"), use the JSON user context fields goal, persona, and location to give numbered, specific next steps. Do not repeat the same generic paragraph; tailor steps to the goal (register, documents, timeline, voting-day, teach).`;

const PERSONA_LABEL = {
  "first-time": "a first-time voter",
  student: "a student voter",
  senior: "a senior voter",
  busy: "a busy professional",
  educator: "an educator",
};

function isVagueQuestion(lower) {
  return (
    /\bhow\s+can\s+i\b/.test(lower) ||
    /\bhow\s+do\s+i\b/.test(lower) ||
    /\bwhat\s+should\s+i\b/.test(lower) ||
    /\bhelp\s+me\b/.test(lower) ||
    /\bwhere\s+do\s+i\s+start\b/.test(lower) ||
    /\bwhat\s+to\s+do\b/.test(lower) ||
    (lower.length < 28 && /\bhow\b/.test(lower))
  );
}

function goalBasedNextSteps(context) {
  const loc = (context?.location && String(context.location).trim()) || "your area";
  const goal = context?.goal || "register";
  const personaKey = context?.persona || "first-time";
  const who = PERSONA_LABEL[personaKey] || "a voter";

  const kits = {
    register: `You are ${who} in ${loc}, focusing on registration. Here is a clear order:\n\n1. Open your official voter registration portal and read eligibility in one pass.\n2. Collect the ID, address, and age proofs listed there before you start the form.\n3. Submit a new registration or correction request and save the reference or acknowledgement number.\n4. Track verification status and fix spelling or address mismatches early.\n5. After approval, confirm your polling details only from official sources.\n\nTell me if you have "not started", "already applied", or "status stuck" and I will narrow the very next action.`,
    documents: `For ${who} in ${loc}, document prep:\n\n1. Check the official list of accepted identity and address proofs for your region.\n2. Keep one primary ID, address proof, age proof, and a phone or email for OTP or updates.\n3. Align name spelling across documents before you upload or visit an office.\n4. Carry originals only when the process explicitly requires it.\n\nSay whether you are applying online or in person and I will shorten the checklist.`,
    timeline: `Timeline discipline for ${loc}:\n\n1. Bookmark the official election calendar for your region.\n2. Note registration windows, correction windows, and polling day.\n3. Work backward at least one week from each deadline for documents and travel.\n4. Ignore unofficial forwards; confirm every date on the election authority site.`,
    "voting-day": `Polling-day prep for ${who} in ${loc}:\n\n1. Confirm polling station, timings, and ID to carry from official instructions.\n2. Plan route, queue time, and accessibility or companion rules.\n3. Save the official helpline; avoid sharing personal data in public chats.\n4. Know basic rules about phones and assistance inside the polling area.`,
    teach: `To teach others neutrally:\n\n1. Use only official portals, dates, and forms—no party messaging.\n2. Share a simple flow: eligibility → documents → registration or correction → status → polling day.\n3. Encourage everyone to verify rumours with election commission notices.`,
  };

  return kits[goal] || kits.register;
}

function localReply(message, context) {
  const lower = String(message || "").toLowerCase();
  const location = context?.location || "your area";
  const persona = context?.persona || "first-time";
  const goal = context?.goal || "register";
  const personaReadable = PERSONA_LABEL[persona] || "a voter";
  const goalReadable =
    {
      register: "registering to vote",
      documents: "required documents",
      timeline: "the election timeline",
      "voting-day": "voting day preparation",
      teach: "explaining the process to others",
    }[goal] || "your election goal";

  if (lower.includes("party") || lower.includes("candidate") || lower.includes("vote for")) {
    return "I cannot recommend a party or candidate. I can help you compare official manifestos, verify candidate details from official sources, and prepare for voting day without influencing your choice.";
  }

  if (lower.includes("document") || lower.includes("id")) {
    return `For ${personaReadable} in ${location}, start with identity proof, address proof, age proof, and one phone number or email for updates. Keep scanned copies ready and verify the accepted document list on the official election authority portal before submission.`;
  }

  if (isVagueQuestion(lower)) {
    return goalBasedNextSteps(context);
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

  return `For ${personaReadable} working on ${goalReadable}, move in this order: eligibility, documents, registration or status check, verification, then polling-day planning.\n\nTry a specific prompt like "documents checklist", "registration status", "7-day plan", or "accessibility on polling day" so I can respond with a tighter checklist.`;
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
