# Miniature Browser — Technical Implementation Plan

## 1. Purpose and scope

Build a small, understandable full-stack application that presents an invented web through a browser-like interface. Sites are single HTML documents stored in MongoDB, addressed by internal names such as `tidepool.zz`. These addresses do not register domains or resolve through DNS. The application looks them up in its own database.

The implementation must use Next.js, NestJS, MongoDB, and TypeScript. Aim for approximately eight focused hours within the assessment's three-calendar-day window. Prefer explicit state transitions and small feature modules over general-purpose frameworks or elaborate UI components.

This plan intentionally contains no testing workstream or testing tasks, per the project owner's instruction.

## 2. Assessment requirements and chosen interpretations

- Browse a site by typing its address or following an internal link.
- Support nonexistent addresses and broken links as ordinary navigation destinations.
- Implement back and forward, including truncating the forward branch after a new navigation.
- Restore previously displayed content and relevant view state when returning.
- Maintain scrollable, jumpable browsing history per selected person.
- Search titles and visible body text across all published sites.
- Allow any visitor to publish using a predefined person's identity.
- Contain untrusted HTML and explain the restrictions imposed on publishers.
- Provide deterministic, repeatable seed data: roughly ten sites, several people, multiple sites per author, and about an hour of browsing history.
- Deliver meaningful Git commits, exact startup/seed commands, and a four-to-five-minute narrated recording.

The opening description mentions a few hundred sites as background scale; the concrete seed requirement is roughly ten. Build efficient enough for hundreds, but seed approximately ten.

### Deliberate product boundaries

No authentication, registration, permission roles, bookmarks, multiple browser tabs, extensions, downloads, asset hosting, native shell, Electron, or real-web browsing. No page editing or deletion in the initial scope. A selected identity is a label, not verified ownership. Do not describe this mechanism as authentication.

"Restore on return" means returning to the HTML snapshot that was previously displayed, its page scroll position, or the preserved search results and their scroll position. Interactive publisher scripts, forms, and editable controls are excluded, so arbitrary application state inside a published page is not supported.

History records arrivals, including back/forward arrivals and missing addresses. Search queries are not separate browsing-history records. Search screens do participate in the navigation stack so returning from a result works correctly.

## 3. Repository and runtime layout

```text
miniature-browser/
  apps/
    web/
      src/app/
      src/components/browser/
      src/features/navigation/
      src/features/history/
      src/features/publishing/
      src/features/search/
      src/lib/api/
      src/lib/renderer/
    api/
      src/people/
      src/sites/
      src/visits/
      src/search/
      src/html-policy/
      src/seed/
      src/common/
  package.json
  package-lock.json
  docker-compose.yml
  .env.example
  .gitignore
  README.md
  IMPLEMENTATION_PLAN.md
```

Use npm workspaces. Keep frontend and backend as separate applications with one root lockfile. Avoid a shared package until duplication actually warrants one. API contracts can initially be small explicit TypeScript types in the frontend and DTOs in the backend.

MongoDB runs through Docker Compose with a named volume. Next.js and NestJS run as normal development processes. Suggested local ports: frontend 3000, API 3001, MongoDB 27017. Bind MongoDB to the loopback interface for local development. Configuration must come from environment variables; provide examples without real secrets.

The Next.js root layout remains a server component. The browser workspace is a client component because navigation, iframe messaging, and session restoration require browser APIs. The frontend sends JSON requests to NestJS; it never connects directly to MongoDB. Restrict development API CORS to the configured frontend origin.

Use plain CSS or CSS modules. Do not add a large component library, global state library, message broker, or search service.

## 4. Persistence model

Use NestJS feature modules and Mongoose schemas with explicit indexes and timestamps. Serialize MongoDB identifiers as strings in JSON.

### Person

Fields: `_id`, `name`, `seedKey?`, `createdAt`, `updatedAt`.

`seedKey` provides stable seed identity. People are read-only through the public API. A fixed list of seeded identities is sufficient.

