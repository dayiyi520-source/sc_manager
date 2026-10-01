const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'EM', 'U', 'UL', 'OL', 'LI', 'A']);
const DROP_CONTENT_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH']);

const isSafeHref = (value: string) => {
  const href = value.trim();
  if (!href) return false;
  try {
    const baseUrl = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const url = new URL(href, baseUrl);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
};

/** Sanitizes user-authored rich text before it is rendered as HTML. */
export const sanitizeHtml = (html: string) => {
  if (typeof DOMParser === 'undefined') return '';
  const document = new DOMParser().parseFromString(html, 'text/html');
  const root = document.body;

  root.querySelectorAll('*').forEach((element) => {
    const tagName = element.tagName.toUpperCase();
    if (DROP_CONTENT_TAGS.has(tagName)) {
      element.remove();
      return;
    }
    if (!ALLOWED_TAGS.has(tagName)) {
      const parent = element.parentNode;
      if (!parent) return;
      while (element.firstChild) parent.insertBefore(element.firstChild, element);
      element.remove();
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (tagName === 'A' && name === 'href' && isSafeHref(attribute.value)) return;
      element.removeAttribute(attribute.name);
    });
    if (tagName === 'A' && !element.hasAttribute('href')) element.remove();
  });

  return root.innerHTML;
};
