import React, { useState } from 'react';
import { Button, Col, Form, Input, Modal, Row, Select } from 'antd';
import { KnowledgeDoc, KnowledgePrimaryCategory } from '../../types';

interface KnowledgeUploadModalProps {
  mode?: 'library' | 'review';
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (doc: Partial<KnowledgeDoc>) => void;
}

export const KnowledgeUploadModal: React.FC<KnowledgeUploadModalProps> = ({
  mode = 'library',
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
  const [linkUrl, setLinkUrl] = useState('');
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
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
      summary: summary.trim() || (mode === 'review' ? '' : '已沉淀至公司知识库的标准文档。'),
      content: content.trim(),
      fileType,
      linkUrl: linkUrl.trim() || undefined,
      fileSize: mode === 'review' ? undefined : '4.2 MB',
      isMine: true,
      isFollowed: true
    });

    onClose();
  };

  return <Modal open={isOpen} onCancel={onClose} title={mode === 'review' ? '新建知识沉淀' : '上传 / 沉淀企业知识文档'} width={720}
    footer={<><Button onClick={onClose}>取消</Button><Button type="primary" disabled={!title.trim()} onClick={handleSubmit}>{mode === 'review' ? '确认添加' : '确认发布沉淀'}</Button></>}>
    <Form layout="vertical">
      <Form.Item label="文档名称" required><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：智慧校园平台V3.0产品需求规格说明书" /></Form.Item>
      <Row gutter={16}>
        <Col span={12}><Form.Item label="一级分类" required><Select value={category} onChange={setCategory} options={['应知应会', '产研规范', '产品沉淀', '项目沉淀', '售前文档', '行业洞察'].map(value => ({ value, label: value }))}/></Form.Item></Col>
        <Col span={12}><Form.Item label="二级子分类 / 专业领域"><Input value={subCategory} onChange={e => setSubCategory(e.target.value)} placeholder="例如：研发规范、产品设计文档、行业知识" /></Form.Item></Col>
        <Col span={12}><Form.Item label="版本号"><Input value={version} onChange={e => setVersion(e.target.value)} placeholder="V1.0.0 或 2024版" /></Form.Item></Col>
        <Col span={12}><Form.Item label="文档格式类型"><Select value={fileType} onChange={setFileType} options={[{value:'doc',label:'Word / 文档 (DOC)'},{value:'code',label:'代码 / 规范手册 (CODE)'},{value:'ppt',label:'演示文稿 / 宣讲 (PPT)'},{value:'pdf',label:'行业报告 / 白皮书 (PDF)'},{value:'design',label:'UI/UX 交互设计稿 (DESIGN)'},{value:'excel',label:'数据表格 / Checklist (EXCEL)'}]} /></Form.Item></Col>
      </Row>
      <Form.Item label="标签关键词 (以逗号或空格分隔)"><Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="例如：产品设计, PRD, 智慧校园, 交付规范" /></Form.Item>
      <Form.Item label="文档摘要 / 适用场景说明"><Input.TextArea rows={2} value={summary} onChange={e => setSummary(e.target.value)} placeholder="简要概括文档核心内容，便于全员高效检索..." /></Form.Item>
      <Form.Item label="链接地址（可选）"><Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="请输入文档链接地址" /></Form.Item>
      <Form.Item label="正文内容简述 / Markdown 大纲 (可选)"><Input.TextArea rows={3} value={content} onChange={e => setContent(e.target.value)} placeholder="输入文档大纲或核心段落..." /></Form.Item>
    </Form>
  </Modal>;
};
