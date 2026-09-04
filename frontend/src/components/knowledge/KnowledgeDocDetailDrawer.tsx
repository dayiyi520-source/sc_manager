import React from 'react';
import {
  FileText,
  FileCode,
  FileSpreadsheet,
  Presentation,
  FileCheck,
  Palette,
  ExternalLink,
  Download,
  Star,
  Share2,
  Calendar,
  User,
  Eye,
  Layers,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { Drawer, StatusTag } from '../common/UIComponents';
import { KnowledgeDoc } from '../../types';

interface KnowledgeDocDetailDrawerProps {
  doc: KnowledgeDoc | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
}

export const KnowledgeDocDetailDrawer: React.FC<KnowledgeDocDetailDrawerProps> = ({
  doc,
  onClose,
  onToggleFavorite
}) => {
  if (!doc) return null;

  const getFileIcon = (type?: string) => {
    switch (type) {
      case 'word':
      case 'doc':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'code':
        return <FileCode className="w-5 h-5 text-emerald-500" />;
      case 'ppt':
        return <Presentation className="w-5 h-5 text-purple-500" />;
      case 'design':
        return <Palette className="w-5 h-5 text-cyan-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-teal-500" />;
      default:
        return <FileCheck className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <Drawer
      isOpen={!!doc}
      onClose={onClose}
      title={doc.title}
      subtitle={`所属分类: ${doc.category}${doc.subCategory ? ` / ${doc.subCategory}` : ''} · 版本: ${doc.version || 'V1.0.0'}`}
      width="max-w-3xl"
      footer={
        <>
          <div className="flex items-center gap-2 mr-auto">
            <button
              onClick={() => onToggleFavorite(doc.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                doc.isFavorited
                  ? 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Star className={`w-4 h-4 ${doc.isFavorited ? 'fill-amber-400 text-amber-500' : ''}`} />
              {doc.isFavorited ? '已收藏' : '收藏文档'}
            </button>

            {doc.dingtalkUrl && (
              <a
                href={doc.dingtalkUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                钉钉文档协作
              </a>
            )}

            {doc.wecomUrl && (
              <a
                href={doc.wecomUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                企业微信文档
              </a>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
          >
            关闭预览
          </button>
        </>
      }
    >
      <div className="space-y-6 text-xs text-slate-700 dark:text-slate-300">
        {/* Top Header Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700">
                {getFileIcon(doc.fileType)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {doc.title}
                  </h3>
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
                <div className="text-slate-500 mt-1 flex items-center gap-3 text-[11px]">
                  <span>版本: <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{doc.version || 'V1.0.0'}</span></span>
                  <span>文件大小: {doc.fileSize || '3.8 MB'}</span>
                  <span>格式: {doc.fileType?.toUpperCase() || 'DOC'}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]">
                <Eye className="w-3.5 h-3.5" />
                {doc.views || 120} 次阅读
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-slate-400 text-[11px] block">责任作者</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{doc.author}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">所属分类</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{doc.category}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">更新时间</span>
              <span className="font-medium text-slate-600 dark:text-slate-400 font-mono">{doc.updatedAt}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">借阅/下载</span>
              <span className="font-medium text-slate-600 dark:text-slate-400 font-mono">{doc.downloadsCount || 42} 次</span>
            </div>
          </div>

          {doc.tags && doc.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-slate-400 text-[11px] mr-1">标签:</span>
              {doc.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[11px] font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Document Summary */}
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
            <Sparkles className="w-4 h-4 text-blue-500" />
            文档摘要与核心定位
          </h4>
          <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/60 leading-relaxed text-slate-700 dark:text-slate-300">
            {doc.summary || '该文档汇聚了相关业务领域的标准规范与实施作业指南，作为团队日常协同与项目交付的核心参考依据。'}
          </div>
        </div>

        {/* Document Content Preview */}
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
            <BookOpen className="w-4 h-4 text-slate-500" />
            正文内容在线预览
          </h4>
          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 font-sans text-slate-800 dark:text-slate-200 shadow-2xs">
            {doc.content ? (
              <div className="whitespace-pre-line leading-relaxed space-y-3">
                {doc.content}
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                  {doc.title}
                </h2>
                <div className="space-y-3 leading-relaxed">
                  <p>
                    <strong>一、编写目的与适用范围</strong><br />
                    本规范适用于师创全线数字化项目的设计、研发、测试及现场交付全生命周期。旨在统一各职能团队的技术标准、交互规范与输出交付质量。
                  </p>
                  <p>
                    <strong>二、核心技术契约与作业标准</strong><br />
                    所有参与人员须严格遵循架构委员会制定的基线标准。任何针对主干版本和生产环境的架构调整或标准变更，均需提交《变更申请单》并经技术评审委员会审批通过后方可执行。
                  </p>
                  <p>
                    <strong>三、知识资产复用与共享</strong><br />
                    本知识文档已同步关联至企业钉钉知识库与企业微信协作空间，支持全员检索、借阅与版本追溯。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
