import type { OkrPayload, OkrPerson, OkrRecord } from './okrRepository';
import { departmentRoundReviews } from './departmentReviewSubmission';
import { reviewTemplateFor } from './okrReviewTemplates';

export function reviewTemplateAggregations(payload: OkrPayload, records: OkrRecord[], people: OkrPerson[], ownerId: string, submit = false): NonNullable<OkrPayload['reviewTemplateAggregations']> {
  const result: NonNullable<OkrPayload['reviewTemplateAggregations']> = {};
  if (payload.reviewTemplateSnapshot?.audience !== 'supervisor' || reviewTemplateFor(people.find(person => person.id === ownerId), people) !== 'supervisor') return result;
  for (const block of payload.reviewTemplateSnapshot?.blocks || []) {
    const config = block.aggregation;
    if (!config || block.visible === false) continue;
    result[block.id] = departmentRoundReviews(payload, records, people, ownerId).flatMap(({ employee, review }) => {
      if (!review || review.payload.reviewType !== config.sourceReportType || review.payload.reviewMode === 'supervisor' || review.payload.reviewTemplateSnapshot?.audience !== 'employee') return [];
      const source = review.payload.reviewTemplateSnapshot?.blocks.find(item => item.id === config.sourceBlockId);
      if (!source || source.visible === false || source.departmentLink?.reportType !== payload.reviewType) return [];
      const content = source.fields.map(field => String(review.payload.reviewTemplateValues?.[field.id] ?? '').trim()).filter(Boolean).join('\n');
      if (!content) return [];
      const saved = payload.reviewTemplateAggregations?.[block.id]?.find(row => row.employeeId === employee.id && row.reviewId === review.id && row.content === content);
      const judgment = config.needsJudgment && saved?.judgment && config.judgmentOptions.includes(saved.judgment) ? saved.judgment : undefined;
      if (submit && config.needsJudgment && !judgment) throw new Error(`请完成${block.title}中${employee.name}的${config.judgmentLabel}`);
      return [{ employeeId: employee.id, employeeName: employee.name, reviewId: review.id, content, judgment }];
    });
  }
  return result;
}
