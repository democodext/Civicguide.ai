import { buildAssistantReply } from "./data";
import type { UserContext } from "./types";

export async function askCivicGuide(message: string, context: UserContext) {
  try {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context }),
    });

    if (!response.ok) {
      throw new Error("Assistant API failed");
    }

    const data = (await response.json()) as { text?: string; source?: string };
    return {
      text: data.text || buildAssistantReply(message, context),
      source: data.source || "api",
    };
  } catch {
    return {
      text: buildAssistantReply(message, context),
      source: "browser-fallback",
    };
  }
}
