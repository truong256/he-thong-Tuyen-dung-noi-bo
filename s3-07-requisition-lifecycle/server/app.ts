import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { InMemoryStore } from '../src/adapters/inMemory.ts';
import { systemClock } from '../src/adapters/postgres.ts';
import { RequisitionStatusController } from '../src/http/controller.ts';
import { RequisitionLifecycleService } from '../src/service/requisitionLifecycleService.ts';
import type { Actor } from '../src/domain/types.ts';
import type { Clock } from '../src/ports.ts';
import { seedDemoData } from './seed.ts';

/**
 * Token demo -> người dùng. Môi trường thật thay bằng middleware xác thực JWT;
 * quyền vẫn được kiểm ở service (server), không phải ở giao diện.
 */
export const DEMO_TOKENS: Readonly<Record<string, Actor>> = {
  'demo-hr': { id: 'u-hr-01', role: 'HR_MANAGER' },
  'demo-recruiter': { id: 'u-rc-01', role: 'RECRUITER' },
};

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
};

function actorOf(req: IncomingMessage): Actor | null {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return DEMO_TOKENS[token] ?? null;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return Symbol('invalid-json');
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

export interface DemoApp {
  server: Server;
  store: InMemoryStore;
}

export function createDemoApp(publicDir: string, clock: Clock = systemClock): DemoApp {
  const store = new InMemoryStore();
  seedDemoData(store);
  const service = new RequisitionLifecycleService({
    uow: store, requisitions: store, postings: store, pipeline: store, history: store, clock,
  });
  const controller = new RequisitionStatusController(service);

  async function listRequisitions() {
    const rows = [];
    for (const r of store.requisitionsById.values()) {
      const postings = [...store.postingsById.values()].filter((p) => p.requisitionId === r.id);
      rows.push({ ...r, postings, pipeline: await store.countActiveByStage(r.id) });
    }
    return rows.sort((a, b) => a.code.localeCompare(b.code));
  }

  async function api(req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
    const method = req.method ?? 'GET';
    const actor = actorOf(req);

    if (method === 'GET' && path === '/api/public/postings') {
      // Cổng tuyển dụng công khai: không cần đăng nhập, chỉ thấy tin PUBLISHED.
      const items = [...store.postingsById.values()]
        .filter((p) => p.status === 'PUBLISHED')
        .map((p) => ({ id: p.id, title: store.requisitionsById.get(p.requisitionId)?.title ?? '' }));
      return send(res, 200, items);
    }
    if (method === 'POST' && path === '/api/demo/reset') {
      seedDemoData(store);
      return send(res, 200, { ok: true });
    }
    if (method === 'GET' && path === '/api/me') {
      return actor ? send(res, 200, actor) : send(res, 401, { error: { code: 'FORBIDDEN', message: 'Chưa đăng nhập.', details: null } });
    }
    if (method === 'GET' && path === '/api/requisitions') {
      if (!actor) return send(res, 403, { error: { code: 'FORBIDDEN', message: 'Chưa đăng nhập.', details: null } });
      return send(res, 200, await listRequisitions());
    }

    const m = /^\/api\/requisitions\/([^/]+)\/(status|status-history)$/.exec(path);
    if (m) {
      const params = { id: decodeURIComponent(m[1] ?? '') };
      if (method === 'POST' && m[2] === 'status') {
        const out = await controller.changeStatus({ actor, params, body: await readJson(req) });
        return send(res, out.status, out.body);
      }
      if (method === 'GET' && m[2] === 'status-history') {
        const out = await controller.history({ actor, params });
        return send(res, out.status, out.body);
      }
    }
    send(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn.', details: null } });
  }

  async function serveStatic(res: ServerResponse, path: string): Promise<void> {
    const rel = path === '/' ? 'index.html' : normalize(path).replace(/^([/\\])+/, '');
    if (rel.includes('..')) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy.', details: null } });
    try {
      const data = await readFile(join(publicDir, rel));
      res.writeHead(200, { 'Content-Type': MIME[extname(rel)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    } catch {
      send(res, 404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy. Đã chạy "npm run build:web" chưa?', details: null } });
    }
  }

  const server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    const run = path.startsWith('/api/') ? api(req, res, path) : serveStatic(res, path);
    run.catch(() => send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.', details: null } }));
  });
  return { server, store };
}
