export type VersionReviewStatus = 'DRAFT' | 'SUBMITTED';
export type VersionReviewConclusion = '通过' | '有条件通过' | '不通过';

export interface VersionReviewListItem {
  id: string;
  productLineId?: string;
  productLineName?: string;
  versionId?: string;
  versionName?: string;
  meetingTopic?: string;
  reviewType?: string;
  initiatorName?: string;
  participantNames?: string;
  meetingTime?: string;
  reviewDate?: string;
  relatedTaskNames?: string;
  conclusion?: VersionReviewConclusion;
  summary?: string;
  status: VersionReviewStatus;
  participantCount: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface VersionReview extends VersionReviewListItem {
  remainingRisks?: string;
  releaseRecommendation?: string;
  agendaConclusion?: string;
  remainingIssues?: string;
  relatedTaskIds?: string[];
  attachments?: Array<{ name: string; url?: string; size?: number }>;
  participants: Array<{ id: string; name: string }>;
}

export interface SaveVersionReviewInput {
  meetingTopic: string;
  reviewType: string;
  meetingTime?: string;
  reviewDate?: string;
  productLineId?: string;
  versionId?: string;
  participantIds: string[];
  relatedTaskIds?: string[];
  conclusion?: VersionReviewConclusion;
  agendaConclusion?: string;
  remainingIssues?: string;
  attachments?: Array<{ name: string; url?: string; size?: number }>;
  summary?: string;
  remainingRisks?: string;
  releaseRecommendation?: string;
  revision?: number;
}
