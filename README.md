# BASIRA

BASIRA is a multilingual spiritual-entertainment application for web and Android. It combines daily zodiac content, tarot, palm, coffee-cup, and face readings with Firebase accounts and saved reading history.

> Readings are for entertainment and personal reflection. They are not medical, legal, financial, or psychological advice.

## Stack

- React 19, TypeScript, Vite, and Tailwind CSS
- Express API with Gemini, OpenAI, or Groq
- Firebase Authentication, Firestore, Analytics, Remote Config, and Performance
- Capacitor Android and Render deployment

## Local development

Node.js 20+ is required.

```bash
npm ci
cp .env.example .env
npm run dev
```

Set `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `GROQ_API_KEY` in `.env`. Choose the preferred provider with `AI_PROVIDER`. Never expose an AI key through a `VITE_` variable because those values are included in the browser bundle.

## Quality and Android

```bash
npm run check
npm audit
npm run android:sync
cd android && ./gradlew assembleDebug
```

`npm run check` runs strict TypeScript validation, automated tests, and the production build.

## Production configuration

Configure the AI key and `ALLOWED_ORIGINS` on Render. To enable subscriptions, set `VITE_CHECKOUT_URL` to a hosted checkout that verifies the Firebase user and updates subscription status securely on the server. Without it, BASIRA reports that payments are unavailable and does not activate a plan.

The admin interface requires a profile with `role: "admin"`. Firestore administrative access additionally requires the Firebase Authentication custom claim `admin: true`; clients cannot grant this permission to themselves.

Deploy the secured Firestore rules before production use:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```