### Site

Fields: `_id`, `address`, `title`, `authorId`, `sourceHtml`, `safeHtml`, `bodyText`, `sanitizerVersion`, `seedKey?`, `createdAt`, `updatedAt`.

- `address`: normalized internal address with a unique index.
- `title`: explicit title, shown in search and history.
- `authorId`: required reference to an existing person.
- `sourceHtml`: submitted source, never rendered directly or included in normal read responses.
- `safeHtml`: sanitized HTML fragment, excluding the application's trusted renderer code.
- `bodyText`: normalized visible text extracted from sanitized markup for searching.
- `sanitizerVersion`: permits reprocessing stored content if the HTML policy changes.

Store safe HTML at publication time. Build the iframe wrapper in the frontend from this safe fragment. If stored data predates the current sanitizer policy, reprocess it before serving or require a migration. A version field alone does not enforce safety.

### Visit

Fields: `_id`, `personId`, `address`, `siteId?`, `titleSnapshot`, `outcome`, `method`, `navigationEntryId`, `eventId`, `visitedAt`, `seedKey?`.

`outcome`: `found` or `not_found`.

`method`: `typed`, `link`, `back`, `forward`, `history`, or `search_result`.

`eventId` is a client-generated unique identifier for a single arrival. A unique index prevents duplicate records when a request is retried. Revisiting the same navigation entry later creates a fresh event ID.

Indexes: unique `eventId`; compound `{ personId: 1, visitedAt: -1, _id: -1 }` for stable history pagination. Keep title snapshots so history remains intelligible if content changes in a future version.

The backend resolves site metadata for a requested address. Do not accept arbitrary client-provided titles or outcomes as authoritative history data. A missing identity returns a validation error; it is not silently created.

## 5. Address and publication rules

Normalize addresses by trimming surrounding whitespace and converting ASCII letters to lowercase. Initial format: one label followed by `.zz`, with a total label length of 1–63 characters. The label starts and ends with an ASCII letter or digit; internal hyphens are allowed. Examples: `garden.zz`, `night-radio.zz`.

Reject schemes, ports, paths in the stored address, credentials, spaces, Unicode lookalikes, and query strings. Fragments are navigation metadata, not part of a site's stored address. Return clear field-level errors.

Title length: 1–120 trimmed characters. HTML source limit: 100 KiB measured as UTF-8 bytes. Apply a compatible server request-body limit. Reject content with no meaningful displayable text after sanitization. Render titles and excerpts through React text nodes, never as HTML.

Creation is atomic through the unique address index. A preflight lookup may improve feedback but cannot replace that index. Map duplicate-key errors to HTTP 409.

There is no author exclusivity check: anyone may choose a seeded identity. This is intentional within the assessment.

## 6. API contract

All routes are prefixed `/api`. Keep controllers thin; services own normalization, database work, sanitization, and domain decisions.

### GET /people

Return the predefined people ordered consistently by name and ID.

### GET /sites/:address

Normalize and validate the address. Return `id`, `address`, `title`, `author`, `safeHtml`, and `updatedAt`. Return HTTP 404 with a structured `SITE_NOT_FOUND` error for valid addresses that do not exist. Invalid syntax returns HTTP 400.

### POST /sites

Request: `{ address, title, authorId, html }`.

Validate the identity, normalize fields, sanitize markup, extract searchable text, and persist the site. Return HTTP 201 with the normal safe site representation. Use HTTP 400 for invalid fields and HTTP 409 for an occupied address.

### GET /search?q=...&limit=...

Trim and normalize the query, cap it at 200 characters, and require at least one non-whitespace character. Bound the limit to 1–50; default 20. Return `{ query, results, truncated }`.

Each result includes site ID, address, title, author name, and a plain-text excerpt. Search both title and `bodyText`, with deterministic ranking: title match before body-only match, then address alphabetically.

