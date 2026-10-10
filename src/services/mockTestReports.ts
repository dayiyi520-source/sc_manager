import type { ProductLine } from '../types';
import type { SaveVersionTestReportInput, VersionTestReport } from '../types/testManagement';

type StoredReport = SaveVersionTestReportInput & { id: string; productLineId: string; versionId: string; creatorName: string; createdAt: string; updatedAt: string; revision: number };
export const TEST_REPORT_STORAGE_KEY = 'shichuang.frontend.mock.testReports';

export function handleMockTestReports(path: string, method: string, body: Record<string, any>, lines: ProductLine[], creatorName: string) {
  const parts = path.split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
  const globalList = parts.length === 2 && parts[1] === 'test-reports' && method === 'GET';
  const scoped = parts[1] === 'product-lines' && parts[3] === 'versions' && parts[5] === 'test-reports';
  if (!globalList && !scoped) return undefined;
  const reports: StoredReport[] = JSON.parse(localStorage.getItem(TEST_REPORT_STORAGE_KEY) || '[]');
  const line = scoped ? lines.find((item) => item.id === parts[2]) : undefined;
  const version = line?.versions?.find((item) => item.id === parts[4]);
  if (scoped && (!line || !version)) throw new Error('产品或迭代不存在，请重新选择');
  const build = (stored: StoredReport): VersionTestReport => ({ ...stored, productLineName: lines.find((item) => item.id === stored.productLineId)?.name || '', versionName: lines.find((item) => item.id === stored.productLineId)?.versions?.find((item) => item.id === stored.versionId)?.name || '' });
  if (globalList) return reports.filter((item) => lines.some((line) => line.id === item.productLineId && line.versions?.some((version) => version.id === item.versionId))).map(build);
  const scopedReports = reports.filter((item) => item.productLineId === line!.id && item.versionId === version!.id);
  if (method === 'GET' && !parts[6]) return scopedReports.map(build);
  const current = parts[6] ? scopedReports.find((item) => item.id === parts[6]) : undefined;
  if (parts[6] && !current) throw new Error('测试报告不存在或已删除');
  if (method === 'GET') return build(current!);
  if (method === 'PUT' || method === 'DELETE') {
    const revision = method === 'DELETE' ? new URL(path, window.location.origin).searchParams.get('revision') : body.revision;
    if (revision == null || Number(revision) !== current!.revision) throw new Error('测试报告已被更新，请刷新后重试');
  }
  if (method === 'DELETE') { localStorage.setItem(TEST_REPORT_STORAGE_KEY, JSON.stringify(reports.filter((item) => item.id !== current!.id))); return null; }
  if (!['POST', 'PUT'].includes(method)) throw new Error('不支持的测试报告操作');
  const name = String(body.name || '').trim();
  if (!name || name.length > 100) throw new Error('报告名称不能为空且不能超过100字');
  if (!['功能测试', '安全测试', '回归测试'].includes(body.reportType)) throw new Error('请选择报告类型');
  const attachments = body.attachments ?? current?.attachments ?? [];
  if (!Array.isArray(attachments) || !attachments.length || attachments.some((item) => !item.name || !item.url)) throw new Error('请上传有效的报告附件');
  const targetLine = body.productLineId ? lines.find((item) => item.id === body.productLineId) : line;
  const targetVersion = targetLine?.versions?.find((item) => item.id === (body.versionId || version!.id));
  if (!targetLine || !targetVersion) throw new Error('产品或迭代不存在，请重新选择');
  const saved: StoredReport = { id: current?.id || crypto.randomUUID(), productLineId: targetLine.id, versionId: targetVersion.id, creatorName: current?.creatorName || creatorName, createdAt: current?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), revision: current ? current.revision + 1 : 0, name, reportType: body.reportType, summary: body.summary ?? current?.summary ?? '', attachments };
  localStorage.setItem(TEST_REPORT_STORAGE_KEY, JSON.stringify(current ? reports.map((item) => item.id === current.id ? saved : item) : [...reports, saved]));
  return build(saved);
}
