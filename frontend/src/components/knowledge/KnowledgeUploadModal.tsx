import React, { useState } from 'react';
import { Modal } from '../common/UIComponents';
import { KnowledgeDoc, KnowledgePrimaryCategory } from '../../types';

interface KnowledgeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (doc: Partial<KnowledgeDoc>) => void;
}

export const KnowledgeUploadModal: React.FC<KnowledgeUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<KnowledgePrimaryCategory>('应知应会');
  const [subCategory, setSubCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [version, setVersion] = useState('V1.0.0');
  const [summary, setSummary] = useState('');
  const [fileType, setFileType] = useState<'word' | 'code' | 'ppt' | 'pdf' | 'excel' | 'design' | 'doc'>('doc');
  const [dingtalkUrl, setDingtalkUrl] = useState('');
  const [wecomUrl, setWecomUrl] = useState('');
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    onSubmit({
      title: title.trim(),
      category,
      subCategory: subCategory.trim() || '通用规范',
      tags: tags.length > 0 ? tags : ['企业标准'],
      version: version.trim() || 'V1.0.0',
      summary: summary.trim() || '已沉淀至公司知识库的标准文档。',
      content: content.trim(),
      fileType,
      dingtalkUrl: dingtalkUrl.trim() || 'https://dingtalk.com/doc/share',
      wecomUrl: wecomUrl.trim() || 'https://work.weixin.qq.com/doc/share',
      fileSize: '4.2 MB',
      isMine: true,
      isFollowed: true
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="上传 / 沉淀企业知识文档"
      width="max-w-2xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
          >
            确认发布沉淀
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Document Title */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
            文档名称 <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：智慧校园平台V3.0产品需求规格说明书"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              一级分类 <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as KnowledgePrimaryCategory)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="应知应会">应知应会（培训资料、规章制度）</option>
              <option value="产研规范">产研规范（研发、产品、设计、交付）</option>
              <option value="产品沉淀">产品沉淀（产品设计、研发、部署）</option>
              <option value="项目沉淀">项目沉淀（验收、技术支持、运维）</option>
              <option value="售前文档">售前文档（宣讲PPT、招投标标书）</option>
              <option value="行业洞察">行业洞察（行业分析、竞品动态）</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              二级子分类 / 专业领域
            </label>
            <input
              type="text"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="例如：研发规范、产品设计文档、行业知识"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Version & File Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              版本号
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="V1.0.0 或 2024版"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              文档格式类型
            </label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="doc">Word / 文档 (DOC)</option>
              <option value="code">代码 / 规范手册 (CODE)</option>
              <option value="ppt">演示文稿 / 宣讲 (PPT)</option>
              <option value="pdf">行业报告 / 白皮书 (PDF)</option>
              <option value="design">UI/UX 交互设计稿 (DESIGN)</option>
              <option value="excel">数据表格 / Checklist (EXCEL)</option>
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
            标签关键词 (以逗号或空格分隔)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="例如：产品设计, PRD, 智慧校园, 交付规范"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
            文档摘要 / 适用场景说明
          </label>
          <textarea
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="简要概括文档核心内容，便于全员高效检索..."
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
        </div>

        {/* DingTalk / WeCom links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              钉钉文档链接 (可选)
            </label>
            <input
              type="text"
              value={dingtalkUrl}
              onChange={(e) => setDingtalkUrl(e.target.value)}
              placeholder="https://dingtalk.com/doc/..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              企业微信文档链接 (可选)
            </label>
            <input
              type="text"
              value={wecomUrl}
              onChange={(e) => setWecomUrl(e.target.value)}
              placeholder="https://work.weixin.qq.com/doc/..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-[11px]"
            />
          </div>
        </div>

        {/* Content text */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
            正文内容简述 / Markdown 大纲 (可选)
          </label>
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="输入文档大纲或核心段落..."
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-mono text-[11px]"
          />
        </div>
      </form>
    </Modal>
  );
};