For the assessment's scale, use a bounded substring query over persisted text. Escape every regular-expression metacharacter if implementing MongoDB matching with a regex. Never execute user input as a raw regex. This approach is suitable for hundreds of modest pages; a large production corpus would require indexed search.

### POST /visits

Request: `{ eventId, personId, address, method, navigationEntryId }`.

Resolve address metadata server-side, assign the server timestamp, and create or return the existing record for the same event ID. Found and missing addresses both produce visits. The visit service must preserve snapshot metadata when an arrival is restored from an existing navigation entry; use the original persisted visit as the source when needed rather than trusting arbitrary snapshot fields.

### GET /people/:personId/visits?cursor=...&limit=...

Return newest-first history with stable cursor pagination. Encode the last returned `visitedAt` and `_id` in the cursor. Validate cursor shape and cap page size. Return `{ items, nextCursor }`.

### Error shape

Use `{ code, message, fieldErrors? }`. Distinguish invalid input, missing pages, duplicate addresses, and temporary transport failures. A network error must not masquerade as a nonexistent site.

## 7. Navigation state machine

Implement a pure reducer plus a controller hook. Components dispatch intentions rather than editing arrays directly.

```ts
type BrowserState = {
  personId: string;
  entries: NavigationEntry[];
  cursor: number;
  pendingRequestId: string | null;
};

type NavigationEntry =
  | { id: string; kind: 'site'; address: string; snapshot: SiteSnapshot;
      scrollY: number; fragment?: string; originalVisitId?: string }
  | { id: string; kind: 'missing'; address: string; scrollY: number }
  | { id: string; kind: 'search'; query: string; results: SearchResult[];
      truncated: boolean; scrollY: number };
```

The address-bar draft is separate from the committed destination. Typing does not mutate navigation. Failed transport requests leave the current page intact and expose a retryable error. A confirmed 404 creates a missing-page entry.

### New destination

1. Capture current entry scroll state.
2. Assign a request ID and begin resolution.
3. Ignore responses whose request ID is no longer current.
4. On successful resolution or confirmed 404, truncate entries after the cursor.
5. Append the new entry and move the cursor to it.
6. Display its snapshot and record one arrival event for site/missing entries.

Keep pending network state outside committed entries. Cancel superseded requests with AbortController, and also retain a request-ID guard because cancellation alone does not guarantee ordering.

### Back and forward

Capture the current scroll state, cancel pending navigation, move the cursor within bounds, and display the stored entry. Do not refetch a page to restore its snapshot. Disable controls when no corresponding entry exists. Restoring a site/missing entry records a new arrival; restoring a search entry does not.

### History jumps and search results

Opening a history item resolves its address as a fresh navigation and truncates the forward branch. Opening a search result behaves the same way with `search_result` as the arrival method. Search submissions themselves create search entries, enabling back to prior results without rerunning the query.

### Fragments

Allow `#section` and `garden.zz#section` links. Resolve the site address separately from its fragment. Same-page fragment moves are explicit navigation entries with their own saved scroll position. Use `getElementById` inside the trusted bridge; do not interpolate fragment text into CSS selectors or executable code.

### Person switching and refresh

Maintain an independent navigation stack per selected person in sessionStorage. Persist versioned snapshots after state changes and throttle scroll writes. Changing identity cancels pending requests and restores that identity's stack. Search and publishing requests capture the person ID at dispatch so late responses do not update another person's session.

Handle unavailable storage, invalid stored JSON, schema-version mismatch, and quota errors gracefully. Cap persisted navigation to a documented bound such as 50 entries per person and impose a total byte budget. Prune oldest entries while keeping the active entry. Database visit history remains independent of this session limit.

## 8. Untrusted HTML containment

Use a maintained HTML sanitizer on the backend with explicit configuration. Do not write a regex-based sanitizer. Implementation must consult current official documentation for the chosen package and browser sandbox/CSP semantics before selecting exact options.

### Author capabilities

