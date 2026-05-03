# CivicGuide AI

CivicGuide AI is a neutral, context-aware election process education assistant. It feels like a focused ChatGPT-style civic mentor, but it is intentionally constrained to safe election-process education. It helps users understand eligibility, documents, timelines, registration steps, accessibility support, and voting-day preparation in a simple guided flow.

## Chosen Vertical

Election Process Education

## Problem

Many citizens, especially first-time voters, students, senior citizens, and busy professionals, find the election process confusing. They may not know which documents are needed, when to register, how to track verification, or what to prepare before voting day.

## Solution

CivicGuide AI turns election process education into a personalized assistant workspace. A user selects their persona, goal, location, language style, and accessibility preference. The app then provides a tailored chat experience, starter prompts, a live readiness checklist, a personal election journey, myth-vs-fact education, and quick links to Google services.

## Key Features

- Persona-based guidance for first-time voters, students, senior citizens, busy professionals, and educators
- ChatGPT-style assistant interface with starter prompts
- Smart mentor responses based on user context
- Live readiness progress checklist
- Election journey checklist from eligibility to voting day
- Myth-vs-fact civic education module
- High contrast accessibility mode
- Google Calendar reminder link for readiness checks
- Google Maps search link for nearby election offices
- Responsible AI guardrails that avoid political persuasion

## Google Services Used

- Google Calendar: creates an election readiness reminder
- Google Maps: helps users search for nearby election offices
- Gemini-ready architecture: the assistant can be upgraded with a backend Gemini API route while keeping keys private
- Firebase-ready journey saving: stores locally by default and can write to Firestore when Firebase config is provided
- Official ECI source lookup: links users to ECI voter services and electoral search

## Responsible AI Approach

CivicGuide AI is designed for neutral civic education. It does not recommend parties, candidates, or voting choices. If a user asks for political persuasion, the assistant redirects them toward neutral process education, official sources, and responsible comparison.

## Assumptions

- Election rules, dates, documents, and official portals vary by region.
- This project demonstrates a safe educational assistant and asks users to verify final information from official election authorities.
- The current implementation uses deterministic local assistant logic so the demo works reliably without exposing API keys. Gemini API integration should be added through a backend endpoint for production use.

## Tech Stack

- React
- TypeScript
- Vite
- Lucide React icons
- CSS modules through a single maintainable stylesheet

## How To Run

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Deploy on Google Cloud Run

The repository includes a production `Dockerfile` that builds the Vite frontend and serves it with the Express API.

1. Create a Cloud Run service in project **Civicguide** (or your GCP project) using **continuous deploy from GitHub** or `gcloud run deploy --source .`.
2. Set environment variable **`GEMINI_API_KEY`** on the service for Gemini-backed answers (optional; local fallback works without it).
3. Prefer region **`asia-south1`** (Mumbai) or another region close to users.
4. Allow **public (unauthenticated)** access if judges need a direct HTTPS URL.

**Google services in production:** Calendar and Maps open in new tabs from the UI; the assistant calls **Gemini** through the same-origin `/api/assistant` route so API keys stay on the server. Optional **Firebase** client config uses `VITE_FIREBASE_*` at build time when provided.

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

The test suite validates safety refusal for political persuasion, document guidance, and official-source lookup.

## Gemini Backend

Run the backend in a separate terminal:

```bash
npm run server
```

Add `GEMINI_API_KEY` in `.env`. The frontend calls `/api/assistant` through the Vite proxy. If the key is missing or the request fails, the app falls back to safe local assistant logic.

## Firebase Journey Saving

Add Firebase web app values in `.env`:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Without Firebase config, the app still saves the journey locally using `localStorage`.

## Project Structure

```text
frontend/
  index.html
  vite.config.ts
  tsconfig.json
  src/
    App.tsx               Main UI and interaction flow
    data.ts               Persona logic, assistant replies, Google links
    assistantClient.ts    Frontend client for backend assistant with browser fallback
    firebaseJourney.ts    Firebase-ready saved journey helper
    data.test.ts          Safety and lookup tests
    main.tsx              React entry point
    styles.css            Full responsive UI styling
    types.ts              Shared TypeScript types

backend/
  index.mjs               Express API for Gemini-backed assistant responses
```

## Evaluation Highlights

- Code Quality: small, readable, typed React components and centralized data logic
- Security: no secrets committed, no political persuasion, safe `.env.example`
- Efficiency: lightweight local logic, no heavy media assets, small repo size
- Testing: manual validation through persona, goal, language, assistant, safety refusal, Calendar, and Maps flows
- Accessibility: high contrast mode, semantic labels, responsive design
- Google Services: meaningful Calendar and Maps integration, Gemini-ready setup

## Future Improvements

- Connect Gemini API for richer natural language reasoning
- Add official election source retrieval by country or state
- Add multilingual content packs
- Add Firebase authentication and saved user journey
- Add automated tests for assistant safety responses
