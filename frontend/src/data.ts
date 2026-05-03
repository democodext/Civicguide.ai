import type { Goal, JourneyStep, OfficialSource, Persona, UserContext } from "./types";

export const personas: Record<Persona, string> = {
  "first-time": "First-time voter",
  student: "Student",
  senior: "Senior citizen",
  busy: "Busy professional",
  educator: "Teacher or mentor",
};

export const goals: Record<Goal, string> = {
  register: "Register to vote",
  documents: "Know required documents",
  timeline: "Understand election timeline",
  "voting-day": "Prepare for voting day",
  teach: "Explain to others",
};

export const journeySteps: JourneyStep[] = [
  {
    title: "Check eligibility",
    detail: "Confirm age, citizenship, and basic voter requirements.",
    status: "done",
  },
  {
    title: "Prepare documents",
    detail: "Keep identity, address, and age proof ready before applying.",
    status: "active",
  },
  {
    title: "Submit registration",
    detail: "Use the official election portal or local election office process.",
    status: "next",
  },
  {
    title: "Track verification",
    detail: "Follow up on application status and corrections if needed.",
    status: "next",
  },
  {
    title: "Plan voting day",
    detail: "Know polling location, ID to carry, timings, and accessibility support.",
    status: "next",
  },
];

export const starterPrompts = [
  "I am voting for the first time. Where do I start?",
  "What documents should I keep ready?",
  "Make a simple 7-day election readiness plan.",
  "What should a senior citizen check before voting day?",
  "Can you suggest which party I should vote for?",
];

export const readinessChecks = [
  "Eligibility understood",
  "Documents gathered",
  "Application or status checked",
  "Polling-day plan saved",
  "Official source verified",
];

export const officialSources: OfficialSource[] = [
  {
    title: "Voters' Services Portal",
    description: "Official ECI portal for voter registration, corrections, status, and voter services.",
    url: "https://voters.eci.gov.in/en",
    tags: ["registration", "documents", "status", "forms"],
  },
  {
    title: "Electoral Search",
    description: "Official ECI electoral roll search for checking voter details.",
    url: "https://electoralsearch.eci.gov.in/",
    tags: ["search", "status", "polling"],
  },
  {
    title: "Election Commission of India",
    description: "Main official website for election notices, press releases, and voter information.",
    url: "https://www.eci.gov.in/",
    tags: ["official", "timeline", "notices", "education"],
  },
];

export function findOfficialSources(query: string): OfficialSource[] {
  const normalized = query.toLowerCase();
  if (!normalized.trim()) return officialSources;

  return officialSources.filter((source) => {
    const searchable = `${source.title} ${source.description} ${source.tags.join(" ")}`.toLowerCase();
    return normalized
      .split(/\s+/)
      .filter(Boolean)
      .some((token) => searchable.includes(token));
  });
}

export const mythFacts = [
  {
    myth: "Voting registration is only for politically active people.",
    fact: "Registration is a basic civic process. You can learn the process without supporting any party.",
  },
  {
    myth: "If one document is missing, there is no solution.",
    fact: "Most systems provide alternate document options or correction workflows.",
  },
  {
    myth: "Election information is too complex for first-time voters.",
    fact: "A simple step-by-step plan can make the process easy to follow.",
  },
];

function isVagueUserQuestion(normalized: string): boolean {
  return (
    /\bhow\s+can\s+i\b/.test(normalized) ||
    /\bhow\s+do\s+i\b/.test(normalized) ||
    /\bwhat\s+should\s+i\b/.test(normalized) ||
    /\bhelp\s+me\b/.test(normalized) ||
    /\bwhere\s+do\s+i\s+start\b/.test(normalized) ||
    /\bwhat\s+to\s+do\b/.test(normalized) ||
    (normalized.length < 28 && /\bhow\b/.test(normalized))
  );
}

function vagueGoalGuidance(context: UserContext): string {
  const loc = context.location.trim() || "your area";
  const who = personas[context.persona].toLowerCase();
  const kits: Record<string, string> = {
    register: `You picked "${goals.register}" in ${loc} as a ${who}. Practical order:\n\n1. Read eligibility on the official voter portal.\n2. Collect the proofs the form lists before you start typing.\n3. Submit registration or correction and save your reference number.\n4. Track verification; fix mismatches early.\n5. Confirm polling details only from official sources.\n\nReply with not started / applied / status stuck and I will focus on one next step.`,
    documents: `For "${goals.documents}" in ${loc} (${who}):\n\n1. Open the official accepted-documents list.\n2. Align names across ID and address proof.\n3. Keep scans clear; carry originals only if required.\n\nSay online vs office visit and I will shorten the list.`,
    timeline: `For "${goals.timeline}" in ${loc}:\n\n1. Save the official election calendar link.\n2. Mark registration and correction deadlines.\n3. Plan one week before each milestone for documents and travel.`,
    "voting-day": `For "${goals["voting-day"]}" in ${loc} (${who}):\n\n1. Confirm station, timing, and ID from official instructions.\n2. Plan travel and accessibility needs.\n3. Keep the helpline handy; avoid sharing personal data publicly.`,
    teach: `For "${goals.teach}": use only official portals, share a neutral 5-step flow, and ask people to verify rumours on the election commission site.`,
  };

  return kits[context.goal] || kits.register;
}

