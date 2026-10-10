// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productRepository } from './productRepository';
import { TEST_REPORT_STORAGE_KEY } from './mockTestReports';

const root = '/api/product-lines/line-1/versions/version-1/test-reports';
import { mockApiRequest } from './mockApi';
import { downloadTestReport } from '../utils/testReportDownload';

describe('测试报告保存与下载', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([{ id: 'line-1', name: '产品', versions: [{ id: 'version-1', name: '迭代' }] }]));
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([{ id: 'task-1', productLineId: 'line-1', versionId: 'version-1', title: '测试任务' }]));
    localStorage.setItem('shichuang.frontend.mock.testPlans', JSON.stringify([{ id: 'plan-1', workItemId: 'task-1', name: '测试计划', cases: [{ testCaseId: 'case-1' }], revision: 0 }]));
  });
  const create = () => productRepository.createVersionTestReport('line-1', 'version-1', { name: '保存验收报告', reportType: '功能测试', attachments: [{ name: '截图.png', url: 'data:image/png;base64,AAAA' }] });

  it('新建后重新读取仍存在，可编辑空计划报告，删除不影响计划', async () => {
    const created = await create();
    expect(JSON.parse(localStorage.getItem(TEST_REPORT_STORAGE_KEY)!)).toHaveLength(1);
    expect(await productRepository.testReports()).toEqual([expect.objectContaining({ id: created.id, name: '保存验收报告' })]);
    const updated = await productRepository.updateVersionTestReport('line-1', 'version-1', created.id, { name: '修改报告', reportType: '回归测试', summary: '<p>结果</p>', revision: 0 });
    expect(updated.revision).toBe(1);
    const reread = await productRepository.versionTestReport('line-1', 'version-1', created.id);
    expect(reread.name).toBe('修改报告'); expect(reread.attachments).toHaveLength(1);
    await expect(productRepository.deleteVersionTestReport('line-1', 'version-1', created.id, 0)).rejects.toThrow('已被更新');
    await productRepository.deleteVersionTestReport('line-1', 'version-1', created.id, 1);
    expect(await productRepository.testReports()).toEqual([]);
    await expect(productRepository.versionTestReport('line-1', 'version-1', created.id)).rejects.toThrow('已删除');
    expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.testPlans')!)).toHaveLength(1);
  });

  it('编辑允许更换产品迭代和附件，附件清空或无效迭代不覆盖旧记录', async () => {
    const report = await create();
    localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([{ id: 'line-1', name: '产品', versions: [{ id: 'version-1', name: '迭代' }] }, { id: 'line-2', name: '产品二', versions: [{ id: 'version-2', name: '迭代二' }] }]));
    await expect(productRepository.updateVersionTestReport('line-1', 'version-1', report.id, { name: '报告', reportType: '功能测试', attachments: [], revision: 0 })).rejects.toThrow('报告附件');
    await expect(productRepository.updateVersionTestReport('line-1', 'version-1', report.id, { name: '报告', reportType: '功能测试', productLineId: 'line-2', versionId: 'version-1', revision: 0 })).rejects.toThrow('迭代不存在');
    await productRepository.updateVersionTestReport('line-1', 'version-1', report.id, { name: '移入产品二', reportType: '回归测试', productLineId: 'line-2', versionId: 'version-2', attachments: [{ name: '新报告.pdf', url: 'data:application/pdf;base64,AAAA' }], revision: 0 });
    expect(await productRepository.versionTestReports('line-1', 'version-1')).toEqual([]);
    expect(await productRepository.versionTestReport('line-2', 'version-2', report.id)).toMatchObject({ productLineId: 'line-2', versionId: 'version-2', revision: 1, attachments: [{ name: '新报告.pdf', url: 'data:application/pdf;base64,AAAA' }] });
  });

  it('拒绝错误版本和计划，不保存半成品', async () => {
    await expect(mockApiRequest(root.replace('version-1', 'missing'), { method: 'POST', body: JSON.stringify({ name: '错误报告', reportType: '功能测试', testPlanIds: [] }) })).rejects.toThrow('迭代不存在');
    await expect(productRepository.createVersionTestReport('line-1', 'version-1', { name: '缺附件报告', reportType: '功能测试', attachments: [] })).rejects.toThrow('报告附件');
    expect(await productRepository.testReports()).toEqual([]);
  });

  it('远程附件以原始字节下载，读取失败时明确报错', async () => {
    const report = await create();
    const file = new Blob(['original-pdf'], { type: 'application/pdf' });
    const fetchFile = vi.fn().mockResolvedValue({ ok: true, blob: async () => file });
    vi.stubGlobal('fetch', fetchFile);
    const createUrl = vi.fn().mockReturnValue('blob:original');
    const revokeUrl = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers();
    try {
      const attachmentReport = { ...report, attachments: [{ name: '原报告.pdf', url: 'https://files.example.com/original.pdf' }] };
      await downloadTestReport(attachmentReport);
      expect(createUrl).toHaveBeenCalledWith(file);
      expect(fetchFile).toHaveBeenCalledWith('https://files.example.com/original.pdf', expect.objectContaining({ credentials: 'same-origin' }));
      expect(click).toHaveBeenCalledOnce();
      vi.runAllTimers(); expect(revokeUrl).toHaveBeenCalledWith('blob:original');
      fetchFile.mockResolvedValueOnce({ ok: false });
      await expect(downloadTestReport(attachmentReport)).rejects.toThrow('下载附件失败');
      expect(click).toHaveBeenCalledOnce();
    } finally { click.mockRestore(); vi.useRealTimers(); vi.unstubAllGlobals(); }
  });

  it('下载上传的原始附件，保留原文件名并拒绝危险链接', async () => {
    const report = await create();
    const files: Array<{ href: string; name: string }> = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { files.push({ href: this.href, name: this.download }); });
    try {
      await downloadTestReport(report);
      expect(files).toEqual([{ href: 'data:image/png;base64,AAAA', name: '截图.png' }]);
      await expect(downloadTestReport({ ...report, attachments: [] })).rejects.toThrow('没有可下载');
      await expect(downloadTestReport({ ...report, attachments: [{ name: '恶意附件', url: 'javascript:alert(1)' }] })).rejects.toThrow('无效');
      expect(click).toHaveBeenCalledOnce();
    } finally { click.mockRestore(); }
  });
});
