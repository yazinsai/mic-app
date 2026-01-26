# mic-app

mic-app is a voice-to-action app that captures audio, transcribes it, extracts actionable items, and **executes them with Claude Code**. Record a voice note on your phone describing a bug, feature, or idea—and watch it get implemented automatically.

## How it works

```
Phone (mic-app)                        Mac (voice-listener)
      │                                       │
      ├─ Record audio                         │
      ├─ Upload to cloud                      │
      ├─ Transcribe via Groq                  │
      ├─ Write to InstantDB ─────────────────>│
      │                                       │
      │                              ┌────────┴────────┐
      │                              │                 │
      │                         [Extractor]      [Executor]
      │                              │                 │
      │                         Extract &         Spawn Claude
      │                         classify          Code to implement
      │                              │                 │
      │                              └────────┬────────┘
      │                                       │
      │<────────── Real-time sync ────────────│
      │                                       │
      ├─ Display actions in UI                │
      ├─ View results & deployed apps         │
      └─ Provide feedback via thread          │
```

## Features

- **Voice recording** with pause/resume
- **Auto-transcription** via Groq Whisper
- **Action extraction** via Claude (bugs, features, todos, notes, questions, commands, ideas)
- **Automatic execution** via Claude Code
- **Thread-based feedback** - iterate on any action with back-and-forth conversation
- **Deploy URLs** - tap to open deployed prototypes
- **Real-time sync** between phone and Mac via InstantDB

## Voice Listener (Mac)

The `voice-listener/` directory contains two workers:

1. **Extractor** - Polls for transcriptions, extracts & classifies actions
2. **Executor** - Picks up pending actions, spawns Claude Code to implement them

### Setup

```bash
cd voice-listener
bun install
```

Create `voice-listener/.env`:
```
INSTANT_APP_ID=your-app-id
INSTANT_ADMIN_TOKEN=your-admin-token
```

### Running

```bash
# Start both workers (recommended)
./start.sh

# One-shot mode (process once and exit)
./start.sh --once

# Or run workers individually:
bun run extract    # Extraction only
bun run execute    # Execution only
```

### CLI Options

Both workers support:
- `--dry-run` - Preview without making changes
- `--once` - Process once and exit
- `--limit N` - Only process N items

```bash
# Test extraction
bun run src/index.ts --dry-run --once --limit 1

# Test execution
bun run src/action-executor.ts --dry-run --once --limit 1
```

## Development

```bash
# Start the Expo dev server
npm run start

# Push schema changes
npx instant-cli push schema --app $INSTANT_APP_ID --token $INSTANT_ADMIN_TOKEN --yes

# Push permission changes
npx instant-cli push perms --app $INSTANT_APP_ID --token $INSTANT_ADMIN_TOKEN --yes
```

## First-time setup

1. Install deps:
```bash
npm install
```

2. Initialize InstantDB for this project:
```bash
npx instant-cli init
```

3. Create a `.env` file from the example and fill in the values:
```bash
cp .env.example .env
```

Required env vars:
- `EXPO_PUBLIC_INSTANT_APP_ID` (InstantDB app id)
- `EXPO_PUBLIC_GROQ_API_KEY` (Groq API key for transcription)
- `INSTANT_APP_ADMIN_TOKEN` (InstantDB admin token, for CLI commands)

## Build an Android APK (EAS)

This project uses Expo Application Services (EAS) to build APKs in the cloud.

1. Install and log in to EAS:
```bash
npm i -g eas-cli
eas login
```

2. Build an APK (internal distribution):
```bash
eas build -p android --profile preview
```

3. When the build finishes, download the APK from the build page link.

## Install on iOS (EAS)

Build an internal .ipa:
```bash
eas build -p ios --profile preview
```

For TestFlight distribution:
```bash
eas build -p ios --profile production
eas submit -p ios --latest
```

Notes:
- You'll need an Apple Developer account for iOS builds.
- `app.json` includes the iOS bundle ID: `com.yazinsai.micapp`.

## App configuration

Icons, splash, and adaptive icons live in `assets/images/` and are referenced from `app.json`.

Got any feedback or questions? Join our [Discord](https://discord.gg/hgVf9R6SBm)
