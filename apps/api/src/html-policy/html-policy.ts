import { Parser } from 'htmlparser2';
import sanitizeHtml from 'sanitize-html';
import { isValidAddress, splitTarget } from '../common/address';

/**
 * What a published page is allowed to contain.
 *
 * This is the first of two walls. The second is the sandboxed iframe the
 * browser renders into (apps/web/src/lib/renderer/frame-document.ts). Either
 * one alone should stop a page escaping; together they make it boring.
 *
 * Authors can write: headings, paragraphs, lists, quotes, tables, code,
 * emphasis, internal links (`garden.zz`, `garden.zz#beds`, `#beds`), ids for
 * fragment targets, and a small set of inline styles.
 *
 * Authors cannot write: scripts, event handlers, forms or inputs, iframes,
 * objects, SVG, MathML, images, audio, video, <style>, <link>, <meta>, <base>,
 * or links to anything outside this web.
 *
 * Bump HTML_POLICY_VERSION whenever this file changes; stored pages made with
 * an older version are reprocessed when the API starts.
 */
export const HTML_POLICY_VERSION = 1;

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'div', 'span', 'section', 'article',
  'header', 'footer', 'aside', 'nav', 'main',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'q', 'cite', 'figure', 'figcaption',
  'pre', 'code', 'kbd', 'samp', 'var',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup', 'abbr', 'time',
  'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'a',
];

/** Ids are kept so fragment links work; anything odd-looking is dropped. */
const SAFE_ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

const COLOR = [/^#[0-9a-f]{3}$/i, /^#[0-9a-f]{6}$/i, /^[a-z]{3,20}$/i];
const LENGTH = [/^0$/, /^\d{1,2}(\.\d)?(px|em|rem)$/];

/** Inline styles: exact properties, each value matched whole. No url(), no positioning. */
const ALLOWED_STYLES: Record<string, RegExp[]> = {
  color: COLOR,
  'background-color': COLOR,
  'text-align': [/^(left|right|center|justify)$/],
  'font-weight': [/^(normal|bold|[1-9]00)$/],
  'font-style': [/^(normal|italic)$/],
  'text-decoration': [/^(none|underline|line-through)$/],
  'font-size': [/^(small|medium|large|x-large)$/, /^\d(\.\d)?em$/],
  margin: LENGTH,
  'margin-top': LENGTH,
  'margin-bottom': LENGTH,
  padding: LENGTH,
  border: [/^\d(px)? (solid|dashed|dotted) (#[0-9a-f]{3,6}|[a-z]{3,20})$/i],
  'border-radius': LENGTH,
};

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  // Everything not listed is removed together with its contents if it is
  // a script-like tag, or unwrapped (text kept) otherwise.
  disallowedTagsMode: 'discard',
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'title', 'template', 'svg', 'math', 'iframe', 'object'],
  allowedAttributes: {
    '*': ['id', 'title', 'style'],
    a: ['data-mb-href', 'data-mb-blocked', 'tabindex', 'role'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan', 'scope'],
    ol: ['start', 'reversed'],
    time: ['datetime'],
  },
  allowedStyles: { '*': ALLOWED_STYLES },
  allowedSchemes: [],
  allowProtocolRelative: false,
  nestingLimit: 40,
  transformTags: {
    // One pass over every tag: rewrite links, and drop ids that are not plain words.
    '*': (tagName, attribs) => {
      const next = tagName === 'a' ? rewriteLink(attribs) : { ...attribs };
      if (next.id !== undefined && !SAFE_ID.test(next.id)) delete next.id;
      return { tagName, attribs: next };
    },
  },
};

/**
 * Links never keep an `href`. Internal destinations move to `data-mb-href`,
 * which only our trusted bridge reads; anything else becomes `data-mb-blocked`.
 * With no `href` left, middle-click, "open in new tab" and drag-to-tab have
 * nothing to open.
 */
function rewriteLink(attribs: sanitizeHtml.Attributes): sanitizeHtml.Attributes {
  const href = (attribs.href ?? '').trim();
  const kept: sanitizeHtml.Attributes = { tabindex: '0', role: 'link' };
  if (attribs.id) kept.id = attribs.id;
  if (attribs.title) kept.title = attribs.title;

  const internal = toInternalTarget(href);
  if (internal) kept['data-mb-href'] = internal;
  else kept['data-mb-blocked'] = href.slice(0, 200) || 'empty link';
  return kept;
}

/** Returns a canonical internal target (`garden.zz`, `garden.zz#x`, `#x`), or null. */
function toInternalTarget(href: string): string | null {
  if (!href || href.length > 200) return null;
  if (href.startsWith('#')) return SAFE_ID.test(href.slice(1)) ? href : null;
  const { address, fragment } = splitTarget(href);
  if (!isValidAddress(address)) return null;
  if (fragment && !SAFE_ID.test(fragment)) return address;
  return fragment ? `${address}#${fragment}` : address;
}

export interface PreparedHtml {
  safeHtml: string;
  bodyText: string;
  version: number;
}

export function prepareHtml(source: string): PreparedHtml {
  const safeHtml = sanitizeHtml(source, SANITIZE_OPTIONS).trim();
  return { safeHtml, bodyText: extractText(safeHtml), version: HTML_POLICY_VERSION };
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'br', 'hr', 'li', 'dt', 'dd', 'tr', 'td', 'th', 'pre', 'blockquote', 'section', 'article',
  'header', 'footer', 'aside', 'nav', 'main', 'figure', 'figcaption', 'caption', 'table',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'dl',
]);

/** Visible text of already-sanitized HTML, entities decoded, whitespace collapsed. */
export function extractText(safeHtml: string): string {
  const parts: string[] = [];
  const parser = new Parser(
    {
      ontext: (text) => parts.push(text),
      onopentag: (name) => BLOCK_TAGS.has(name) && parts.push(' '),
      onclosetag: (name) => BLOCK_TAGS.has(name) && parts.push(' '),
    },
    { decodeEntities: true },
  );
  parser.write(safeHtml);
  parser.end();
  return parts.join('').replace(/\s+/g, ' ').trim();
}
