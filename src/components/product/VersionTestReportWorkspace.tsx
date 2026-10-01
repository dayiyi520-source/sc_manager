import React from 'react';
import { VersionTestReportPanel } from './VersionTestReportPanel';

export const VersionTestReportWorkspace: React.FC<{ productLineFilter?: string }> = ({ productLineFilter = 'all' }) => {
  const fixedLineId = productLineFilter === 'all' ? '' : productLineFilter;
  return <VersionTestReportPanel productLineId={fixedLineId} versionId="" versionName="" />;
};
