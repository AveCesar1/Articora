// Simple text sanitizer to reduce XSS and basic injection risk.
// Not a substitute for parameterized queries or full input validation.

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeText(input, options = {}) {
  if (input === null || input === undefined) return input;
  let s = String(input);
  // Trim and remove NUL/control characters
  s = s.trim().replace(/\x00/g, '').replace(/[\x00-\x1F\x7F]/g, '');

  // Remove simple SQL metacharacters that could break naive string concatenation
  s = s.replace(/(--|;|\/\*|\*\/)/g, '');

  // Limit length to a reasonable value (default 1000)
  const maxLen = options.maxLength || 1000;
  if (s.length > maxLen) s = s.slice(0, maxLen);

  // Escape HTML entities to prevent XSS when rendering
  s = escapeHtml(s);
  return s;
}

module.exports = { sanitizeText };
