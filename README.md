# Miniature Browser

A small invented web stored in MongoDB, and a browser for reading it. Next.js · NestJS · MongoDB · TypeScript.

## Run

Requires Node.js 22+ and Docker. (Any MongoDB 6+ listening on `127.0.0.1:27017` works instead of Docker.)

```bash
npm install
npm run db:up        # start MongoDB (Docker Compose)
npm run seed         # load the seeded web; safe to run again
```

Then, in two terminals:

```bash
npm run dev:api      # API on http://localhost:3001/api
npm run dev:web      # browser on http://localhost:3000
```

Open http://localhost:3000.

## Other commands

```bash
npm run build        # production build of both apps
npm run typecheck    # type-check both apps
npm run db:down      # stop MongoDB (data is kept in a Docker volume)
```

Defaults need no configuration. To change ports or the database URL, copy the values from `.env.example` into `apps/api/.env` and `apps/web/.env.local`.
