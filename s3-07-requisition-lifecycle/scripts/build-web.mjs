import { copyFileSync, mkdirSync } from 'node:fs';
import { build } from 'esbuild';

mkdirSync('public', { recursive: true });
await build({
  entryPoints: ['frontend/main.tsx'],
  bundle: true,
  outfile: 'public/app.js',
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
});
copyFileSync('frontend/App.css', 'public/app.css');
copyFileSync('frontend/RequisitionStatusDialog.css', 'public/dialog.css');
console.log('Đã build giao diện vào public/');
