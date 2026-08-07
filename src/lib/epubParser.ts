import JSZip from 'jszip';
import { sanitizeHtml } from './sanitizer';

export interface ParsedEpubResult {
  title: string;
  author: string;
  description: string;
  language: string;
  coverUrl?: string;
  chapters: { title: string; content: string }[];
}

export async function parseEpubFile(file: File): Promise<ParsedEpubResult> {
  const zip = await JSZip.loadAsync(file);

  // 1. Locate container.xml to find OPF manifest path
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    throw new Error('Invalid ePub archive: Missing META-INF/container.xml');
  }

  const containerXml = await containerFile.async('text');
  const domParser = new DOMParser();
  const containerDoc = domParser.parseFromString(containerXml, 'text/xml');
  const rootfileEl = containerDoc.querySelector('rootfile');
  const opfPath = rootfileEl?.getAttribute('full-path');

  if (!opfPath) {
    throw new Error('Invalid ePub archive: Could not locate OPF manifest path.');
  }

  // 2. Load OPF file
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`Invalid ePub archive: OPF file not found at ${opfPath}`);
  }

  const opfXml = await opfFile.async('text');
  const opfDoc = domParser.parseFromString(opfXml, 'text/xml');

  // Metadata Extraction
  const title = opfDoc.querySelector('metadata > title, metadata\\:title')?.textContent || file.name.replace(/\.epub$/i, '');
  const author = opfDoc.querySelector('metadata > creator, metadata\\:creator')?.textContent || 'Unknown Author';
  const description = opfDoc.querySelector('metadata > description, metadata\\:description')?.textContent || '';
  const language = opfDoc.querySelector('metadata > language, metadata\\:language')?.textContent || 'English';

  // 3. Manifest & Spine Mapping
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) + '/' : '';
  const manifestItems = Array.from(opfDoc.querySelectorAll('manifest > item'));

  const itemMap = new Map<string, { href: string; mediaType: string }>();
  let coverPath: string | null = null;

  manifestItems.forEach(item => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type');
    const properties = item.getAttribute('properties');

    if (id && href) {
      itemMap.set(id, { href: opfDir + href, mediaType: mediaType || '' });
      if (properties?.includes('cover-image') || id.toLowerCase().includes('cover')) {
        coverPath = opfDir + href;
      }
    }
  });

  // Extract Cover Image Data URL if available
  let coverUrl: string | undefined = undefined;
  if (coverPath) {
    const activeCoverPath: string = coverPath;
    const coverFile = zip.file(activeCoverPath) || zip.file(decodeURIComponent(activeCoverPath));
    if (coverFile) {
      const base64 = await coverFile.async('base64');
      const mime = activeCoverPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
      coverUrl = `data:${mime};base64,${base64}`;
    }
  }

  // 4. Extract Chapters from Spine
  const itemrefs = Array.from(opfDoc.querySelectorAll('spine > itemref'));
  const chapters: { title: string; content: string }[] = [];

  for (let i = 0; i < itemrefs.length; i++) {
    const idref = itemrefs[i].getAttribute('idref');
    if (!idref) continue;

    const item = itemMap.get(idref);
    if (!item || (!item.mediaType.includes('xml') && !item.mediaType.includes('html'))) continue;

    const chapterFile = zip.file(item.href) || zip.file(decodeURIComponent(item.href));
    if (!chapterFile) continue;

    const chapterHtml = await chapterFile.async('text');
    const chapterDoc = domParser.parseFromString(chapterHtml, 'text/html');

    // Extract Title from body headings first (ignoring head title tag)
    const chapterTitleEl = chapterDoc.querySelector('body h1, body h2, body h3, body h4') || chapterDoc.querySelector('h1, h2, h3, h4');
    const rawTitle = chapterTitleEl?.textContent?.trim() || `Chapter ${chapters.length + 1}`;

    // Extract Body Content
    const bodyContent = chapterDoc.body ? chapterDoc.body.innerHTML : chapterHtml;
    const cleanContent = sanitizeHtml(bodyContent);

    if (cleanContent.replace(/<[^>]*>/g, '').trim().length > 0) {
      chapters.push({
        title: rawTitle,
        content: cleanContent
      });
    }
  }

  return {
    title,
    author,
    description: sanitizeHtml(description),
    language,
    coverUrl,
    chapters: chapters.length > 0 ? chapters : [{ title: 'Chapter 1', content: '<p>Empty ePub book content.</p>' }]
  };
}
