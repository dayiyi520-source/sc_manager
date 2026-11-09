import React from 'react';
import './comprehensive-page.css';

interface ComprehensivePageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  hideHeader?: boolean;
}

export const ComprehensivePage: React.FC<ComprehensivePageProps> = ({ title, description, icon, children, hideHeader = false }) => (
  <div className="comprehensive-page space-y-6">
    {!hideHeader && <header className="comprehensive-page-header">
      <span className="comprehensive-page-icon" aria-hidden="true">{icon}</span>
      <div className="comprehensive-page-heading">
        <span className="comprehensive-page-eyebrow">COMPREHENSIVE CENTER</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>}
    {children}
  </div>
);
