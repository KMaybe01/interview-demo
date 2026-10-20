import { createServer } from 'node:http';
import { createApiHandler } from './handler.ts';

/**
 * 独立 BFF 入口：`bun run server`。
 *
 * 开发时不需要它 —— Vite dev server 已经挂了同一个 handler（见 vite.config.ts）。
 * 只有在「前后端分开部署」的场景下才需要单独起这个进程。
 */
const PORT = Number(process.env.PORT ?? 8787);
const handler = createApiHandler();

createServer((req, res) => {
  void handler(req, res, () => {
    res.statusCode = 404;
    res.end('Not Found');
  });
}).listen(PORT, () => {
  // 服务端进程启动日志，保留即可
  // oxlint-disable-next-line no-console -- BFF 启动提示，属于服务端正常输出
  console.log(`[ai-course] BFF listening on http://localhost:${PORT}`);
});
