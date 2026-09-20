import React, { useEffect, useMemo } from 'react';
import { Alert, Select } from 'antd';
import { useApp } from '../../context/AppContext';

type Props = {
  productLineFilter?: string;
  productLineId: string;
  versionId: string;
  onProductLineChange: (value: string) => void;
  onVersionChange: (value: string) => void;
};

export const ProductVersionScope: React.FC<Props> = ({ productLineFilter = 'all', productLineId, versionId, onProductLineChange, onVersionChange }) => {
  const { productLines } = useApp();
  const fixedLineId = productLineFilter !== 'all' ? productLineFilter : '';
  const activeLineId = fixedLineId || productLineId;
  const line = productLines.find((item) => item.id === activeLineId);
  const versions = useMemo(() => line?.versions || [], [line]);

  useEffect(() => {
    if (fixedLineId && fixedLineId !== productLineId) onProductLineChange(fixedLineId);
  }, [fixedLineId, onProductLineChange, productLineId]);
  useEffect(() => {
    if (versionId && !versions.some((item) => item.id === versionId)) onVersionChange('');
  }, [onVersionChange, versionId, versions]);

  return <div className="space-y-3">
    <div className="grid gap-3 md:grid-cols-2">
      <Select aria-label="评审产品线" showSearch optionFilterProp="label" value={activeLineId || undefined} disabled={Boolean(fixedLineId)} placeholder="选择产品线" options={productLines.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => { onProductLineChange(value); onVersionChange(''); }} />
      <Select aria-label="迭代版本" showSearch optionFilterProp="label" value={versionId || undefined} disabled={!activeLineId} placeholder="选择迭代版本" options={versions.map((item) => ({ value: item.id, label: item.name }))} onChange={onVersionChange} />
    </div>
    {activeLineId && versions.length === 0 && <Alert type="info" showIcon title="当前产品线暂无迭代版本" />}
  </div>;
};
