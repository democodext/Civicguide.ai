import { describe, expect, it } from "vitest";
import { buildAssistantReply, createCalendarUrl, createMapsUrl, findOfficialSources } from "./data";
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

  it("returns all official sources when the query is empty", () => {
    expect(findOfficialSources("")).toEqual(findOfficialSources("   "));
    expect(findOfficialSources("").length).toBeGreaterThanOrEqual(3);
  });

  it("builds a Google Calendar URL for reminders", () => {
    const url = createCalendarUrl(context);
    expect(url).toContain("calendar.google.com");
    expect(url).toContain("action=TEMPLATE");
  });

  it("builds a Google Maps search URL for local offices", () => {
    const url = createMapsUrl("Mumbai");
    expect(url).toContain("google.com/maps");
    expect(url).toContain(encodeURIComponent("Mumbai"));
  });

  it("uses a neutral fallback when Maps location is blank", () => {
    const url = createMapsUrl("  ");
    expect(url).toContain(encodeURIComponent("election office near me"));
  });

  it("covers 7-day readiness planning", () => {
    const reply = buildAssistantReply("Make a simple 7-day election readiness plan.", context);
    expect(reply.toLowerCase()).toContain("day 1");
    expect(reply.toLowerCase()).toContain("day 7");
  });

  it("refuses party suggestions from the starter prompt wording", () => {
    const reply = buildAssistantReply("Can you suggest which party I should vote for?", context);
    expect(reply.toLowerCase()).toContain("cannot");
    expect(reply.toLowerCase()).toContain("party");
  });

  it("expands vague questions with goal-specific numbered steps", () => {
    const reply = buildAssistantReply("how can i do this?", context);
    expect(reply).toMatch(/1\./);
    expect(reply.toLowerCase()).toMatch(/portal|registration|reference/);
  });
});
