const tags = new Set(['P', 'BR', 'DIV', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'UL', 'OL', 'LI', 'A', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'PRE', 'CODE', 'HR']);
const discarded = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH']);
export const sanitizeProductDocument = (html: string) => {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.body.querySelectorAll('*').forEach((element) => {
    if (discarded.has(element.tagName)) { element.remove(); return; }
    if (!tags.has(element.tagName)) { element.replaceWith(...Array.from(element.childNodes)); return; }
    Array.from(element.attributes).forEach(({ name, value }) => {
      if (element.tagName === 'A' && name === 'href' && /^(https?:\/\/|mailto:)/i.test(value.trim())) return;
      if (element.tagName === 'IMG' && name === 'src' && /^(https?:\/\/|data:image\/(png|jpeg|gif|webp);base64,)/i.test(value.trim())) return;
      if (element.tagName === 'IMG' && name === 'alt') return;
      if (['TD', 'TH'].includes(element.tagName) && ['colspan', 'rowspan'].includes(name) && /^[1-9]\d?$/.test(value)) return;
      if (name === 'style') {
        const safeStyle = value.split(';').filter((declaration) => /^(text-align\s*:\s*(left|right|center|justify)|font-weight\s*:\s*(bold|normal|[1-9]00)|font-style\s*:\s*(italic|normal)|text-decoration\s*:\s*(underline|line-through|none))$/i.test(declaration.trim())).join(';');
        if (safeStyle) { element.setAttribute('style', safeStyle); return; }
      }
      element.removeAttribute(name);
    });
  });
  return parsed.body.innerHTML;
};
