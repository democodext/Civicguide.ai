import { describe, expect, it } from "vitest";
import { buildAssistantReply, findOfficialSources } from "./data";
import type { UserContext } from "./types";

const context: UserContext = {
  persona: "first-time",
  goal: "register",
  location: "India",
  language: "Hinglish",
  accessibility: false,
};

describe("CivicGuide safety responses", () => {
  it("refuses party or candidate recommendations", () => {
    const reply = buildAssistantReply("Who should I vote for? Which party is best?", context);

    expect(reply.toLowerCase()).toContain("cannot");
    expect(reply.toLowerCase()).toContain("party");
    expect(reply.toLowerCase()).toContain("candidate");
  });

  it("keeps document guidance process-focused", () => {
    const reply = buildAssistantReply("What documents do I need?", context);

    expect(reply).toContain("Identity proof");
    expect(reply).toContain("Address proof");
    expect(reply).toContain("official election");
  });

  it("returns official sources for status lookup", () => {
    const sources = findOfficialSources("status");

    expect(sources.length).toBeGreaterThan(0);
    expect(sources.some((source) => source.url.includes("eci.gov.in"))).toBe(true);
  });
});
