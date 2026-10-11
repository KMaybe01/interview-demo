/**
 * 文档内部链接校验器。
 *
 * 扫描 docs/ 下全部 Markdown，检查相对链接是否指向存在的文件。
 * 站点路由规则由 apps/interview-docs/src/data/docUrls.ts 定义：
 *   - `docs/<file>.md`           →  `/<file>`
 *   - `docs/<dir>/index.md`      →  `/<dir>`
 * 因此这里的解析规则与之保持一致（目录默认取 index.md，缺扩展名补 .md）。
 *
 * 用法：
 *   bun run docs:check              # 全量校验，有死链时以非零码退出
 *   bun run docs:check -- path/glob # 只输出（仍全量扫描）
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, normalize, relative, resolve, sep } from 'node:path';

const DOCS_ROOT = resolve(import.meta.dirname, '..', 'docs');
const NAV_FILE = resolve(
  import.meta.dirname,
  '..',
  'apps/interview-docs/src/data/navigation.ts',
);

const SKIP_PREFIX = /^(?:https?:\/\/|mailto:|tel:|ftp:|data:)/i;

async function collectMarkdown(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdown(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * 抽出 Markdown 正文里的链接目标。
 *
 * 两个降噪措施，避免把示例代码误判成链接：
 *   1. 跳过 ``` / ~~~ 围栏内的全部内容；
 *   2. 抹掉行内代码 `...`（如 `(*Rand) N[Int](Int) Int` 会被正则误判为链接）。
 */
function extractLinks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const links = [];
  let inFence = false;
  let fenceMarker = '';

  lines.forEach((rawLine, index) => {
    const fence = rawLine.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1][0];
        return;
      }
      if (fence[1][0] === fenceMarker) {
        inFence = false;
        fenceMarker = '';
      }
      return;
    }
    if (inFence) return;

    const line = rawLine.replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length));
    // 行内链接 ](...) 与图片链接 ](...) 同形；引用式链接 [text]: url 另行处理
    for (const m of line.matchAll(/\]\(([^()\s]+(?:[^()]*?)?)\)/g)) {
      links.push({ target: m[1].trim(), line: index + 1, raw: m[0] });
    }
    for (const m of line.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/g)) {
      links.push({ target: m[1].trim(), line: index + 1, raw: m[0] });
    }
  });

  return links;
}

/** 把链接目标解析成候选磁盘路径。 */
function resolveCandidates(sourceFile, rawTarget) {
  const [target] = rawTarget.split('#');
  const clean = target.trim();
  if (!clean || SKIP_PREFIX.test(clean) || clean.startsWith('//')) return null;

  const baseDir = clean.startsWith('/')
    ? DOCS_ROOT
    : resolve(DOCS_ROOT, sourceFile.slice(DOCS_ROOT.length + 1), '..');
  const decoded = safeDecode(clean);
  const targetPath = clean.startsWith('/')
    ? join(DOCS_ROOT, decoded)
    : resolve(baseDir, decoded);

  return [targetPath, `${targetPath}.md`, join(targetPath, 'index.md')];
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** 把站点路由（如 /S5-AI/01-第一关-流式对话/）还原成 docs 下的文件路径。 */
function routeToDocPath(route) {
  const clean = route.replace(/\/$/, '');
  if (!clean.startsWith('/')) return null;
  return [
    `${clean}.md`,
    join(clean, 'index.md'),
    clean,
  ].map((p) => join(DOCS_ROOT, p.slice(1)));
}

/** 校验 interview-docs 侧边栏里的 link 是否都能落到真实文档。 */
async function checkNavLinks() {
  if (!existsSync(NAV_FILE)) return { broken: [], total: 0 };
  const source = readFileSync(NAV_FILE, 'utf8');
  const broken = [];
  let total = 0;

  for (const m of source.matchAll(/link:\s*'([^']+)'/g)) {
    const route = safeDecode(m[1]);
    if (!route.startsWith('/')) continue;
    if (route === '/') continue; // 首页
    total++;
    const hit = routeToDocPath(route)?.find(
      (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
    );
    if (!hit) broken.push(route);
  }

  return { broken, total };
}

async function main() {
  if (!existsSync(DOCS_ROOT)) {
    console.error(`找不到 docs 目录：${DOCS_ROOT}`);
    process.exit(1);
  }

  const files = await collectMarkdown(DOCS_ROOT);
  const broken = [];
  let totalLinks = 0;

  for (const file of files) {
    const markdown = readFileSync(file, 'utf8');
    for (const link of extractLinks(markdown)) {
      const candidates = resolveCandidates(file, link.target);
      if (!candidates) continue;
      totalLinks++;
      const hit = candidates.find(
        (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
      );
      if (!hit) {
        broken.push({
          file: relative(process.cwd(), file).split(sep).join('/'),
          line: link.line,
          target: link.target,
        });
      }
    }
  }

  const nav = await checkNavLinks();

  const heading = `\n共扫描 ${files.length} 篇文档 / ${totalLinks} 条正文链接 + ${nav.total} 条导航链接`;
  const problems = [];
  if (broken.length > 0) {
    problems.push(`正文死链 ${broken.length} 条 ❌`);
    const grouped = new Map();
    for (const item of broken) {
      const list = grouped.get(item.file) ?? [];
      list.push(`:${item.line} → ${item.target}`);
      grouped.set(item.file, list);
    }
    for (const [file, list] of [...grouped.entries()].sort()) {
      problems.push(`  ${file}`);
      for (const line of list) problems.push(`    ${line}`);
    }
  }
  if (nav.broken.length > 0) {
    problems.push(`导航死链 ${nav.broken.length} 条 ❌`);
    for (const route of nav.broken) problems.push(`    navigation.ts → ${route}`);
  }

  if (problems.length === 0) {
    console.log(`${heading}，未发现死链 ✅`);
    return;
  }

  console.log(`${heading}\n${problems.join('\n')}`);
  process.exitCode = 1;
}

await main();
