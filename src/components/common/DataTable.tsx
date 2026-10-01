import React from 'react';

export const DataTable: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="w-full text-left text-xs">{children}</table>
  </div>
);
