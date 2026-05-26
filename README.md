# DreamScapes

DreamScapes is a personalised children's story app prototype for parents to create timed bedtime and anytime stories.

## Run

Open `index.html` directly in a browser, or serve the folder locally:

```sh
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## AI Integration

The app includes a browser-safe AI hook via `window.DREAMSCAPES_AI_ENDPOINT`. Set that value to a backend endpoint that accepts the story form fields plus a generated prompt and returns:

```json
{
  "title": "Story title",
  "paragraphs": ["Paragraph one", "Paragraph two"]
}
```

If no endpoint is configured, DreamScapes uses a built-in child-safe generator so the prototype works immediately without exposing API keys in the browser.

Stories up to 10 minutes are treated as the standard tier. Durations over 10 minutes are labelled as premium-ready in the UI and prompt payload so subscription payments can be added later.

## Package Prototype

- Free: £0, 3 stories per month, up to 10 minutes, no saved library or audio narration.
- Premier: £4.99/month, 15 stories per month, saved story library, up to 30 minutes.
- DreamScapes Plus: £9.99/month, 30 stories per month, larger saved story library, audio narration, 150 audio minutes per month, up to 1 hour.

The prototype also includes screens and controls for saved stories, package upgrades, child profiles, safety preferences, narration voice styles, regeneration actions, AI illustrations, printable PDFs, sharing, and a sleep timer. Payment, account storage, generated images, PDF export, and production audio still need backend services.

## Planned Future Features

- User accounts
- Saved story library
- AI illustrations
- Audio narration
- Subscription payments
- Printable PDF storybooks