export function buildAssistantReply(question: string, context: UserContext): string {
  const normalized = question.toLowerCase();
  const locationText = context.location.trim() || "your area";
  const opener =
    context.language === "Hindi"
      ? "Bilkul. Main isse simple steps me tod deta hoon."
      : context.language === "Hinglish"
        ? "Bilkul, isko simple steps me todte hain."
        : "Absolutely. Let me break this into simple steps.";
  const neutral =
    context.language === "Hindi"
      ? "Main sirf neutral election-process guidance deta hoon, vote choice influence nahi karta."
      : context.language === "Hinglish"
        ? "Main neutral process guide hoon, vote choice influence nahi karunga."
        : "I provide neutral process guidance and do not influence vote choice.";

  if (normalized.includes("document") || normalized.includes("id")) {
    return `${opener}\n\nFor a ${personas[context.persona].toLowerCase()} in ${locationText}, keep these ready first:\n\n1. Identity proof\n2. Address proof\n3. Age proof\n4. A phone number or email for status updates\n5. Any local form number required by the official election authority\n\nA practical tip: keep one folder named "Election docs" with scanned copies, then verify the final accepted document list on the official election commission site.`;
  }

  if (normalized.includes("timeline") || normalized.includes("date")) {
    return `${opener}\n\nA clean timeline for ${locationText}:\n\n1. Today: confirm eligibility and collect documents.\n2. Next 1-2 days: submit or review registration details.\n3. After submission: track verification and fix spelling/address issues early.\n4. Before voting day: confirm polling instructions, ID requirement, travel time, and accessibility support.\n\nDates change by region, so treat this as your personal plan and confirm official deadlines from the election authority.`;
  }

  if (normalized.includes("senior") || normalized.includes("access")) {
    return `${opener}\n\nFor senior citizens or accessibility needs, check these before voting day:\n\n1. Is wheelchair or ramp access available?\n2. Are priority queues or assistance desks available?\n3. Can a companion help under local rules?\n4. Are postal, assisted, or home-voting options available in that region?\n5. Which helpline should be saved before leaving home?\n\nCarry only official required documents and avoid relying on forwarded messages.`;
  }

  if (
    normalized.includes("party") ||
    normalized.includes("candidate") ||
    normalized.includes("who should") ||
    normalized.includes("vote for")
  ) {
    return `I cannot recommend a party or candidate. ${neutral}\n\nWhat I can do instead:\n\n1. Help you read official manifestos.\n2. Build a neutral comparison checklist.\n3. Explain how to verify candidate information from official sources.\n4. Help you prepare for voting day without telling you who to support.`;
  }

  if (normalized.includes("7-day") || normalized.includes("plan") || normalized.includes("week")) {
    return `${opener}\n\nHere is a 7-day readiness plan:\n\nDay 1: Check eligibility and note your local official portal.\nDay 2: Collect identity, address, and age proof.\nDay 3: Submit or review registration details.\nDay 4: Track status and correct mistakes.\nDay 5: Learn polling-day rules and accessibility options.\nDay 6: Save reminders, route, and helpline information.\nDay 7: Re-check official instructions and keep documents ready.\n\nThis keeps the process calm instead of last-minute.`;
  }

  if (isVagueUserQuestion(normalized)) {
    return `${opener}\n\n${vagueGoalGuidance(context)}`;
  }

  return `${opener}\n\nSince your goal is "${goals[context.goal]}", your best next step is to move through the journey in this order: eligibility, documents, registration or status check, verification, and voting-day preparation.\n\nAsk me one specific thing, like "documents", "timeline", "accessibility", or "myth vs fact", and I will give you a clear checklist.`;
}

export function createCalendarUrl(context: UserContext) {
  const title = encodeURIComponent("CivicGuide: election readiness check");
  const details = encodeURIComponent(
    `Review documents, registration status, and voting-day checklist for ${personas[context.persona]}.`
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
}

export function createMapsUrl(location: string) {
  const query = encodeURIComponent(
    location.trim() ? `election office near ${location}` : "election office near me"
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
