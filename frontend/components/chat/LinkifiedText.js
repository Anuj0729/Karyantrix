'use client';

import { splitTextWithLinks } from '../../lib/linkify';

export default function LinkifiedText({ text, linkClassName }) {
  const parts = splitTextWithLinks(text);

  if (parts.length === 0) return null;
  if (parts.length === 1 && parts[0].type === 'text') {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, i) =>
        part.type === 'link' ? (
          <a
            key={`${part.href}-${i}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className={
              linkClassName ||
              'break-all underline decoration-1 underline-offset-2 hover:opacity-80'
            }
          >
            {part.value}
          </a>
        ) : (
          <span key={`text-${i}`}>{part.value}</span>
        )
      )}
    </>
  );
}
