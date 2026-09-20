import React from 'react';
import { Avatar } from 'antd';
import type { EmployeeOption } from '../../types';

const AVATAR_TONES = [
  'var(--accent-purple)',
  'var(--warning)',
  'var(--primary)',
  'var(--success)',
] as const;

const personInitial = (name?: string) => Array.from((name || '').trim())[0] || '未';

const personTone = (name?: string) => {
  const hash = Array.from((name || '').trim()).reduce((total, character) => total + (character.codePointAt(0) || 0), 0);
  return AVATAR_TONES[hash % AVATAR_TONES.length];
};

export const employeeJobTitle = (employee: Partial<Pick<EmployeeOption, 'jobTitle' | 'roleTitle'>>) =>
  employee.jobTitle?.trim() || employee.roleTitle?.trim() || '';

export const formatEmployeeOptionLabel = (employee: Pick<EmployeeOption, 'name'> & Partial<Pick<EmployeeOption, 'jobTitle' | 'roleTitle'>>) =>
  `${employee.name} · ${employeeJobTitle(employee) || '未设置职位'}`;

export const employeeSelectOptions = (
  employees: EmployeeOption[],
  valueField: 'id' | 'name' = 'id',
) => employees.map((employee) => ({
  value: employee[valueField],
  label: formatEmployeeOptionLabel(employee),
}));

interface PersonIdentityProps {
  name?: string;
  subtitle?: string;
  size?: number;
  className?: string;
  emptyLabel?: string;
  variant?: 'default' | 'list';
}

interface PersonAvatarProps {
  name?: string;
  size?: number;
  className?: string;
}

export const PersonAvatar: React.FC<PersonAvatarProps> = ({ name, size = 24, className = '' }) => {
  const displayName = name?.trim() || '未设置';
  return (
    <Avatar
      size={size}
      className={`shrink-0 text-[10px] font-semibold text-white ${className}`.trim()}
      style={{
        backgroundColor: personTone(displayName),
        fontSize: 10,
      }}
    >
      {personInitial(displayName)}
    </Avatar>
  );
};

export const PersonIdentity: React.FC<PersonIdentityProps> = ({
  name,
  subtitle,
  size = 24,
  className = '',
  emptyLabel = '未设置',
  variant = 'default',
}) => {
  const displayName = name?.trim() || emptyLabel;
  const resolvedSize = variant === 'list' ? 24 : size;
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${variant === 'list' ? 'h-6' : ''} ${className}`.trim()}
      title={subtitle ? `${displayName} · ${subtitle}` : displayName}
      data-person-variant={variant}
    >
      <PersonAvatar name={displayName} size={resolvedSize} />
      <div className="min-w-0">
        <div className={`truncate font-medium text-[var(--text-primary)] ${variant === 'list' ? 'text-xs leading-6' : ''}`.trim()}>{displayName}</div>
        {subtitle && <div className="truncate text-xs text-[var(--text-muted)]">{subtitle}</div>}
      </div>
    </div>
  );
};
