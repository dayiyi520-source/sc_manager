import React, { useCallback, useMemo, useState } from 'react';
import { Empty } from 'antd';
import { useApp } from '../../context/AppContext';
import { ProductVersionScope } from './ProductVersionScope';
import { VersionTestReportPanel } from './VersionTestReportPanel';

export const VersionTestReportWorkspace: React.FC<{ productLineFilter?: string }> = ({ productLineFilter = 'all' }) => {
  const { productLines } = useApp();
  const [productLineId, setProductLineId] = useState(productLineFilter === 'all' ? '' : productLineFilter);
  const [versionId, setVersionId] = useState('');
  const changeLine = useCallback((value: string) => setProductLineId(value), []);
  const changeVersion = useCallback((value: string) => setVersionId(value), []);
  const lineId = productLineFilter === 'all' ? productLineId : productLineFilter;
  const versionName = useMemo(() => productLines.find((line) => line.id === lineId)?.versions?.find((version) => version.id === versionId)?.name || '', [lineId, productLines, versionId]);

  return <div className="space-y-4">
    <ProductVersionScope productLineFilter={productLineFilter} productLineId={lineId} versionId={versionId} onProductLineChange={changeLine} onVersionChange={changeVersion} />
    {lineId && versionId ? <VersionTestReportPanel productLineId={lineId} versionId={versionId} versionName={versionName} /> : <div className="flex min-h-56 items-center justify-center"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择产品线和迭代版本" /></div>}
  </div>;
};
