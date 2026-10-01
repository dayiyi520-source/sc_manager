import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatVersionPublishedAt, latestReleasedVersion, matchesProductLineFilters, normalizeProductWebsiteUrl, productLineMemberCount, productLineVersionCount } from './ProductLinesView';
import type { ProductLine } from '../../types';
import { preferredWorkItemTypeName } from './workItemTypeDefaults';
import { productLineDisplayStatus } from './productLinePresentation';

const productLinesSource = readFileSync(new URL('./ProductLinesView.tsx', import.meta.url), 'utf8');
const settingsSource = readFileSync(new URL('./ProductLineDetailView.tsx', import.meta.url), 'utf8');
const tasksSource = readFileSync(new URL('./RequirementTasksView.tsx', import.meta.url), 'utf8');
const datePickerStyles = readFileSync(new URL('../../styles/antd-override.css', import.meta.url), 'utf8');

describe('product line work item defaults', () => {
  it('keeps a valid explicit selection and otherwise chooses the default type', () => {
    const items = [
      { name: '产品类型需求', isDefault: true },
      { name: '技术类需求', isDefault: false },
    ];
    expect(preferredWorkItemTypeName(items, '技术类需求')).toBe('技术类需求');
    expect(preferredWorkItemTypeName(items, '')).toBe('产品类型需求');
    expect(preferredWorkItemTypeName([{ name: '其他需求' }], '')).toBe('');
  });

  it('creates product lines with the template enabled by default', () => {
    expect(productLinesSource).toContain('useState(true)');
    expect(productLinesSource).toContain('initializeWorkItemTemplate');
    expect(productLinesSource).toContain('aria-label="工作项设置模板"');
    expect(productLinesSource).toContain('if (!saved) return');
  });

  it('shows the actual product-line version count in the card action', () => {
    expect(productLineVersionCount('line-1', [
      { productLineId: 'line-1' },
      { productLineId: 'line-2' },
      { productLineId: 'line-1' },
    ])).toBe(2);
    expect(productLinesSource).toContain('版本管理 ({versionCount})');
    expect(productLinesSource).toContain('版本管理 ({productLineVersionCount(pl.id, versions)})');
    expect(productLinesSource).toContain('成员管理 ({productLineMemberCount(pl)})');
  });

  it('uses the latest published version as the online version and formats its release time', () => {
    const line = {
      id: 'line-1', name: '产品', code: 'P', description: '', versions: [
        { id: 'draft', code: 'V3.0.0', name: '草稿', status: '迭代中', releaseDate: '2026-10-01T09:00:00' },
        { id: 'published-old', code: 'V1.0.0', name: '旧线上版本', status: '已发布', releaseDate: '2026-09-01T09:00:00' },
        { id: 'published-new', code: 'V2.0.0', name: '新线上版本', status: '已发布', releaseDate: '2026-09-28T15:30:00' },
      ]
    } as ProductLine;
    expect(latestReleasedVersion(line)?.code).toBe('V2.0.0');
    expect(formatVersionPublishedAt(latestReleasedVersion(line))).toBe('2026-09-28 15:30');
    expect(productLinesSource).toContain("title: '线上版本'");
    expect(productLinesSource).toContain("onlineVersion?.code || onlineVersion?.name || '暂无发布'");
    expect(productLinesSource).toContain("发布时间：{onlineVersion ? formatVersionPublishedAt(onlineVersion) : '无发布'}");
    expect(productLinesSource).toContain('暂无线上版本</div>');
    expect(settingsSource).toContain('latestReleasedVersion({ versions: lineVersions })');
    expect(settingsSource).toContain("发布时间：{onlineVersion ? onlinePublishedAt : '无发布'}");
  });

  it('recognizes a published version even when release time is missing', () => {
    const line = { versions: [{ id: 'published', code: 'V1.0.5', name: '已发布版本', status: '已发布' }] } as ProductLine;
    expect(latestReleasedVersion(line)?.code).toBe('V1.0.5');
  });

  it('keeps the responsibility member count consistent in card and list actions', () => {
    expect(productLineMemberCount({
      id: 'line-1', name: '产品', code: 'P', description: '', ownerName: '林志豪',
      members: [{ id: 'm1', userId: 'u1', name: '林志豪', role: '管理员' }],
      requirementOwner: '陈宇璋', requirementOwnerSecondary: '张瑞'
    })).toBe(3);
  });

  it('uses the requested metric labels, order and clickable task navigation', () => {
    const labels = ['协助事项', '产品任务', '设计任务', '研发任务', '测试任务', '缺陷任务'];
    let previous = -1;
    labels.forEach((label) => {
      const next = productLinesSource.indexOf(`<span>${label}</span>`, previous + 1);
      expect(next).toBeGreaterThan(previous);
      previous = next;
    });
    expect(productLinesSource).not.toContain('<span>待办缺陷</span>');
    expect(productLinesSource).toContain('openAllTaskPage');
    expect(productLinesSource).toContain("text-[var(--danger)]");
  });

  it('opens only configured http product websites from the product-line card', () => {
    expect(normalizeProductWebsiteUrl(' https://product.example.com/path ')).toBe('https://product.example.com/path');
    expect(normalizeProductWebsiteUrl('https://product.example.com/')).toBe('https://product.example.com/');
    expect(normalizeProductWebsiteUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeProductWebsiteUrl('')).toBeNull();
    expect(productLinesSource).toContain('产品网址');
    expect(productLinesSource).toContain('disabled={!productWebsiteUrl}');
    expect(productLinesSource).toContain("window.open(productWebsiteUrl, '_blank', 'noopener,noreferrer')");
  });

  it('shows an actionable empty state when the product card area has no results', () => {
    expect(productLinesSource).toContain("title={productLines.length === 0 ? '暂无产品' : '未找到匹配产品'}");
    expect(productLinesSource).toContain('清除筛选');
    expect(productLinesSource).toContain('<EmptyState');
  });

  it('combines product name or code search with owner and displayed-status filters', () => {
    const line = { id: 'line-1', name: '协同产品', code: 'PL-01', ownerName: '林志豪', description: '' } as ProductLine;
    expect(matchesProductLineFilters(line, ' 协同 ', '林志豪', '启用中', '启用中')).toBe(true);
    expect(matchesProductLineFilters(line, 'pl-01', '', '', '启用中')).toBe(true);
    expect(matchesProductLineFilters(line, '林志豪', '', '', '启用中')).toBe(false);
    expect(matchesProductLineFilters(line, '', '其他人', '', '启用中')).toBe(false);
    expect(matchesProductLineFilters(line, '', '', '已停用', '启用中')).toBe(false);
    expect(productLinesSource).toContain("fixed: 'right' as const");
    expect(productLinesSource).toContain('搜索产品名称/编码...');
    expect(productLinesSource).toContain('<Pagination total={filteredLines.length}');
    expect(productLinesSource).toContain("['待规划', '迭代中', '已归档', '已停用'");
  });

  it('edits and labels the default work item type', () => {
    expect(settingsSource).toContain('aria-label="是否默认"');
    expect(settingsSource).toContain("<Tag color=\"blue\">默认</Tag>");
    expect(settingsSource).toContain('isDefault: Boolean(item.isDefault)');
  });

  it('uses the shared public/private visibility layout and updated product labels', () => {
    expect(productLinesSource).toContain('产品网址');
    expect(productLinesSource).not.toContain('官网/体验站');
    expect(productLinesSource).not.toContain('仅创建者可见');
    expect(settingsSource).toContain('是否启用');
    expect(settingsSource).toContain('选择主负责人');
    expect(settingsSource).not.toContain('- 主责任人');
    expect(settingsSource).toContain('text-[var(--primary)]');
    expect(productLinesSource).toContain('maxLength={1000}');
    expect(productLinesSource).toContain('showCount');
  });

  it('keeps planned completion optional and lets Ant Design own DatePicker internals', () => {
    expect(tasksSource).toContain('<Form.Item label="计划完成时间"><DatePicker');
    expect(tasksSource).not.toContain('<Form.Item label="计划完成时间" required>');
    expect(datePickerStyles).toContain('.tech-shell .ant-picker .ant-picker-input > input');
    expect(datePickerStyles).not.toContain('.task-page .work-item-panel .ant-picker .ant-picker-input');
    expect(datePickerStyles).not.toContain('.ant-picker-cell-inner');
  });
});

describe('产品展示状态按版本和终态计算', () => {
  it('无版本时显示待规划', () => {
    expect(productLineDisplayStatus({ health: '待规划', versions: [] })).toBe('待规划');
  });

  it('存在版本时显示迭代中', () => {
    expect(productLineDisplayStatus({ health: '待规划', versions: [{ id: 'version-1' }] as never[] })).toBe('迭代中');
  });

  it('已归档和已停用优先于版本状态', () => {
    expect(productLineDisplayStatus({ health: '已归档', versions: [{ id: 'version-1' }] as never[] })).toBe('已归档');
    expect(productLineDisplayStatus({ health: '已停用', versions: [{ id: 'version-1' }] as never[] })).toBe('已停用');
  });
});
