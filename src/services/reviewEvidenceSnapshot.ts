import type { OkrWork } from './okrRepository';

/** Preserve business associations in saved reviews even when the source is later unavailable. */
export function reviewEvidenceMetadata(item: OkrWork) {
  const metadata: Partial<Pick<OkrWork, 'sourceId' | 'taskType' | 'productLineId' | 'productLineName' | 'versionId' | 'versionName' | 'projectId' | 'projectName'>> = {
    sourceId: item.sourceId, taskType: item.taskType,
    productLineId: item.productLineId, productLineName: item.productLineName,
    versionId: item.versionId, versionName: item.versionName,
    projectId: item.projectId, projectName: item.projectName,
  };
  for (const key of Object.keys(metadata) as Array<keyof typeof metadata>) if (metadata[key] === undefined) delete metadata[key];
  return metadata;
}
