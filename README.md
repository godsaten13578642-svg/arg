# ORPHEUS ARG

This app is set up for **option 2**: deploy the whole project on a Node-capable host so the browser and shared API run from the same origin.

## Run locally

```bash
npm start
```

Then open `http://localhost:3000`.

## Deploy

Deploy to any platform that can run Node and keep a writable data file:

- Render
- Railway
- Fly.io
- VPS / Docker / PM2

### Environment

- `PORT`: HTTP port for the web server
- `ORPHEUS_DATA_FILE`: optional absolute/relative path for the persisted shared-state JSON file

### Health check

Use:

```
/healthz
```

## Notes

- Multi-device chat and shared player data depend on the built-in shared API provided by `server.js`.
- Static-only hosting such as GitHub Pages will not run that API layer.
