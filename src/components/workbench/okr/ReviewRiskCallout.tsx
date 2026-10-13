import { Input } from 'antd';
import { AlertTriangle } from '@/components/common/octicons-compat';

export function ReviewRiskCallout({ value, onChange, disabled = false, label }: { value: string; onChange: (value: string) => void; disabled?: boolean; label?: string }) {
  return <div className="okr-review-risk-callout"><AlertTriangle/><div><b>风险原因及所需支持</b><Input.TextArea aria-label={label} value={value} onChange={event => onChange(event.target.value)} disabled={disabled} autoSize={{ minRows: 2, maxRows: 5 }} placeholder="说明风险或阻塞原因、外部依赖和所需支持"/></div></div>;
}
