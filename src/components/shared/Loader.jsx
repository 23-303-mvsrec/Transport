import React from 'react';

export const Spinner = ({ size = 'md', color = 'primary' }) => {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };

  const colors = {
    primary: 'border-t-primary border-slate-200',
    white: 'border-t-white border-white/20',
    secondary: 'border-t-secondary border-slate-200'
  };

  return (
    <div className={`animate-spin rounded-full ${sizes[size]} ${colors[color]}`} />
  );
};

export const CardSkeleton = () => (
  <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-premium animate-pulse-subtle">
    <div className="flex justify-between items-center">
      <div className="h-6 w-24 bg-slate-200 rounded"></div>
      <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
    </div>
    <div className="h-4 w-full bg-slate-100 rounded"></div>
    <div className="h-4 w-3/4 bg-slate-100 rounded"></div>
    <div className="flex gap-2 pt-2">
      <div className="h-7 w-20 bg-slate-200 rounded-lg"></div>
      <div className="h-7 w-20 bg-slate-200 rounded-lg"></div>
    </div>
  </div>
);

export const ListSkeleton = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const FullPageLoader = ({ message = 'Loading CityBus tracker...' }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6 text-center">
    <Spinner size="lg" />
    <p className="mt-4 text-sm font-semibold text-slate-500 animate-pulse">{message}</p>
  </div>
);
