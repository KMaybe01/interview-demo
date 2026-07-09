import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, 'dist');

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

const version = { timestamp: Date.now() };
writeFileSync(resolve(distDir, 'version.json'), JSON.stringify(version));
console.log(`[gen-version] 已生成 version.json (timestamp: ${version.timestamp})`);

const indexHtml = resolve(distDir, 'index.html');
if (existsSync(indexHtml)) {
  writeFileSync(resolve(distDir, '404.html'), readFileSync(indexHtml, 'utf-8'));
  console.log('[gen-version] 已复制 404.html');
}
