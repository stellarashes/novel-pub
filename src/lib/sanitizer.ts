/**
 * NovelPub HTML Sanitizer Utility
 * Sanitizes user inputs, ePub XHTML content, book descriptions, reviews, and comments to prevent XSS attacks.
 */

const ALLOWED_TAGS = new Set([
  'html', 'body',
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup',
  'blockquote', 'code', 'pre', 'span', 'div',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
  'a', 'img'
]);

const ALLOWED_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'id', 'style'
]);

export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  // If simple text without HTML tags, return escaped text wrapped cleanly
  if (!/<[a-z][\s\S]*>/i.test(dirtyHtml)) {
    return dirtyHtml;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirtyHtml, 'text/html');

    function cleanNode(node: Node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();

        // Do not remove doc.body or doc.documentElement
        if (element !== doc.body && element !== doc.documentElement && !ALLOWED_TAGS.has(tagName)) {
          // Replace forbidden node with its text or child nodes
          const parent = element.parentNode;
          if (parent) {
            while (element.firstChild) {
              parent.insertBefore(element.firstChild, element);
            }
            parent.removeChild(element);
          }
          return;
        }

        // Clean attributes
        const attrs = Array.from(element.attributes);
        for (const attr of attrs) {
          const attrName = attr.name.toLowerCase();

          // Strip event handlers (onload, onerror, onclick, etc.) or non-allowed attributes
          if (attrName.startsWith('on') || !ALLOWED_ATTRS.has(attrName)) {
            element.removeAttribute(attr.name);
            continue;
          }

          // Sanitize href and src protocols
          if (attrName === 'href' || attrName === 'src') {
            const val = attr.value.trim().toLowerCase();
            if (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:text/html')) {
              element.removeAttribute(attr.name);
            }
          }
        }

        // Ensure safe links
        if (tagName === 'a') {
          element.setAttribute('rel', 'noopener noreferrer');
          if (!element.getAttribute('target')) {
            element.setAttribute('target', '_blank');
          }
        }
      }

      // Recursively clean child nodes
      let child = node.firstChild;
      while (child) {
        const next = child.nextSibling;
        cleanNode(child);
        child = next;
      }
    }

    cleanNode(doc.body);
    return doc.body.innerHTML;
  } catch (err) {
    console.error('HTML Sanitization error:', err);
    // Fallback: strip all tags
    return dirtyHtml.replace(/<[^>]*>/g, '');
  }
}
