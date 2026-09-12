/**
 * Shared HTML sanitizer for user/admin-authored rich text (blog posts, CMS pages).
 *
 * Whitelist-ish approach on top of tag stripping: removes executable or
 * script-bearing markup entirely and strips event-handler attributes, so
 * stored rich text can never inject scripts (XSS) when rendered with
 * dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html: string): string {
  return String(html ?? '')
    // dangerous elements (with content) — including nested/obfuscated cases
    .replace(/<\s*(script|iframe|object|embed|template|noscript)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    // dangerous elements without closing tags
    .replace(/<\s*\/?\s*(script|iframe|object|embed|link|meta|base|template|noscript)[^>]*>/gi, '')
    // event handlers: onclick=, onerror=, onmouseover= …
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // dangerous URL schemes (href/src/action/formaction)
    .replace(/(href|src|action|formaction|xlink:href)\s*=\s*("|')?\s*(javascript|vbscript|data:text\/html)[^"'\s>]*/gi, '$1="#"')
    // srcdoc iframe payload trick
    .replace(/\ssrcdoc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // style attribute url() payloads (IE legacy expression / exfil beacons)
    .replace(/\sstyle\s*=\s*("[^"]*(expression|url\s*\()[^"]*"|'[^']*(expression|url\s*\()[^']*')/gi, '')
}

/** Escape plain text for safe interpolation into HTML strings. */
export function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
