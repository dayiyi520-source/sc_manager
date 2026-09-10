import React, { useState } from 'react';
import {
  BookOpen,
  LayoutDashboard
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { INITIAL_KNOWLEDGE_CATEGORIES } from '../../data/mockData';
import { KnowledgeHomeView } from './KnowledgeHomeView';
import { KnowledgeCenterView } from './KnowledgeCenterView';
import { KnowledgeDocDetailDrawer } from './KnowledgeDocDetailDrawer';
import { KnowledgeUploadModal } from './KnowledgeUploadModal';
import { KnowledgeDoc } from '../../types';
import { message } from '@/components/common';

export const KnowledgeBaseView: React.FC = () => {
  const {
    knowledgeDocs,
    addKnowledgeDoc,
    toggleFavoriteDoc,
    deleteKnowledgeDoc
  } = useApp();

  const [activeTab, setActiveTab] = useState<'home' | 'center'>('home');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [selectedDocForDetail, setSelectedDocForDetail] = useState<KnowledgeDoc | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Category select handler from Home cards
  const handleSelectCategoryFromHome = (categoryName: string) => {
    setSelectedCategoryFilter(categoryName);
    setActiveTab('center');
  };

  const handleNavigateToCenter = () => {
    setActiveTab('center');
  };

  const handleOpenDoc = (doc: KnowledgeDoc) => {
    setSelectedDocForDetail(doc);
  };

  const handleUploadSubmit = (newDocData: Partial<KnowledgeDoc>) => {
    addKnowledgeDoc(newDocData);
    message.success(`知识文档《${newDocData.title}》已成功沉淀至公司知识库`);
  };

  return (
    <div className="space-y-6">
      {/* 顶部导航标签 */}
      <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'home'
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            知识库首页
          </button>

          <button
            onClick={() => setActiveTab('center')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'center'
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            知识中心
            {selectedCategoryFilter && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
                {selectedCategoryFilter}
              </span>
            )}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
            知识资产总数: <strong className="font-mono text-[var(--text-primary)] font-bold">{knowledgeDocs.length + 588} 篇</strong>
          </span>
        </div>
      </div>

      {/* 主视图路由 */}
      {activeTab === 'home' ? (
        <KnowledgeHomeView
          categories={INITIAL_KNOWLEDGE_CATEGORIES}
          docs={knowledgeDocs}
          onSelectCategory={handleSelectCategoryFromHome}
          onOpenDoc={handleOpenDoc}
          onToggleFavorite={toggleFavoriteDoc}
          onNavigateToCenter={handleNavigateToCenter}
        />
      ) : (
        <KnowledgeCenterView
          categories={INITIAL_KNOWLEDGE_CATEGORIES}
          docs={knowledgeDocs}
          selectedCategoryFilter={selectedCategoryFilter}
          onSelectCategoryFilter={setSelectedCategoryFilter}
          onOpenDoc={handleOpenDoc}
          onToggleFavorite={toggleFavoriteDoc}
          onDeleteDoc={deleteKnowledgeDoc}
          onOpenUpload={() => setIsUploadModalOpen(true)}
        />
      )}

      {/* 文档详情预览抽屉 */}
      <KnowledgeDocDetailDrawer
        doc={selectedDocForDetail}
        onClose={() => setSelectedDocForDetail(null)}
        onToggleFavorite={toggleFavoriteDoc}
      />

      {/* 上传模态框 */}
      <KnowledgeUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleUploadSubmit}
      />
    </div>
  );
};