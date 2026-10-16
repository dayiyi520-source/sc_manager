import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export const templateKeys = ['researchRoles', 'researchStatuses', 'researchCategories', 'researchTypes', 'researchNotifications', 'researchAutomation', 'researchAutomationSetting', 'productLines'] as const;
export const templateEndpoint = '/__dev/research-template';

export function saveTemplateValue(file: string, key: string, value: unknown, previous: unknown) {
  if (!templateKeys.includes(key as typeof templateKeys[number])) throw new Error('不支持的模板配置');
  if (key === 'researchAutomationSetting' ? typeof value !== 'boolean' : key === 'researchNotifications' ? !value || typeof value !== 'object' || Array.isArray(value) : !Array.isArray(value)) throw new Error('模板配置格式错误');
  const current = JSON.parse(readFileSync(file, 'utf8'));
  if (JSON.stringify(current[key] ?? null) !== JSON.stringify(previous ?? null)) throw new Error('模板已被其他页面修改，请刷新后重试');
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, `${JSON.stringify({ ...current, [key]: value }, null, 2)}\n`, 'utf8');
  renameSync(temporary, file);
}

const basicProductFields = new Set(['name', 'description', 'website', 'sort', 'visibility', 'commercialAvailability']);
export interface ProductPatch { id: string; previous: Record<string, unknown>; changes: Record<string, unknown> }
export function saveProductPatch(file: string, patch: ProductPatch) {
  if (!patch?.id || !patch.previous || !patch.changes || Array.isArray(patch.changes) || typeof patch.changes !== 'object') throw new Error('产品保存参数无效');
  const current = JSON.parse(readFileSync(file, 'utf8'));
  const products = current.productLines || [];
  const index = products.findIndex((product: any) => product.id === patch.id);
  if (index < 0) throw new Error('产品不存在，请刷新后重试');
  const product = products[index];
  for (const [field, value] of Object.entries(patch.changes)) {
    if (!basicProductFields.has(field)) throw new Error('不支持的产品字段');
    if (JSON.stringify(product[field] ?? null) !== JSON.stringify(patch.previous[field] ?? null) && JSON.stringify(product[field] ?? null) !== JSON.stringify(value ?? null)) throw new Error('产品信息已被修改，请刷新产品信息后重试；当前填写内容已保留');
  }
  const updated = { ...product, ...patch.changes };
  if (typeof updated.name !== 'string' || !updated.name.trim()) throw new Error('产品名称不能为空');
  if (updated.name !== product.name) updated.nameAliases = [...new Set([...(product.nameAliases || []), product.name])];
  const value = products.map((item: any, i: number) => i === index ? updated : item);
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, `${JSON.stringify({ ...current, productLines: value }, null, 2)}\n`, 'utf8');
  renameSync(temporary, file);
  return value;
}

function registerTemplateServer(server: any) {
      const file = resolve(server.config.root, 'src/data/mockResearchTemplate.json');
      server.middlewares.use(async (req, res, next) => {
        if (![templateEndpoint,server.config.base + 'api/mock/research-template'].includes(req.url?.split('?')[0])) return next();
        const address = req.socket.remoteAddress;
        const origin = req.headers.origin;
        // 只允许本机、同源开发页面写入固定文件，不能指定任意路径。
        let sameOrigin = !origin;
        try { if (origin) sameOrigin = new URL(origin).host === req.headers.host; } catch { sameOrigin = false; }
        if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address || '') || !sameOrigin) {
          res.statusCode = 403;
          res.end('仅允许本机同源访问');
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        try {
          if (req.method === 'GET') { res.end(readFileSync(file, 'utf8')); return; }
          if (req.method !== 'PUT' || !req.headers['content-type']?.startsWith('application/json')) { res.statusCode = 405; res.end(JSON.stringify({ message: '不支持的请求' })); return; }
          let body = '';
          for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body) > 2 * 1024 * 1024) throw new Error('模板配置过大');
          }
          const input = JSON.parse(body);
          if (input.key === 'productLines' && input.productPatch) { res.end(JSON.stringify({ saved: true, value: saveProductPatch(file, input.productPatch) })); return; }
          const { key, value, previous } = input;
          saveTemplateValue(file, key, value, previous);
          res.end(JSON.stringify({ saved: true }));
        } catch (error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ message: error instanceof Error ? error.message : '项目 Mock 保存失败' }));
        }
      });
}
export function mockResearchTemplatePlugin(): Plugin {
  return {name:'mock-research-template-file',apply:'serve',configureServer:registerTemplateServer,configurePreviewServer:registerTemplateServer,
    handleHotUpdate(context) {if(context.file===resolve(context.server.config.root,'src/data/mockResearchTemplate.json')) return [];},
  };
}
