import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import type { OkrRecord, OkrPerson, OkrSettings } from '../src/services/okrRepository';

export interface OkrFileState { revision: number; okrRecords: OkrRecord[]; okrPeople: OkrPerson[]; okrSettings: OkrSettings }
export const okrStateEndpoint = '/__dev/okr-state';
export function validateOkrState(state: OkrFileState) {
  if (!Number.isInteger(state.revision) || state.revision < 0 || !Array.isArray(state.okrRecords) || !Array.isArray(state.okrPeople) || !state.okrSettings || typeof state.okrSettings !== 'object' || Array.isArray(state.okrSettings)) throw new Error('目标与复盘数据格式无效');
  const ids = new Set<string>();
  for (const record of state.okrRecords) {
    if (!record.id || ids.has(record.id) || !['objective','action','review'].includes(record.kind) || !record.ownerId || !record.periodKey || !record.payload || typeof record.payload !== 'object' || !Number.isInteger(record.version) || record.version < 0) throw new Error('目标与复盘记录无效或重复');
    ids.add(record.id);
  }
}
export function saveOkrState(file: string, next: OkrFileState, previousRevision: number): OkrFileState {
  validateOkrState(next);
  const current: OkrFileState = JSON.parse(readFileSync(file, 'utf8'));
  if (current.revision !== previousRevision) throw new Error('目标与复盘已被其他页面修改，请刷新后重试');
  const saved = {...next, revision:current.revision + 1};
  writeFileSync(file + '.tmp', JSON.stringify(saved, null, 2) + '\n', 'utf8');
  renameSync(file + '.tmp', file);
  return saved;
}
export function migrateLegacyOkrState(current: OkrFileState, legacy: Partial<OkrFileState>): OkrFileState {
  const rows = (Array.isArray(legacy.okrRecords) ? legacy.okrRecords : []).filter(record => !(record.kind === 'review' && record.ownerId === 'user-admin'));
  const merged = new Map(current.okrRecords.map(record => [record.id, record]));
  for (const record of rows) {
    const saved = merged.get(record.id);
    const next = !saved || current.revision === 0 || record.version > saved.version ? record : saved;
    // Read receipts do not increment the report version. Merge them only for
    // the same immutable submitted report, without replacing its saved content.
    const sameReport = saved?.kind === 'review' && record.kind === 'review'
      && saved.ownerId === record.ownerId && saved.periodKey === record.periodKey
      && saved.payload.reviewType === record.payload.reviewType
      && saved.payload.startDate === record.payload.startDate && saved.payload.endDate === record.payload.endDate
      && ['submitted', 'reviewed', 'active'].includes(saved.status) && ['submitted', 'reviewed', 'active'].includes(record.status);
    merged.set(record.id, sameReport ? { ...next, viewedBy: [...new Set([...(saved.viewedBy || []), ...(record.viewedBy || [])])] } : next);
  }
  return {...current,
    okrRecords:[...merged.values()],
    okrSettings:legacy.okrSettings && (current.revision === 0 || (legacy.okrSettings.version ?? 0) > (current.okrSettings.version ?? 0)) ? legacy.okrSettings : current.okrSettings,
    okrPeople:current.revision === 0 && legacy.okrPeople ? legacy.okrPeople : current.okrPeople,
  };
}
export function mockOkrStatePlugin(): Plugin {
  const register = (server: any) => {
    const file = resolve(server.config.root, 'src/data/mockOkrState.json');
    server.middlewares.use(async (req: any, res: any, next: () => void) => {
      if (![okrStateEndpoint,server.config.base + 'api/mock/okr-state'].includes(req.url?.split('?')[0])) return next();
      let sameOrigin = !req.headers.origin;
      try { if (req.headers.origin) sameOrigin = new URL(req.headers.origin).host === req.headers.host; } catch { sameOrigin=false; }
      if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '') || !sameOrigin) {res.statusCode=403;res.end('仅允许本机同源访问');return;}
      res.setHeader('Content-Type','application/json'); res.setHeader('Cache-Control','no-store');
      try {
        const current: OkrFileState = JSON.parse(readFileSync(file,'utf8'));
        if (req.method === 'GET') {res.end(JSON.stringify(current));return;}
        if (!['PUT','POST'].includes(req.method || '') || !req.headers['content-type']?.startsWith('application/json')) {res.statusCode=405;res.end(JSON.stringify({message:'不支持的请求'}));return;}
        let raw=''; for await (const chunk of req) {raw+=chunk;if(Buffer.byteLength(raw)>20*1024*1024) throw new Error('目标与复盘数据过大');}
        const body=JSON.parse(raw);
        const state = req.method === 'POST' ? migrateLegacyOkrState(current, body.legacy || {}) : body.state;
        res.end(JSON.stringify(saveOkrState(file,state,body.previousRevision)));
      } catch(error) {res.statusCode=409;res.end(JSON.stringify({message:error instanceof Error ? error.message : '目标与复盘 Mock 保存失败'}));}
    });
  };
  return {name:'mock-okr-file-state', configureServer:register, configurePreviewServer:register,
    handleHotUpdate(context) {if(context.file===resolve(context.server.config.root,'src/data/mockOkrState.json')) return [];},
  };
}