Allow semantic text elements, headings, lists, blockquotes, tables, code/preformatted blocks, anchors, and a limited set of presentation styles. Preserve safe IDs for fragment links. Limit nesting and source size through the parser's supported controls where available.

Block scripts, event-handler attributes, forms and controls, editable content, iframe/object/embed, SVG/MathML, images, audio/video, resource links, metadata, base elements, and author-provided style blocks. Strip unknown attributes and disallowed protocols. Do not allow publisher JavaScript or arbitrary CSS.

If inline styling is supported, use an explicit property/value allowlist: selected colors, text alignment, font weight/style, bounded spacing, and borders. Reject URLs, imports, custom properties, positioning, transforms, and values that permit resource fetching. Keeping this list small is preferable to attempting full CSS safety.

### Iframe boundary

Render a generated document using iframe `srcDoc`. Use `sandbox="allow-scripts"` only for the application's fixed bridge. Do not add `allow-same-origin`, top-navigation, popups, forms, or downloads permissions. The frame therefore has an opaque origin and cannot access the parent DOM or application storage.

A CSP meta tag must precede content. Start from `default-src 'none'`; explicitly deny connections, frames, objects, media, images, fonts, form actions, and base URLs. Permit only the exact trusted bridge through a generated nonce or script hash, plus the approved local styles. Do not depend on unsupported CSP navigation directives to enforce link behaviour.

The trusted bridge is fixed application code, inserted separately after sanitization. Never interpolate publisher strings into its JavaScript. No author element may obtain its nonce. Rebuild the iframe document with a fresh frame instance identifier when changing entries.

### Links and messages

Sanitization stores accepted internal destinations in controlled data attributes and removes executable/external link destinations. The bridge prevents ordinary anchor default behaviour, extracts the internal destination, and sends a typed message to the parent. Invalid or external destinations are blocked with understandable feedback. Account for modifier clicks and context-menu behaviour by ensuring the HTML contains no usable external navigation URL.

Because the sandbox frame has an opaque origin, messages may have origin `null`. Do not treat that string as proof of identity. The parent checks `event.source === iframe.contentWindow`, validates a strict message shape, checks the current frame instance identifier, bounds all values, and accepts only known message types. Publishing changes or API operations must never be driven by arbitrary iframe messages.

A parent-to-frame restore message may require a wildcard target origin for an opaque frame. The bridge must check that its source is `window.parent`, validate its frame identifier and payload, and accept only scroll restoration instructions.

### Restoration handshake

The bridge reports ready after document layout, then receives the saved scroll position or fragment target. It reports scroll changes at a throttled rate and responds to explicit capture requests. Include a bounded capture timeout before navigation; if a response does not arrive, use the latest reported position. Ignore messages from replaced frames.

Security costs to explain in the recording: no publisher scripts, interactive forms, external assets, arbitrary styling, or real external browsing. The HTML remains useful for prose, structured content, code, tables, and internal links.

## 9. Search and publishing behaviour

A search screen belongs to the browser navigation model. Store the submitted query and returned result snapshot, not merely the text currently in the search field. Returning to results restores that snapshot and scroll position. Repeating a search explicitly fetches current data, including newly published pages.

Extract body text through the sanitized document parser, decoding entities and normalizing whitespace. Exclude scripts, styles, comments, and hidden infrastructure from searchable text. Generate a short plain-text excerpt around the first matching body occurrence. Render optional highlighting as React text segments, never injected HTML.

Publishing uses a simple panel with selected author, address, title, and HTML textarea. Display the supported HTML policy beside the input. Keep field values after validation or transport errors. Disable duplicate submissions while a request is pending. On success, show the canonical address and an explicit Open page action. Opening creates a normal navigation entry; publishing alone does not fabricate a visit.

## 10. History and failure handling

Load history only for the selected person. Show title or missing-page label, address, time, and arrival method. Use Load more with cursor pagination inside a scrollable panel. Clear stale history responses when identity changes.

