# ORPHEUS ARG

This app is set up to be **global and multi-device by default** with **Firebase Hosting + Firebase Realtime Database**.

## What to configure

1. Create a Firebase project.
2. Enable **Realtime Database**.
3. Copy `firebase-config.example.js` to `firebase-config.js`.
4. Put your Realtime Database URL in `firebase-config.js`.
5. Copy `.firebaserc.example` to `.firebaserc` and set your Firebase project id.
6. Deploy with Firebase Hosting.

## Local run

You can still preview locally with any static server, for example:

```bash
python -m http.server 3000
```

Then open `http://localhost:3000`.

## Firebase deploy

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

## Files added for Firebase

- `firebase-config.js`: local Firebase database URL config
- `firebase-config.example.js`: example config template
- `firebase.json`: Firebase Hosting + Realtime Database configuration
- `database.rules.json`: starter Realtime Database rules
- `.firebaserc.example`: example Firebase project mapping

## Notes

- The starter database rules are open for quick setup. Tighten them before public production use.
- Multi-device chat and shared player data sync through Firebase Realtime Database.
- The old Node/Render server files are still present, but Firebase is now the intended deployment path.
