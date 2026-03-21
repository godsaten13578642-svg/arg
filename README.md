# ORPHEUS ARG

This app is set up to be **global and multi-device by default** when you deploy the whole project on a Node-capable host so the browser and shared API run from the same origin.

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

## Render deploy

This repo now includes a `render.yaml` blueprint for Render.

> Important: Render persistent disks require a paid web service instance, so the blueprint uses the `starter` plan instead of the free plan.

### What it does

- creates a Node web service
- runs `npm start`
- uses `/healthz` as the health check
- mounts a persistent disk at `/var/data` on a paid Render web service
- stores shared state in `/var/data/global-state.json`

### Render steps

1. Push this repo to GitHub.
2. In Render, create a **Blueprint** deployment from the repo.
3. Let Render apply `render.yaml`.
4. Wait for the first deploy to finish.
5. Open the Render URL for the site.
6. Use that same Render URL on every device.

When everyone uses the same Render URL, chat, accounts, and owner dashboard data are shared by default.

## Manual environment

If you deploy somewhere besides Render, set:

- `PORT`: HTTP port for the web server
- `ORPHEUS_DATA_FILE`: writable path for the persisted shared-state JSON file

## Health check

Use:

```
/healthz
```

## Notes

- Multi-device chat and shared player data depend on the built-in shared API provided by `server.js`.
- Static-only hosting such as GitHub Pages will not run that API layer.
