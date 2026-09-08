import React from 'react';

export const CRMDetailActions: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex flex-wrap items-center justify-end gap-2 ${className}`}>{children}</div>
);
