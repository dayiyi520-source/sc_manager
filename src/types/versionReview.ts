export type VersionReviewStatus = 'DRAFT' | 'SUBMITTED';
export type VersionReviewConclusion = '通过' | '有条件通过' | '不通过';

export interface VersionReviewListItem {
  id: string;
  reviewDate?: string;
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
  participants: Array<{ id: string; name: string }>;
}

export interface SaveVersionReviewInput {
  reviewDate?: string;
  participantIds: string[];
  conclusion?: VersionReviewConclusion;
  summary?: string;
  remainingRisks?: string;
  releaseRecommendation?: string;
  revision?: number;
}