Visit persistence occurs after the page is committed to the interface. Generate an event ID before dispatch and retain it during retries. Failed visit writes should show a small nonblocking History not saved status with retry; they must not cause a displayed page to disappear. An application-controlled pending queue may retry while the page is open, but must retain the original person and event IDs.

Use explicit empty states for no history and no search results. Distinguish unavailable API/database, invalid address, and missing page. Error messages should explain the immediate action a user can take without exposing database traces.

## 11. Deterministic seed design

Use fixed identifiers and an explicit seed dataset. Include approximately ten fictional sites across different subjects, with several paragraphs each, overlapping vocabulary for useful search, multiple inbound/outbound links, and intentional dead-end addresses. At least two authors own multiple sites.

Create several people with distinct visit patterns: repeat visits, two long trails, and one person visiting nearly all sites. Use timestamps relative to a fixed seed epoch spread across approximately one hour. Store distinct arrival methods and a few missing-page visits.

Use upserts keyed by stable IDs or seed keys. Repeating the command restores the same seed-owned records without multiplying them. Do not delete user-created sites or visits. Avoid collisions by reserving explicit seed addresses; report a conflict rather than silently overwriting a user's unrelated record. Seed history points to the fixed seeded identities and sites.

## 12. Ten meaningful commits

### 1 — chore: scaffold workspace and local services

Create npm workspaces, Next.js and NestJS applications, TypeScript configuration, MongoDB Compose service, environment examples, ignore rules, and initial startup commands. Include this plan. Keep dependency versions locked after installation. Exclude node_modules, local environment files, build output, and recordings from Git.

### 2 — feat: add people sites and visits persistence

Implement database connection, schemas, indexes, DTO validation, error mapping, person listing, site lookup, and visit persistence/query services. Keep public publishing disabled until the HTML policy is implemented.

### 3 — feat: seed deterministic miniature web

Add fixed people, approximately ten authored pages, a connected link graph with broken links, and deterministic browsing history. Add the repeatable root seed command.

### 4 — feat: add browser shell and address navigation

Build the restrained interface, person selection, address input, loading states, and distinct missing-page/network-error views. Display content initially as escaped text or a safe placeholder until the containment layer is ready.

### 5 — feat: contain published html and handle links

Implement the sanitizer policy, searchable text extraction, safe iframe document builder, CSP, trusted bridge, message validation, internal-link handling, fragment handling, and scroll reporting. Reprocess seeded HTML through the same policy.

### 6 — feat: implement navigation and restoration

Add typed reducer/controller transitions, request cancellation, back/forward, branch truncation, page snapshots, scroll capture/restoration, per-person stacks, and bounded session persistence.

### 7 — feat: record and browse per-person history

Connect arrival events to persistence with idempotent retry, implement paginated history, and allow history jumps. Keep chronological visits separate from navigation entries.

### 8 — feat: search page titles and content

Implement bounded title/body searching, deterministic ranking, excerpts, search navigation entries, opening results, and preserved return-to-results behaviour.

### 9 — feat: publish pages with validation

Expose secure page creation, author selection, HTML policy guidance, duplicate-address handling, field errors, and the success/Open page interaction. Newly published pages become available immediately through lookup and a subsequent search.

### 10 — chore: finalize interface and submission commands

Finish concise labels, accessible controls, responsive layout, keyboard interactions, empty/error states, and exact startup/seed commands. Remove unused scaffolding. Add a recording outline and clearly state deliberate scope limits. This commit marks implementation completion; the owner still records the narrated demonstration.

Make commits reflect real completed work. Do not create empty commits, manufacture historical timestamps, or stage unrelated local files. A substantial unexpected correction may justify an additional honest commit rather than forcing misleading history.

## 13. Interface details

Use a compact top toolbar, a clearly bounded document viewport, and small history/publishing panels. Native buttons and inputs are sufficient. Back/forward have accessible labels and visible disabled states. Enter submits the address/search forms. Focus stays predictable after panel open/close. Do not rely on color alone for errors.

