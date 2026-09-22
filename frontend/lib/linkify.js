const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)'"\]])/gi;

const REQUIREMENT_ID_REGEX = /\/requirements\/([a-f0-9]{24})/i;

export function splitTextWithLinks(text) {
  if (!text) return [];

  const parts = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(URL_REGEX);

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    parts.push({ type: 'link', value: raw, href });
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
}

export function extractRequirementId(text) {
  if (!text) return null;
  const match = text.match(REQUIREMENT_ID_REGEX);
  return match ? match[1] : null;
}
