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
const indexHtml = resolve(distDir, 'index.html');
if (existsSync(indexHtml)) {
  writeFileSync(resolve(distDir, '404.html'), readFileSync(indexHtml, 'utf-8'));
}
