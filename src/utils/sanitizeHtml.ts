const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'EM', 'U', 'UL', 'OL', 'LI', 'A', 'IMG']);
const RICH_TEXT_TAGS = new Set(['SPAN', 'DIV', 'S', 'DEL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'CODE', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'HR']);
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

const isSafeImageSrc = (value: string) => {
  const src = value.trim();
  if (!src) return false;
  if (/^data:image\/(?:gif|jpe?g|png|webp|bmp|svg\+xml);base64,/i.test(src)) return true;
  if (/^blob:/i.test(src)) return true;
  try {
    const baseUrl = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const url = new URL(src, baseUrl);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

/** Sanitizes user-authored rich text before it is rendered as HTML. */
export const sanitizeHtml = (html: string, options: { richText?: boolean } = {}) => {
  if (typeof DOMParser === 'undefined') return '';
  const document = new DOMParser().parseFromString(html, 'text/html');
  const root = document.body;

  root.querySelectorAll('*').forEach((element) => {
    const tagName = element.tagName.toUpperCase();
    if (DROP_CONTENT_TAGS.has(tagName)) {
      element.remove();
      return;
    }
    if (!ALLOWED_TAGS.has(tagName) && !(options.richText && RICH_TEXT_TAGS.has(tagName))) {
      const parent = element.parentNode;
      if (!parent) return;
      while (element.firstChild) parent.insertBefore(element.firstChild, element);
      element.remove();
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (options.richText && name === 'style') {
        const safeStyles = attribute.value.split(';').map(declaration => declaration.trim()).filter(declaration => /^(?:color|background-color):\s*(?:#[\da-f]{3,8}|rgba?\([\d.,%\s]+\)|[a-z]+)$/i.test(declaration) || /^text-align:\s*(?:left|center|right|justify)$/i.test(declaration) || /^font-size:\s*\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i.test(declaration) || /^line-height:\s*\d+(?:\.\d+)?(?:px|em|%)?$/i.test(declaration));
        if (safeStyles.length) { element.setAttribute('style', safeStyles.join('; ')); return; }
      }
      if (options.richText && ['TD', 'TH'].includes(tagName) && ['colspan', 'rowspan'].includes(name) && /^[1-9]\d{0,2}$/.test(attribute.value)) return;
      if (tagName === 'A' && name === 'href' && isSafeHref(attribute.value)) return;
      if (tagName === 'IMG' && name === 'src' && isSafeImageSrc(attribute.value)) return;
      element.removeAttribute(attribute.name);
    });
    if (tagName === 'A' && !element.hasAttribute('href')) element.remove();
    if (tagName === 'IMG' && !element.hasAttribute('src')) element.remove();
  });

  return root.innerHTML;
};
