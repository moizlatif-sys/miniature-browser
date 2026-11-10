/**
 * Placeholder HTML policy (version 0).
 *
 * Until the real sanitizer exists, every page is shown as escaped plain text.
 * Pages stored with an older version are reprocessed when the policy changes.
 */
export const HTML_POLICY_VERSION = 0;

export interface PreparedHtml {
  safeHtml: string;
  bodyText: string;
  version: number;
}

export function prepareHtml(source: string): PreparedHtml {
  const bodyText = source
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const escaped = bodyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return { safeHtml: `<p>${escaped}</p>`, bodyText, version: HTML_POLICY_VERSION };
}
