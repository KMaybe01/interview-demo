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

export function getAllDocUrls(): string[] {
  return Array.from(urlToFile.keys());
}

export function getDocFile(url: string): string | null {
  return urlToFile.get(url) ?? null;
}

export function loadRawDoc(file: string): Promise<string> | null {
  const loadFn = lazyModules[file];
  return loadFn ? loadFn() : null;
}