On small screens, controls wrap while the page viewport remains usable. Long addresses and titles wrap or truncate with access to their full text. The browser toolbar is outside the iframe, preventing author styles from affecting it.

Browser-internal back/forward controls are authoritative. Synchronizing with the host browser's own back button is outside this plan; do not partially wire two independent navigation systems together.

## 14. Submission and repository handling

The repository was created public at `https://github.com/moizlatif-sys/miniature-browser`. The assessment asks that solved interview submissions not be published while the exercise is in use. Change visibility to private before pushing implementation, subject to the owner's authorization. Keep company code, tokens, SSH keys, real user data, and local environment values out of this repository.

README should primarily contain exact commands for prerequisites, environment setup, MongoDB startup, dependency installation, API/frontend startup, and seeding. Keep the detailed design in this implementation plan for development; the assessment requests spoken design explanation rather than a separate essay.

Recording outline, four to five minutes:

1. Select an identity and follow a four-page trail.
2. Move back and forward, showing restoration.
3. Branch after going back and explain why the forward destination disappears.
4. Search body content, open a result, and return to preserved results.
5. Show per-person history and jump to a visit.
6. Publish a simple page and open its address.
7. Follow a broken link or enter a nonexistent address.
8. Explain the model, HTML boundary, restrictions, and deliberate omissions.

The recording must have the owner's voice narration. Implementation completion does not substitute for that deliverable.

## 15. Implementation refinements

These decisions were made while building, to keep the code small and easy to read later. They refine, not replace, the sections above.

### Concrete choices

- **Versions:** Next.js 16 (App Router) and React 19; NestJS 11 with Mongoose 8; TypeScript 5.9. These are pinned exact in `package.json` so the lockfile is reproducible.
- **Sanitizer:** `sanitize-html`, configured with explicit tag, attribute, scheme, and inline-style allowlists in `apps/api/src/html-policy/html-policy.ts`. Searchable text is extracted from the sanitized output with `htmlparser2`, which decodes entities and spaces block elements apart.
- **Config:** `@nestjs/config` (API) and `dotenv` (seed) load `apps/api/.env` when present. Every value has a working local default, so `.env` files are optional.
- **MongoDB:** `docker-compose.yml` is the documented way to run it. Any MongoDB 6+ on `127.0.0.1:27017` works the same way.

### How the pieces actually work

- **Omnibox.** The address bar accepts an address (`garden.zz`, `garden.zz#beds`), a same-page fragment (`#beds`), or anything else, which becomes a search. Text that looks like a broken address (it ends in `.zz` or has a scheme) gets an "is not an address" error instead of being searched.
- **Links are rewritten at publish time.** An `<a href="garden.zz#pond">` is stored as `<a data-mb-href="garden.zz#pond">` with no `href`. External, `javascript:`, and invalid targets become `<a data-mb-blocked="…">`, which shows a notice when clicked. Because no stored anchor has a usable `href`, modifier clicks, middle clicks, and "open in new tab" have nothing to open.
- **Policy versioning.** `HTML_POLICY_VERSION` is stored on every site. On API start, every site with an older version is re-sanitized from its stored source, so nothing stale is ever rendered or searched.
- **Visits are always resolved server-side.** Sites cannot be edited in this scope, so the current title equals the snapshot title. `originalVisitId` is not needed and is left out of navigation entries.
- **One navigation module.** `apps/web/src/features/navigation/` holds a pure reducer (`reducer.ts`), session persistence (`storage.ts`), and one controller hook (`useBrowser.ts`). Components only call its intentions: `go(input, method)`, `back`, `forward`, `retry`, `reportScroll`, `blocked`.
- **Scroll capture is push-based.** The bridge reports scroll position at most every 150 ms, and every link click carries the exact current position. So navigation never waits on a request/response round trip with the frame. The only window for loss is scrolling and then pressing the toolbar's Back within 150 ms.
- **Fragments.** Same-page moves (`#beds`) are new entries over the same snapshot. They remount the frame, which scrolls to the target with `getElementById`, and they record a visit like any other arrival.
- **Search** runs two bounded, escaped, case-insensitive queries: title matches first, then body-only matches, each sorted by address. Substring matching means `light` also finds "slightly". That is accepted at this scale.
- **Visit retries:** a failed visit write keeps its `eventId` and shows a "History not saved, Retry" notice. Because the event ID is unique, a retry can never create a duplicate.
- **Keyboard:** Alt+←/→ work from the toolbar and from inside a page frame, which forwards them through the bridge as a validated `key` message. Escape closes a panel and returns focus to the address bar.

