import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  Filter,
  Plus,
  Star,
  ExternalLink,
  Download,
  Eye,
  FileText,
  FileCode,
  Presentation,
  Palette,
  FileSpreadsheet,
  FileCheck,
  TrendingUp,
  FolderCheck,
  Sparkles,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  Share2
} from '@/components/common/octicons-compat';
import { KnowledgeCategoryInfo, KnowledgeDoc } from '../../types';

interface KnowledgeCenterViewProps {
  categories: KnowledgeCategoryInfo[];
  docs: KnowledgeDoc[];
  selectedCategoryFilter: string | null;
  onSelectCategoryFilter: (categoryName: string | null) => void;
  onOpenDoc: (doc: KnowledgeDoc) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteDoc: (id: string) => void;
  onOpenUpload: () => void;
}

export const KnowledgeCenterView: React.FC<KnowledgeCenterViewProps> = ({
  categories,
  docs,
  selectedCategoryFilter,
  onSelectCategoryFilter,
  onOpenDoc,
  onToggleFavorite,
  onDeleteDoc,
  onOpenUpload
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'views' | 'title'>('updatedAt');

  // Compute Metrics
  const totalCategoriesCount = 4;
  const totalSubCategoriesCount = 16;
  const totalDocsCount = docs.reduce((acc, d) => acc + 1, 0) + 588; // 600+
  const monthlyNewCount = 48;
  const totalFavoritesCount = docs.filter((d) => d.isFavorited).length + 316; // 320

  // All available tags
  const allTags = Array.from(new Set(docs.flatMap((d) => d.tags || [])));

  // Filter docs
  const filteredDocs = docs
    .filter((doc) => {
      // Category filter
      if (selectedCategoryFilter && doc.category !== selectedCategoryFilter) {
        return false;
      }
      // Tag filter
      if (selectedTag && !doc.tags?.includes(selectedTag)) {
        return false;
      }
      // Only favorites
      if (onlyFavorites && !doc.isFavorited) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchCategory = doc.category.toLowerCase().includes(q);
        const matchAuthor = doc.author.toLowerCase().includes(q);
        const matchTags = doc.tags?.some((t) => t.toLowerCase().includes(q));
        const matchSummary = doc.summary?.toLowerCase().includes(q);
        return matchTitle || matchCategory || matchAuthor || matchTags || matchSummary;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'views') {
        return (b.views || 0) - (a.views || 0);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title, 'zh-CN');
      }
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });

  const getDocIcon = (type?: string) => {
    switch (type) {
      case 'word':
      case 'doc':
        return <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />;
      case 'code':
        return <FileCode className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
      case 'ppt':
        return <Presentation className="w-4 h-4 text-purple-500 flex-shrink-0" />;
      case 'design':
        return <Palette className="w-4 h-4 text-cyan-500 flex-shrink-0" />;
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4 text-teal-500 flex-shrink-0" />;
      default:
        return <FileCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Metric Data Cards (Strict Image 1: 指标数据) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: 分类总数 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>分类总数</span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FolderCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalCategoriesCount}
            </span>
            <span className="text-xs text-slate-400">
              大类 / {totalSubCategoriesCount} 专业库
            </span>
          </div>
        </div>

        {/* Metric 2: 文档总数 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>文档总数</span>
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalDocsCount}+
            </span>
            <span className="text-xs text-slate-400">篇</span>
          </div>
        </div>

        {/* Metric 3: 本月新增 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>本月新增</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              +{monthlyNewCount}
            </span>
            <span className="text-xs text-slate-400">篇</span>
          </div>
        </div>

        {/* Metric 4: 收藏量 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>收藏量</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Star className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalFavoritesCount}
            </span>
            <span className="text-xs text-slate-400">次</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索文档名称、创建人、标签、摘要..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Right Tools: View switch, sort, upload */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  onlyFavorites
                    ? 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
                仅看收藏
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="updatedAt">按更新时间</option>
                <option value="views">按阅读量排序</option>
                <option value="title">按名称排序</option>
              </select>

              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-500'}`}
                  title="表格视图"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-500'}`}
                  title="卡片视图"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={onOpenUpload}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                上传文档
              </button>
            </div>
          </div>

          {/* Categories Tab Pill Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-slate-400 text-[11px] mr-1">分类筛选:</span>
            <button
              onClick={() => onSelectCategoryFilter(null)}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                selectedCategoryFilter === null
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              全部分类 ({docs.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectCategoryFilter(selectedCategoryFilter === c.name ? null : c.name)}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${
                  selectedCategoryFilter === c.name
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {c.name}
              </button>
            ))}
            <button
              onClick={() => onSelectCategoryFilter(selectedCategoryFilter === '售前文档' ? null : '售前文档')}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                selectedCategoryFilter === '售前文档'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              售前文档
            </button>
            <button
              onClick={() => onSelectCategoryFilter(selectedCategoryFilter === '行业洞察' ? null : '行业洞察')}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                selectedCategoryFilter === '行业洞察'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              行业洞察
            </button>
          </div>

          {/* Tags quick filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-400 mr-1">标签速选:</span>
              {allTags.slice(0, 10).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    selectedTag === t
                      ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  #{t}
                </button>
              ))}
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-rose-500 hover:underline ml-1"
                >
                  清除标签筛选
                </button>
              )}
            </div>
          )}
        </div>

        {/* Document List View (Strict Table matching Image 1) */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">文档名称</th>
                  <th className="py-3 px-4">文档分类</th>
                  <th className="py-3 px-4">创建人</th>
                  <th className="py-3 px-4">版本</th>
                  <th className="py-3 px-4">更新时间</th>
                  <th className="py-3 px-4 text-center">阅读量</th>
                  <th className="py-3 px-4 text-center">查看</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      没有找到匹配的知识库文档，请尝试重置筛选或上传新文档
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* 文档名称 */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {getDocIcon(doc.fileType)}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                onClick={() => onOpenDoc(doc)}
                                className="font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                              >
                                {doc.title}
                              </span>
                              {doc.isNew && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                  新
                                </span>
                              )}
                              {doc.isPinned && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                                  置顶
                                </span>
                              )}
                            </div>
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {doc.tags.slice(0, 3).map((t) => (
                                  <span
                                    key={t}
                                    className="text-[10px] text-slate-400 dark:text-slate-500 font-medium"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 文档分类 */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {doc.category}
                        </div>
                        {doc.subCategory && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {doc.subCategory}
                          </div>
                        )}
                      </td>

                      {/* 创建人 */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {doc.author || doc.creator || '团队成员'}
                      </td>

                      {/* 版本 */}
                      <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400 font-medium">
                        {doc.version || 'V1.0.0'}
                      </td>

                      {/* 更新时间 */}
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {doc.updatedAt}
                      </td>

                      {/* 阅读量 */}
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3 text-slate-400" />
                          {doc.views || 0}
                        </span>
                      </td>

                      {/* 查看 (高亮跳转按钮 - 严格对齐 Image 1: 查看跳转至钉钉文档) */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onOpenDoc(doc)}
                            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 dark:text-blue-400 font-semibold text-[11px] transition-colors"
                          >
                            在线预览
                          </button>
                          {doc.dingtalkUrl && (
                            <a
                              href={doc.dingtalkUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="跳转至钉钉文档"
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 操作 */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onToggleFavorite(doc.id)}
                            title={doc.isFavorited ? '取消收藏' : '收藏'}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              doc.isFavorited
                                ? 'border-amber-300 bg-amber-50 text-amber-500 dark:border-amber-800 dark:bg-amber-950/60'
                                : 'border-transparent text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${doc.isFavorited ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>

                          <button
                            onClick={() => onDeleteDoc(doc.id)}
                            title="归档文档"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cards Grid Mode */
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="group border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getDocIcon(doc.fileType)}
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {doc.category}
                      </span>
                    </div>
                    <button
                      onClick={() => onToggleFavorite(doc.id)}
                      className="text-slate-400 hover:text-amber-500"
                    >
                      <Star className={`w-4 h-4 ${doc.isFavorited ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>

                  <h4
                    onClick={() => onOpenDoc(doc)}
                    className="text-xs font-bold text-slate-900 dark:text-white mt-2.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 cursor-pointer transition-colors line-clamp-2"
                  >
                    {doc.title}
                  </h4>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {doc.summary || '已沉淀至公司知识库的标准文档。'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{doc.author} · {doc.version || 'V1.0.0'}</span>
                  <button
                    onClick={() => onOpenDoc(doc)}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    查看详情 →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Summary */}
        <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>共找到 <strong className="font-mono text-slate-800 dark:text-slate-200">{filteredDocs.length}</strong> 篇文档</span>
          <span className="text-[11px] text-slate-400">企业知识中枢 · 支持钉钉与企业微信双通道同步</span>
        </div>
      </div>
    </div>
  );
};
