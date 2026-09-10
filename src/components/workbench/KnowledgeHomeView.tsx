import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  Settings,
  Layers,
  BarChart2,
  FileText,
  FileCode,
  Presentation,
  Palette,
  FileSpreadsheet,
  FileCheck,
  Star,
  MoreVertical,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Bell,
  CheckCircle,
  Eye,
  Clock,
  User
} from '@/components/common/octicons-compat';
import { KnowledgeCategoryInfo, KnowledgeDoc } from '../../types';

interface KnowledgeHomeViewProps {
  categories: KnowledgeCategoryInfo[];
  docs: KnowledgeDoc[];
  onSelectCategory: (categoryName: string) => void;
  onOpenDoc: (doc: KnowledgeDoc) => void;
  onToggleFavorite: (id: string) => void;
  onNavigateToCenter: () => void;
}

export const KnowledgeHomeView: React.FC<KnowledgeHomeViewProps> = ({
  categories,
  docs,
  onSelectCategory,
  onOpenDoc,
  onToggleFavorite,
  onNavigateToCenter
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeUpdateTab, setActiveUpdateTab] = useState<'all' | 'followed' | 'mine'>('all');
  const [openMenuDocId, setOpenMenuDocId] = useState<string | null>(null);

  const hotKeywords = ['产品规范', '研发规范', '售前PPT', '竞品分析', '行业报告', '部署规范'];

  const getDocIcon = (type?: string) => {
    switch (type) {
      case 'word':
      case 'doc':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        );
      case 'code':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <FileCode className="w-5 h-5" />
          </div>
        );
      case 'ppt':
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <Presentation className="w-5 h-5" />
          </div>
        );
      case 'design':
        return (
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0">
            <Palette className="w-5 h-5" />
          </div>
        );
      case 'excel':
        return (
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
        );
    }
  };

  const getCategoryIcon = (iconName: string, colorClass: string) => {
    switch (iconName) {
      case 'BookOpen':
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
        );
      case 'Settings':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
            <Settings className="w-5 h-5" />
          </div>
        );
      case 'Layers':
        return (
          <div className="w-9 h-9 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
        );
      case 'BarChart2':
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <BarChart2 className="w-5 h-5" />
          </div>
        );
    }
  };

  // Filter latest updates
  const filteredLatestDocs = docs.filter((doc) => {
    if (activeUpdateTab === 'followed') {
      return doc.isFollowed || doc.isFavorited;
    }
    if (activeUpdateTab === 'mine') {
      return doc.isMine || doc.author === '张磊' || doc.creator === '毛景强';
    }
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        doc.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Favorite docs
  const favoriteDocs = docs.filter((d) => d.isFavorited);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      onNavigateToCenter();
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Purple-Pink Gradient Search Banner (Strict Image 2 Design) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-500 text-white p-8 md:p-10 shadow-md">
        {/* Ambient subtle blur glow background */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-52 h-52 bg-pink-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-2xl mx-auto text-center space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            知识，让工作更高效
          </h1>
          <p className="text-white/85 text-xs md:text-sm">
            汇聚全公司知识沉淀，助力每一位师创人快速成长
          </p>

          {/* Search Box Container */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-6 flex items-center bg-white dark:bg-slate-900 rounded-xl shadow-lg p-1.5 border border-white/20 transition-all focus-within:ring-2 focus-within:ring-white/40"
          >
            <div className="pl-3 pr-2 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索文档、培训资料、行业报告..."
              className="w-full bg-transparent text-xs md:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none py-1.5"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              搜索
            </button>
          </form>

          {/* Hot Searches */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
            <span className="text-white/80 text-[11px] font-medium">热门搜索:</span>
            {hotKeywords.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSearchKeyword(tag);
                  onNavigateToCenter();
                }}
                className="px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-medium transition-colors backdrop-blur-xs cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Knowledge Categories Grid Section (4 Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            知识分类
          </h2>
          <button
            onClick={onNavigateToCenter}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium transition-colors"
          >
            查看全部分类
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.name)}
              className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4.5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  {getCategoryIcon(cat.icon, cat.color)}
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono font-medium">
                    {cat.docCount} 篇
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {cat.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                {cat.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-Column Bottom Section: Latest Updates & My Favorites */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Latest Updates - 8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                最新更新
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                本周更新 18 篇
              </span>
            </div>

            {/* Right Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setActiveUpdateTab('all')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeUpdateTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setActiveUpdateTab('followed')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeUpdateTab === 'followed'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                我关注的
              </button>
              <button
                onClick={() => setActiveUpdateTab('mine')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeUpdateTab === 'mine'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                我创建的
              </button>
            </div>
          </div>

          {/* Document List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredLatestDocs.slice(0, 5).map((doc) => (
              <div
                key={doc.id}
                className="group py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors"
              >
                <div
                  onClick={() => onOpenDoc(doc)}
                  className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                >
                  {getDocIcon(doc.fileType)}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {doc.title}
                      </h4>
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

                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                      <span>{doc.category}{doc.subCategory ? ` / ${doc.subCategory}` : ''}</span>
                      <span>·</span>
                      <span>{doc.author}</span>
                      <span>·</span>
                      <span>{doc.timeAgo || doc.updatedAt}</span>
                      <span>·</span>
                      <span>阅读 {doc.views || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(doc.id);
                    }}
                    title={doc.isFavorited ? '取消收藏' : '加入收藏'}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      doc.isFavorited
                        ? 'border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-900/60 dark:bg-amber-950/40'
                        : 'border-transparent text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${doc.isFavorited ? 'fill-amber-400 text-amber-500' : ''}`} />
                  </button>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuDocId(openMenuDocId === doc.id ? null : doc.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuDocId === doc.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-30 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <button
                          onClick={() => {
                            onOpenDoc(doc);
                            setOpenMenuDocId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          在线阅读
                        </button>
                        {doc.dingtalkUrl && (
                          <a
                            href={doc.dingtalkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 text-blue-600 dark:text-blue-400"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            钉钉打开
                          </a>
                        )}
                        {doc.wecomUrl && (
                          <a
                            href={doc.wecomUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            企微打开
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer View More */}
          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onNavigateToCenter}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold inline-flex items-center gap-1"
            >
              查看更多文档
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column (My Favorites - 4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-amber-500 text-sm">⭐</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  我的收藏
                </h3>
                <span className="text-slate-400 text-xs font-mono">({favoriteDocs.length})</span>
              </div>
              <button
                onClick={onNavigateToCenter}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-0.5"
              >
                全部
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Favorite List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
              {favoriteDocs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  暂无收藏文档，点击文档右侧星标即可快捷收藏
                </div>
              ) : (
                favoriteDocs.slice(0, 4).map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onOpenDoc(doc)}
                    className="group py-3 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {doc.title}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(doc.id);
                        }}
                        title="取消收藏"
                        className="text-amber-400 hover:text-slate-300 p-0.5 flex-shrink-0"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center justify-between">
                      <span>{doc.category}</span>
                      <span className="font-mono">{doc.favoritedAt ? `收藏于 ${doc.favoritedAt}` : '已收藏'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
