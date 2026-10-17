import type { OkrReviewKnowledge } from '../../../services/okrRepository';
import { reviewKnowledgeConclusion, reviewKnowledgeLink, reviewKnowledgeScenario } from '../../../services/reviewKnowledge';
import { KnowledgeAttachments } from '../KnowledgeAttachments';

export function ReviewKnowledgeContent({ entry }: { entry: OkrReviewKnowledge }) {
  const link = reviewKnowledgeLink(entry.linkUrl);
  return <div className="space-y-4">
    {[['场景与痛点', reviewKnowledgeScenario(entry)], ['执行动作与复盘结论', reviewKnowledgeConclusion(entry)], ['复用范围与推广计划', entry.reusePlan]].map(([label, value]) => <div key={label}><h4 className="text-sm font-semibold">{label}</h4><p className="whitespace-pre-wrap break-words">{value || '—'}</p></div>)}
    <div><h4 className="text-sm font-semibold">关联资料链接</h4>{link ? <a className="break-all" href={link} target="_blank" rel="noreferrer">{entry.linkUrl}</a> : <span>{entry.linkUrl || '—'}</span>}</div>
    <div><h4 className="text-sm font-semibold">附件</h4><KnowledgeAttachments attachments={entry.attachments}/></div>
    {entry.tags?.length ? <p className="break-words">{entry.tags.join('、')}</p> : null}
    {entry.dingtalkUrl && <p className="break-words">钉钉文档：{entry.dingtalkUrl}</p>}
    {entry.wecomUrl && <p className="break-words">企微文档：{entry.wecomUrl}</p>}
  </div>;
}
