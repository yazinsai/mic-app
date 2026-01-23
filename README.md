# mic-app

mic-app is a minimal voice‑notes app and the first step in a workflow where Claude can act on your recordings (transcribe, summarize, tag, and trigger follow‑up actions). The goal is to capture audio quickly, sync it, and use it as a lightweight input to an automated “do‑stuff‑for‑me” pipeline.

## Development
- Start the dev server: `npm run start`
- Push schema changes: `npx instant-cli push`
- Pull schema changes: `npx instant-cli pull`

## Build an Android APK (EAS)
This project uses Expo Application Services (EAS) to build APKs in the cloud.

1) Install and log in to EAS:
```
npm i -g eas-cli
eas login
```

2) Build an APK (internal distribution):
```
eas build -p android --profile preview
```

3) When the build finishes, download the APK from the build page link printed by the command.

Notes:
- If you don’t have an `eas.json` yet, `eas build` will generate one and prompt to create/link a project.
- The `preview` profile is set up for internal distribution (APK).

## App configuration
Icons, splash, and adaptive icons live in `assets/images/` and are referenced from `app.json`.

Got any feedback or questions? Join our [Discord](https://discord.gg/hgVf9R6SBm)

Got any feedback or questions? Join our [Discord](https://discord.gg/hgVf9R6SBm)
