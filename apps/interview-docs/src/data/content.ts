import { getDocFile, loadRawDoc } from './docUrls';

interface ContentResult {
  content: string;
  url: string;
}

const FRONTMATTER_RE = /^---[\s\S]*?\n---\s*\n/;

function stripFrontmatter(raw: string): string {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return raw;
  return raw.slice(match[0].length);
}

export async function loadContent(url: string): Promise<ContentResult | null> {
  const decoded = decodeURIComponent(url);
  const withoutTrailing = decoded.replace(/\/$/, '');

  const filePath = getDocFile(decoded) ?? getDocFile(withoutTrailing);
  if (!filePath) return null;

  const rawPromise = loadRawDoc(filePath);
  if (!rawPromise) return null;

  const raw = await rawPromise;
  const content = stripFrontmatter(raw);
  return { content, url: withoutTrailing || '/' };
}
