import { fileURLToPath } from 'node:url';
import { createDemoApp } from './app.ts';

const PORT = Number(process.env['PORT'] ?? 3000);
const { server } = createDemoApp(fileURLToPath(new URL('../public/', import.meta.url)));
server.listen(PORT, () => {
  console.log(`\nS3-07 chạy tại:  http://localhost:${PORT}\nDừng server: Ctrl+C\n`);
});
