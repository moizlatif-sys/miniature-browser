/**
 * Builds the document a published page is rendered in.
 *
 * Containment, in layers:
 *  1. The API has already sanitized the page (apps/api/src/html-policy).
 *  2. The iframe is `sandbox="allow-scripts"` with NO allow-same-origin, so it
 *     gets an opaque origin: it cannot read our DOM, cookies or storage, cannot
 *     navigate the top window, open popups, submit forms or download.
 *  3. This CSP allows exactly one script — the bridge below, by nonce — and
 *     blocks every network fetch: no images, fonts, frames, connections, forms.
 *
 * The bridge is fixed code. The only values interpolated into it are the
 * frame id and nonce, both generated here as hex. Publisher text is never
 * placed inside a <script>.
 */

export type FrameMessage =
  | { type: 'ready' }
  | { type: 'scroll'; y: number }
  | { type: 'navigate'; target: string }
  | { type: 'blocked'; target: string };

export interface RestoreMessage {
  type: 'restore';
  frameId: string;
  y: number | null;
  fragment: string | null;
}

export function randomHex(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

const HEX = /^[0-9a-f]+$/;

export function buildFrameDocument(safeHtml: string, frameId: string, nonce: string): string {
  if (!HEX.test(frameId) || !HEX.test(nonce)) throw new Error('frame id and nonce must be hex');

  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    "style-src 'unsafe-inline'", // authors only get vetted inline style attributes; <style> is stripped
    "img-src 'none'",
    "font-src 'none'",
    "media-src 'none'",
    "connect-src 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "object-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="no-referrer">
<style>${PAGE_STYLES}</style>
<script nonce="${nonce}">${bridgeScript(frameId)}</script>
</head>
<body>
<main class="mb-page">${safeHtml}</main>
</body>
</html>`;
}

/** The only script that ever runs inside a page frame. */
function bridgeScript(frameId: string): string {
  return `(function () {
  var FRAME = "${frameId}";
  var parentWin = window.parent;
  function send(msg) { msg.frameId = FRAME; parentWin.postMessage(msg, "*"); }
  function linkOf(node) { return node && node.closest ? node.closest("a") : null; }
  function follow(a) {
    var href = a.getAttribute("data-mb-href");
    if (href) send({ type: "navigate", target: href });
    else send({ type: "blocked", target: a.getAttribute("data-mb-blocked") || "" });
  }
  document.addEventListener("click", function (e) {
    var a = linkOf(e.target);
    if (!a) return;
    e.preventDefault();
    follow(a);
  }, true);
  document.addEventListener("auxclick", function (e) { if (linkOf(e.target)) e.preventDefault(); }, true);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var a = linkOf(e.target);
    if (a) { e.preventDefault(); follow(a); }
  }, true);

  var pending = null;
  window.addEventListener("scroll", function () {
    if (pending) return;
    pending = setTimeout(function () { pending = null; send({ type: "scroll", y: Math.round(window.scrollY) }); }, 150);
  }, { passive: true });

  window.addEventListener("message", function (e) {
    if (e.source !== parentWin) return;
    var d = e.data;
    if (!d || d.frameId !== FRAME || d.type !== "restore") return;
    if (typeof d.y === "number" && isFinite(d.y) && d.y >= 0) {
      window.scrollTo(0, d.y);
    } else if (typeof d.fragment === "string") {
      var el = document.getElementById(d.fragment);
      if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
    send({ type: "scroll", y: Math.round(window.scrollY) });
  });

  if (document.readyState === "complete") send({ type: "ready" });
  else window.addEventListener("load", function () { send({ type: "ready" }); });
})();`;
}

/** Validates a message from a page frame. Anything unexpected is dropped. */
export function readFrameMessage(data: unknown, frameId: string): FrameMessage | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.frameId !== frameId) return null;
  const okTarget = typeof d.target === 'string' && d.target.length <= 200;
  switch (d.type) {
    case 'ready':
      return { type: 'ready' };
    case 'scroll':
      return typeof d.y === 'number' && Number.isFinite(d.y) && d.y >= 0 && d.y < 10_000_000
        ? { type: 'scroll', y: d.y }
        : null;
    case 'navigate':
      return okTarget ? { type: 'navigate', target: d.target as string } : null;
    case 'blocked':
      return okTarget ? { type: 'blocked', target: d.target as string } : null;
    default:
      return null;
  }
}

const PAGE_STYLES = `
  html { background: #fff; }
  body { margin: 0; color: #1f2328; font: 17px/1.65 Georgia, 'Iowan Old Style', 'Times New Roman', serif; }
  .mb-page { max-width: 680px; margin: 0 auto; padding: 40px 24px 80px; overflow-wrap: break-word; }
  h1, h2, h3, h4 { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; line-height: 1.25; }
  h1 { font-size: 30px; margin: 0 0 20px; }
  h2 { font-size: 21px; margin: 32px 0 10px; }
  a[data-mb-href] { color: #2e6fd0; text-decoration: underline; cursor: pointer; }
  a[data-mb-href]:focus-visible, a[data-mb-blocked]:focus-visible { outline: 2px solid #2e6fd0; outline-offset: 2px; }
  a[data-mb-blocked] { color: #8a8f98; text-decoration: underline dotted; cursor: not-allowed; }
  blockquote { margin: 20px 0; padding: 4px 18px; border-left: 3px solid #cdd4db; color: #4a5868; font-style: italic; }
  pre { background: #f3f5f7; padding: 14px 16px; border-radius: 6px; overflow-x: auto; font-size: 14px; line-height: 1.5; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .9em; }
  table { border-collapse: collapse; width: 100%; font-size: 15px; margin: 16px 0; display: block; overflow-x: auto; }
  th, td { border: 1px solid #dde2e7; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f3f5f7; font-family: system-ui, sans-serif; font-size: 13px; }
  hr { border: 0; border-top: 1px solid #dde2e7; margin: 28px 0; }
  @media (max-width: 640px) { .mb-page { padding: 24px 16px 60px; } body { font-size: 16px; } }
`;
