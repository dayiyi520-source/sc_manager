// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ConfigProvider } from 'antd';
import { ReviewKnowledgeModal } from './ReviewKnowledgeModal';
import { readKnowledgeAttachment } from '../../../services/knowledgeAttachments';
vi.mock('../../../services/knowledgeAttachments',async importOriginal=>({...await importOriginal<object>(),readKnowledgeAttachment:vi.fn(async(file:File)=>({id:file.name,name:file.name,size:file.size,data:'data:text/plain;base64,YQ=='}))}));
afterEach(()=>vi.clearAllMocks());
const mount=(onSubmit=vi.fn(),onClose=vi.fn())=>({ ...render(<ConfigProvider theme={{token:{motion:false}}}><ReviewKnowledgeModal onSubmit={onSubmit} onClose={onClose}/></ConfigProvider>),onSubmit,onClose });
const fill=()=>{
 fireEvent.change(screen.getByRole('textbox',{name:'标题'}),{target:{value:'  发布回滚经验  '}});
 fireEvent.change(screen.getByRole('textbox',{name:'场景与痛点'}),{target:{value:'  发布后出现异常  '}});
 fireEvent.change(screen.getByRole('textbox',{name:'执行动作与复盘结论'}),{target:{value:' 回滚后验证并补充检查 '}});
};
it('requires all three required fields and exposes the exact hints and limits',async()=>{
 const {onSubmit}=mount();
 expect(screen.getByPlaceholderText('一句话概括业务场景，用于知识库检索')).toHaveAttribute('maxlength','50');
 expect(screen.getByPlaceholderText('简述工作背景、目标，以及遇到的问题 / 卡点')).toHaveAttribute('maxlength','500');
 expect(screen.getByPlaceholderText('描述本次处理方式，复盘提炼可复用的优化做法')).toHaveAttribute('maxlength','500');
 expect(screen.getByPlaceholderText('写明适用场景，以及经验如何内部传播落地')).toHaveAttribute('maxlength','500');
 expect(screen.getByPlaceholderText('https://example.com').tagName).toBe('INPUT');
 expect(screen.getByText('支持多个附件，总大小不超过5MB。')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/确认添加/}));
 for(const message of ['请输入标题','请输入场景与痛点','请输入执行动作与复盘结论']) expect(await screen.findByText(message)).toBeInTheDocument();
 expect(onSubmit).not.toHaveBeenCalled();
});
it('trims content, allows blank optional fields and rejects unsafe links',async()=>{
 const {onSubmit,onClose}=mount();fill();
 fireEvent.change(screen.getByRole('textbox',{name:'关联资料链接'}),{target:{value:'javascript:alert(1)'}});
 fireEvent.click(screen.getByRole('button',{name:/确认添加/}));
 expect(await screen.findByText('请输入有效的 http 或 https 链接')).toBeInTheDocument();
 expect(onSubmit).not.toHaveBeenCalled();
 fireEvent.change(screen.getByRole('textbox',{name:'关联资料链接'}),{target:{value:''}});
 fireEvent.click(screen.getByRole('button',{name:/确认添加/}));
 await waitFor(()=>expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({formatVersion:2,title:'发布回滚经验',scenarioAndPain:'发布后出现异常',actionsAndConclusion:'回滚后验证并补充检查',reusePlan:undefined,linkUrl:undefined,attachments:[]})));
 expect(onClose).toHaveBeenCalledOnce();
});
it('preserves inputs on save failure and blocks duplicate submissions and closing while saving',async()=>{
 let resolve!: (value:boolean)=>void;
 const onSubmit=vi.fn().mockReturnValueOnce(new Promise<boolean>(done=>{resolve=done;})).mockResolvedValueOnce(true);
 const {onClose}=mount(onSubmit);fill();
 fireEvent.click(screen.getByRole('button',{name:/确认添加/}));
 await waitFor(()=>expect(onSubmit).toHaveBeenCalledOnce());
 expect(screen.getByRole('textbox',{name:'标题'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:/确认添加/}));
 fireEvent.click(screen.getByRole('button',{name:/取\s*消/}));
 expect(onClose).not.toHaveBeenCalled();
 await act(async()=>resolve(false));
 expect(screen.getByText('添加失败，请重试，已填写内容已保留')).toBeInTheDocument();
 expect(screen.getByRole('textbox',{name:'场景与痛点'})).toHaveValue('  发布后出现异常  ');
 fireEvent.click(screen.getByRole('button',{name:/确认添加/}));
 await waitFor(()=>expect(onClose).toHaveBeenCalledOnce());
});
it('accounts for a concurrent batch of attachments before accepting the combined total',async()=>{
 const {container,onSubmit}=mount();fill();
 const files=[new File([new Uint8Array(3*1024*1024)],'first.bin'),new File([new Uint8Array(3*1024*1024)],'second.bin')];
 fireEvent.change(document.querySelector('input[type="file"]')!,{target:{files}});
 expect(await screen.findByText('附件总大小不能超过 5MB')).toBeInTheDocument();
 await waitFor(()=>expect(readKnowledgeAttachment).toHaveBeenCalledTimes(2));
 fireEvent.click(screen.getByRole('button',{name:/确认添加/}));
 await waitFor(()=>expect(onSubmit).toHaveBeenCalledOnce());
 expect(onSubmit.mock.calls[0][0].attachments).toHaveLength(1);
 expect(onSubmit.mock.calls[0][0].attachments[0].size).toBe(3*1024*1024);
});
