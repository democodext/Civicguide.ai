export type Persona = "first-time" | "student" | "senior" | "busy" | "educator";

export type Goal =
  | "register"
  | "documents"
  | "timeline"
  | "voting-day"
  | "teach";

export type Language = "English" | "Hindi" | "Hinglish";

export type UserContext = {
  persona: Persona;
  goal: Goal;
  location: string;
  language: Language;
  accessibility: boolean;
};

export type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  label?: string;
};

export type JourneyStep = {
  title: string;
  detail: string;
  status: "done" | "active" | "next";
};

export type OfficialSource = {
  title: string;
  description: string;
  url: string;
  tags: string[];
};
