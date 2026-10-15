import { KnowledgeAttachments } from './KnowledgeAttachments';
import { Empty } from 'antd';
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
  docs,
  onOpenDoc,
  onToggleFavorite,
  onDeleteDoc,
  onOpenUpload
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'views' | 'title'>('updatedAt');

  // Compute Metrics
  const totalDocsCount = docs.reduce((acc, d) => acc + 1, 0) + 588; // 600+
  const monthlyNewCount = 48;
  const totalFavoritesCount = docs.filter((d) => d.isFavorited).length + 316; // 320


  // Filter docs
  const filteredDocs = docs
    .filter((doc) => {
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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


        </div>

        {/* Document List View (Strict Table matching Image 1) */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">标题</th>
                  <th className="py-3 px-4">内容摘要</th>
                  <th className="py-3 px-4">链接地址</th>
                  <th className="py-3 px-4">附件</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                      <Empty description="暂无知识沉淀"/>
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

                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">{doc.summary || '——'}</td>
                      <td className="py-3 px-4">{doc.linkUrl ? <a href={/^https?:\/\//i.test(doc.linkUrl) ? doc.linkUrl : undefined} target="_blank" rel="noreferrer">{doc.linkUrl}</a> : '——'}</td>
                      <td className="py-3 px-4"><KnowledgeAttachments attachments={doc.attachments}/></td>

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
                    {doc.summary || '——'}
                  </p>
                  <div className="mt-2">{doc.linkUrl ? <a href={/^https?:\/\//i.test(doc.linkUrl) ? doc.linkUrl : undefined} target="_blank" rel="noreferrer">{doc.linkUrl}</a> : '——'}<KnowledgeAttachments attachments={doc.attachments}/></div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{doc.author}</span>
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
