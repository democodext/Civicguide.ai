import { initializeApp } from "firebase/app";
import { addDoc, collection, getFirestore, serverTimestamp } from "firebase/firestore";
import type { UserContext } from "./types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseReady = Object.values(firebaseConfig).every(Boolean);
const app = firebaseReady ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;

export type JourneySnapshot = {
  context: UserContext;
  savedAt: string;
  readiness: number;
};

export async function saveJourney(snapshot: JourneySnapshot) {
  localStorage.setItem("civicguide-journey", JSON.stringify(snapshot));

  if (!db) {
    return "local";
  }

  await addDoc(collection(db, "journeys"), {
    ...snapshot,
    serverSavedAt: serverTimestamp(),
  });

  return "firebase";
}

export function loadJourney(): JourneySnapshot | null {
  const raw = localStorage.getItem("civicguide-journey");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as JourneySnapshot;
  } catch {
    return null;
  }
}
