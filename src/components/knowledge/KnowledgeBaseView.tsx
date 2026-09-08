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

export const KnowledgeBaseView: React.FC = () => {
  const {
    knowledgeDocs,
    addKnowledgeDoc,
    toggleFavoriteDoc,
    deleteKnowledgeDoc,
    addToast
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
    addToast('success', '知识文档已发布', `《${newDocData.title}》已成功沉淀至公司知识库`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Knowledge Sub-Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'home'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            知识库首页
          </button>

          <button
            onClick={() => setActiveTab('center')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'center'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            知识资产总数: <strong className="font-mono text-slate-800 dark:text-slate-200 font-bold">{knowledgeDocs.length + 588} 篇</strong>
          </span>
        </div>
      </div>

      {/* Main View Router */}
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

      {/* Document Detail Preview Drawer */}
      <KnowledgeDocDetailDrawer
        doc={selectedDocForDetail}
        onClose={() => setSelectedDocForDetail(null)}
        onToggleFavorite={toggleFavoriteDoc}
      />

      {/* Upload Modal */}
      <KnowledgeUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleUploadSubmit}
      />
    </div>
  );
};