### File map (where to look later)

| Concern | File |
| --- | --- |
| Address rules | `apps/api/src/common/address.ts` (mirrored in `apps/web/src/lib/address.ts`) |
| HTML policy (what authors may write) | `apps/api/src/html-policy/html-policy.ts` |
| Iframe document, CSP, trusted bridge, message validation | `apps/web/src/lib/renderer/frame-document.ts` |
| Parent-side frame handling (source and frame-id checks) | `apps/web/src/components/browser/PageFrame.tsx` |
| Back/forward/truncation logic | `apps/web/src/features/navigation/reducer.ts` |
| Request lifecycle, per-person stacks | `apps/web/src/features/navigation/useBrowser.ts` |
| Visit writes and retry | `apps/web/src/features/history/useVisitRecorder.ts` |
| Search ranking and excerpts | `apps/api/src/search/search.service.ts` |
| Publishing rules | `apps/api/src/sites/sites.service.ts` (`create`) |
| Seed data and link graph | `apps/api/src/seed/seed-data.ts` |

## 16. Recording script

This is a walk that the seed data supports exactly. Pick **Juno Park** (the person who has been nearly everywhere).

1. **Trail four deep.** Type `start.zz`. Click *The Tidepool Log*, scroll down a little, then click *old light*, then *Night Radio*.
2. **Back and forward.** Press Back twice. Tidepool comes back at the scroll position you left. Press Forward once to reach the lighthouse. Say: "Back and forward only move a cursor over stored snapshots; nothing is refetched."
3. **Lose forward.** From the lighthouse, go Back to tidepool, then click *a collection of found things* (driftwood). Forward is now disabled: the lighthouse/night-radio branch is gone, as in every browser.
4. **Search.** Type `fold`. It matches three pages by body text only. Scroll the results, open *mapmaker.zz*, then press Back. The same results come back at the same scroll, and the query is not rerun.
5. **History.** Open History. It shows the seeded hour plus everything you just did, each with how you arrived. Click an older entry to jump there.
6. **Publish.** Open Publish, then Insert example. Add `<script>alert(1)</script>` and `<a href="https://example.com">out</a>`, then publish at `my-corner.zz`. Open the page: the script is gone and the external link is greyed out with a notice.
7. **Nowhere.** On tidepool, click *seaglass.zz* (a broken link), or type `nowhere.zz`. "Nothing here" appears and is recorded in history as such.
8. **Explain** while showing `html-policy.ts` and `frame-document.ts`:
   - The model: entries plus a cursor, and visits as server-resolved facts.
   - The two walls: the sanitizer, then a sandbox with no `allow-same-origin` plus a CSP that allows only the bridge by nonce.
   - What authors lose: scripts, forms, images and other media, arbitrary CSS, and external links.
   - What was left out (section 17).

## 17. Deliberately left out

- Editing or deleting pages, accounts, and proof that a publisher is who they picked.
- Images and any other asset hosting. Pages are text and structure only.
- Syncing with the host browser's own back button and URL. The in-app toolbar is authoritative.
- Indexed full-text search and stemming. Substring search is enough for hundreds of pages.
- Automated tests, per the project owner's instruction. Behaviour was checked by driving the running app in a headless browser during development.
