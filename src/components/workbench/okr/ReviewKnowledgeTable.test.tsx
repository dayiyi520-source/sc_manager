// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ReviewKnowledgeTable } from './ReviewKnowledgeTable';
import { ReviewKnowledgeContent } from './ReviewKnowledgeContent';
const entry={id:'mine',title:'本人经验',category:'应知应会',formatVersion:2 as const,scenarioAndPain:'场景说明',actionsAndConclusion:'结论说明',reusePlan:'在部门分享',linkUrl:'https://example.com/doc',attachments:[{id:'file',name:'说明.txt',size:1,data:'data:text/plain;base64,YQ=='}]};
it('uses the employee columns, opens full details and deletes an owned entry',()=>{
 const onDelete=vi.fn(),onView=vi.fn();
 render(<ReviewKnowledgeTable entries={[entry]} readOnly={false} disabled={false} onDelete={onDelete} onView={onView}/>);
 expect(screen.getAllByRole('columnheader').map(node=>node.textContent)).toEqual(['标题','场景与痛点','执行动作与复盘结论','操作']);
 fireEvent.click(screen.getByRole('button',{name:'本人经验'}));expect(onView).toHaveBeenCalledWith(entry);
 fireEvent.click(screen.getByRole('button',{name:'删除知识沉淀本人经验'}));expect(onDelete).toHaveBeenCalledWith('mine');
});
it('retains deletion only for supervisor-owned entries and uses provenance even when the employee name is missing',()=>{
 const own={...entry,title:'主管经验'},employee={...entry,id:'source',title:'员工经验',sourceReviewId:'review-a',sourceEmployee:'员工甲'},unknown={...entry,id:'unknown',title:'历史员工经验',sourceReviewId:'review-b'};
 render(<ReviewKnowledgeTable entries={[own,employee,unknown]} department viewerName="主管" readOnly={false} disabled={false} onDelete={vi.fn()} onView={vi.fn()}/>);
 expect(screen.getByRole('columnheader',{name:'来源员工'})).toBeInTheDocument();
 expect(within(screen.getByRole('button',{name:'员工经验'}).closest('tr')!).getByText('员工甲')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'删除知识沉淀员工经验'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'删除知识沉淀历史员工经验'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'删除知识沉淀主管经验'})).toBeEnabled();
});
it('prevents mutations while busy or read-only, and displays every saved field and downloadable attachment',()=>{
 const props={entries:[entry],onDelete:vi.fn(),onView:vi.fn()};
 const view=render(<ReviewKnowledgeTable {...props} readOnly={false} disabled/>);
 expect(screen.getByRole('button',{name:'删除知识沉淀本人经验'})).toBeDisabled();
 view.rerender(<ReviewKnowledgeTable {...props} readOnly disabled={false}/>);
 expect(screen.queryByRole('columnheader',{name:'操作'})).not.toBeInTheDocument();
 view.rerender(<ReviewKnowledgeContent entry={entry}/>);
 for(const text of ['场景说明','结论说明','在部门分享'])expect(screen.getByText(text)).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'https://example.com/doc'})).toHaveAttribute('href',entry.linkUrl);
 expect(screen.getByRole('link',{name:'说明.txt'})).toHaveAttribute('download','说明.txt');
});
it('keeps historical summary and content visible without inventing new content',()=>{
 render(<ReviewKnowledgeContent entry={{id:'old',category:'旧分类',title:'旧知识',summary:'历史摘要',content:'历史正文'}}/>);
 expect(screen.getByText('历史摘要')).toBeInTheDocument();expect(screen.getByText('历史正文')).toBeInTheDocument();
});
