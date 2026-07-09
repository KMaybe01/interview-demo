interface ContentResult {
  content: string;
  url: string;
}

const lazyModules = import.meta.glob('../../../../docs/S{1,2,3,4,5,6}-*/**/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const DOCS_PREFIX = /^(?:.*[/\\])?docs\//;

const urlToFile = new Map<string, string>();

for (const filePath of Object.keys(lazyModules)) {
  let urlPath = filePath.replace(/\.md$/, '');
  urlPath = urlPath.replace(DOCS_PREFIX, '/');
  if (urlPath.endsWith('/index')) {
    urlPath = urlPath.slice(0, -6);
  }
  urlToFile.set(urlPath, filePath);
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

  const filePath = urlToFile.get(decoded) || urlToFile.get(withoutTrailing);
  if (!filePath) return null;

  const loadFn = lazyModules[filePath];
  if (!loadFn) return null;

  const raw = await loadFn();
  const content = stripFrontmatter(raw);
  return { content, url: withoutTrailing || '/' };
}
