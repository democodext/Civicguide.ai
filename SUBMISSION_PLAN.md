# Submission Plan

## Repository Rules

- Keep the GitHub repository public.
- Keep only one branch.
- Keep repository size under 10 MB.
- Do not commit `node_modules`, `.env`, screenshots, videos, or build output.
- Make frequent commits with clear messages.

## Recommended Git Flow

```bash
git init
git add .
git commit -m "Create CivicGuide AI starter"
git branch -M main
git remote add origin YOUR_PUBLIC_GITHUB_REPO_URL
git push -u origin main
```

## Demo Script

1. Open the app.
2. Select `First-time voter`.
3. Select `Register to vote`.
4. Set location to your target region.
5. Ask: `What documents do I need?`
6. Ask: `Can you suggest which party I should vote for?`
7. Show that the assistant refuses persuasion and stays neutral.
8. Open Google Calendar reminder.
9. Open Google Maps office search.
10. Toggle high contrast mode.

## Pitch

CivicGuide AI is a neutral election process mentor. It does not try to influence political choices. Instead, it gives every user a personalized roadmap based on their context, helping them understand eligibility, documents, registration, timelines, accessibility, and voting-day preparation.

## What Makes It Strong

- Real-world usefulness
- Simple user journey
- Safety-first assistant behavior
- Meaningful Google services integration
- Clean UI with accessibility support
- Small, maintainable codebase
