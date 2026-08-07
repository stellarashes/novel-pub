import { sanitizeHtml } from './sanitizer';

export interface ParsedTxtResult {
  title: string;
  content: string;
}

export async function parseTxtFile(file: File): Promise<ParsedTxtResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/);

  let title = file.name.replace(/\.txt$/i, '');
  let contentLines: string[] = [];

  // Check if first non-empty line looks like a chapter title
  const firstLine = lines.find(l => l.trim().length > 0);
  if (firstLine && (firstLine.length < 80 || /^(chapter|part|section|#|\d+[\.:])/i.test(firstLine.trim()))) {
    title = firstLine.replace(/^#+\s*/, '').trim();
    // Exclude title line from body content
    const titleIndex = lines.indexOf(firstLine);
    contentLines = lines.slice(titleIndex + 1);
  } else {
    contentLines = lines;
  }

  // Format paragraphs into clean HTML <p> blocks
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  for (const line of contentLines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      if (currentParagraph.length > 0) {
        paragraphs.push(`<p>${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
    } else {
      currentParagraph.push(trimmed);
    }
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(`<p>${currentParagraph.join(' ')}</p>`);
  }

  const rawHtml = paragraphs.length > 0 ? paragraphs.join('\n') : `<p>${text}</p>`;

  return {
    title: title || 'New Chapter',
    content: sanitizeHtml(rawHtml)
  };
}
