# Miniature Browser

A small invented web stored in MongoDB, and a browser for reading it. Built with Next.js, NestJS, MongoDB, and TypeScript.

## Run

Requires Node.js 22+ and Docker (or any MongoDB on `127.0.0.1:27017`).

```bash
npm install
npm run db:up        # MongoDB via Docker Compose
npm run seed         # load the seeded web (safe to repeat)
npm run dev:api      # http://localhost:3001/api
npm run dev:web      # http://localhost:3000
```
