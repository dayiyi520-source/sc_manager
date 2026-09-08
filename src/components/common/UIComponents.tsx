import React from 'react';
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle, ArrowUpRight, ArrowDownRight } from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';

export const FORM_CONTROL_CLASS = 'w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-2.5 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none';

export const FormField: React.FC<{ label: string; required?: boolean; className?: string; children: React.ReactNode }> = ({ label, required, className = '', children }) => (
  <label className={`block space-y-1 ${className}`}>
    <span className="block font-medium text-[var(--text-body)]">{label}{required ? ' *' : ''}</span>
    {children}
  </label>
);

export interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  unit?: string;
  change?: string;
  isPositive?: boolean;
  subText?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  unit,
  change,
  isPositive = true,
  subText,
  icon,
  iconBgColor = 'bg-blue-950/40 text-blue-300 border border-blue-800/60',
  onClick,
  className = ''
}) => {
  const tone = iconBgColor.includes('rose') || iconBgColor.includes('pink')
    ? 'pink'
    : iconBgColor.includes('amber') || iconBgColor.includes('orange')
    ? 'orange'
    : iconBgColor.includes('emerald') || iconBgColor.includes('green')
    ? 'green'
    : iconBgColor.includes('purple') || iconBgColor.includes('indigo')
    ? 'purple'
    : 'blue';

  return (
    <div
      id={id}
      onClick={onClick}
      className={`tech-stat-card tech-tone-${tone} border rounded-lg p-5 transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        <div className={`tech-stat-icon p-2.5 rounded-md ${iconBgColor}`}>{icon}</div>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-serif font-bold tracking-tight text-[var(--text-primary)]">
          {value}
        </span>
        {unit && <span className="text-xs font-normal text-slate-400">{unit}</span>}
      </div>
      {(change || subText) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {change && (
            <span
              className={`inline-flex items-center font-medium font-mono ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 inline" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 inline" />
              )}
              {change}
            </span>
          )}
          {subText && <span className="text-slate-500">{subText}</span>}
        </div>
      )}
    </div>
  );
};

export const StatusTag: React.FC<{
  status: string;
  type?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gold';
  className?: string;
}> = ({ status, type, className = '' }) => {
  // Auto detect type if not provided
  let detectedType = type;
  if (!detectedType) {
    if (['已通过', '中标', '已发布', '已完成', '合作中', '履行中', 'healthy', '低风险', 'reviewed'].includes(status)) {
      detectedType = 'success';
    } else if (['待审批', '招投标', '制作标书中', '进行中', '测试中', '研发中', 'warning', '中度预警', '待修复', '待评审'].includes(status)) {
      detectedType = 'warning';
    } else if (['已驳回', '未中标', '流标', '已终止', 'P0-紧急阻断', '致命', '严重', 'error', '严重滞后', '有逾期款项'].includes(status)) {
      detectedType = 'danger';
    } else if (['方案设计', '需求确认', '待处理', '设计中', '规划中', '封版测试'].includes(status)) {
      detectedType = 'info';
    } else if (['S级-战略', '战略核心伙伴', '一级'].includes(status)) {
      detectedType = 'gold';
    } else {
      detectedType = 'default';
    }
  }

  const styles = {
    default: 'bg-[var(--bg-surface-soft)] text-[var(--text-body)] border-[var(--border-main)]',
    success: 'bg-[color-mix(in_srgb,var(--success)_12%,var(--bg-surface))] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_36%,var(--border-main))]',
    warning: 'bg-[color-mix(in_srgb,var(--warning)_12%,var(--bg-surface))] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_36%,var(--border-main))]',
    danger: 'bg-[color-mix(in_srgb,var(--danger)_12%,var(--bg-surface))] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_36%,var(--border-main))]',
    info: 'bg-[color-mix(in_srgb,var(--primary)_12%,var(--bg-surface))] text-[var(--active-text)] border-[color-mix(in_srgb,var(--primary)_36%,var(--border-main))]',
    purple: 'bg-[color-mix(in_srgb,var(--ai-indigo)_12%,var(--bg-surface))] text-[var(--ai-indigo)] border-[color-mix(in_srgb,var(--ai-indigo)_36%,var(--border-main))]',
    gold: 'bg-[color-mix(in_srgb,var(--warning)_12%,var(--bg-surface))] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_36%,var(--border-main))]'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${styles[detectedType]} ${className}`}
    >
      {status}
    </span>
  );
};

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}> = ({ isOpen, onClose, title, children, footer, maxWidth = 'xl' }) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div
        className={`relative bg-[var(--bg-surface)] text-[var(--text-body)] rounded-xl shadow-2xl border border-[var(--border-main)] w-full ${maxWidthClasses[maxWidth]} my-8 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)] font-serif tracking-wide">{title}</h3>
          <button
            id="btn-modal-close"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[calc(85vh-130px)] overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-main)] bg-[var(--bg-main)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const Drawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  hideSubtitle?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}> = ({ isOpen, onClose, title, subtitle, hideSubtitle, children, footer, width = 'max-w-2xl' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div
        className={`w-screen ${width} bg-[var(--bg-surface)] text-[var(--text-body)] shadow-2xl border-l border-[var(--border-main)] flex flex-col`}
        >
          <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-surface-soft)]">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)] font-serif tracking-wide">{title}</h2>
              {subtitle && !hideSubtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
            </div>
            <button
              id="btn-drawer-close"
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="border-t border-[var(--border-main)] px-6 py-4 bg-[var(--bg-main)] flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-[var(--warning)] shrink-0" />
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-[var(--bg-surface-soft)] text-[var(--text-body)] border border-[var(--border-main)] rounded-lg shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-right duration-200"
        >
          {iconMap[toast.type]}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-[var(--text-primary)] leading-tight">{toast.title}</h4>
            {toast.message && (
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
