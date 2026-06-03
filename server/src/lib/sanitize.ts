import sanitizeHtml from 'sanitize-html'

const EMAIL_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'a', 'b', 'blockquote', 'br', 'caption', 'cite', 'code', 'col', 'colgroup',
    'dd', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'small',
    'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th',
    'thead', 'tr', 'u', 'ul',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    td: ['rowspan', 'colspan'],
    th: ['rowspan', 'colspan'],
    '*': ['class', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'cid'],
  },
  // Force all links to open safely in a new tab
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
  // Strip empty style/class attributes left over after sanitization
  nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript'],
}

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, EMAIL_HTML_OPTIONS)
}
