import React from 'react';

export const Badge = ({ children, variant = 'info', className = '' }) => {
  const variants = {
    info: 'bg-primary-light text-primary border-primary/20',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/50',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/50',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    dark: 'bg-slate-900 text-slate-100 border-slate-800'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
