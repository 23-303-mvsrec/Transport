import React from 'react';

export const BusCardSkeleton = () => (
  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium space-y-4 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-slate-200 rounded-2xl animate-shimmer" />
        <div className="space-y-1.5 text-left">
          <div className="h-4 w-24 bg-slate-200 rounded animate-shimmer" />
          <div className="h-3 w-32 bg-slate-100 rounded animate-shimmer" />
        </div>
      </div>
      <div className="h-6 w-16 bg-slate-200 rounded-xl animate-shimmer" />
    </div>
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bg-slate-200 animate-shimmer w-1/3" />
    </div>
  </div>
);

export const RouteCardSkeleton = () => (
  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex justify-between items-center animate-pulse">
    <div className="flex gap-4">
      <div className="h-11 w-11 bg-slate-200 rounded-2xl animate-shimmer flex items-center justify-center" />
      <div className="space-y-2 text-left">
        <div className="h-4.5 w-28 bg-slate-200 rounded animate-shimmer" />
        <div className="h-3 w-40 bg-slate-100 rounded animate-shimmer" />
      </div>
    </div>
    <div className="h-7 w-20 bg-slate-200 rounded-xl animate-shimmer" />
  </div>
);

export const MapSkeleton = () => (
  <div className="w-full h-full min-h-[300px] bg-slate-900 flex items-center justify-center relative overflow-hidden animate-pulse">
    <div className="absolute inset-0 bg-slate-800 animate-shimmer" />
    <div className="z-10 flex flex-col items-center gap-2 text-slate-400">
      <div className="h-5 w-24 bg-slate-700/80 rounded animate-shimmer" />
      <span className="text-xs font-bold tracking-wide">Loading map...</span>
    </div>
  </div>
);

export const StopListSkeleton = () => (
  <div className="space-y-4 w-full">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-slate-200 rounded-full animate-shimmer" />
          <div className="space-y-1.5 text-left">
            <div className="h-4 w-28 bg-slate-200 rounded animate-shimmer" />
            <div className="h-3 w-36 bg-slate-100 rounded animate-shimmer" />
          </div>
        </div>
        <div className="h-5 w-12 bg-slate-200 rounded animate-shimmer" />
      </div>
    ))}
  </div>
);

export const AdminTableSkeleton = () => (
  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium space-y-4 animate-pulse">
    <div className="flex justify-between items-center pb-2">
      <div className="h-5 w-36 bg-slate-200 rounded animate-shimmer" />
      <div className="h-8 w-24 bg-slate-200 rounded-lg animate-shimmer" />
    </div>
    <div className="w-full overflow-hidden rounded-2xl border border-slate-50">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100">
            {[...Array(5)].map((_, i) => (
              <th key={i} className="py-3 px-4"><div className="h-3 w-16 bg-slate-200 rounded animate-shimmer" /></th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {[...Array(5)].map((_, rowIndex) => (
            <tr key={rowIndex}>
              {[...Array(5)].map((_, colIndex) => (
                <td key={colIndex} className="py-4 px-4"><div className="h-3 w-20 bg-slate-100 rounded animate-shimmer" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
