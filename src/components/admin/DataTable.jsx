import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export const DataTable = ({ columns, data = [], isLoading = false, searchPlaceholder = "Search..." }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const rowHeight = 52; // Average row height in pixels
  const viewportHeight = 350; // Viewport height in pixels

  // 300ms Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset to first page on search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // Global search filtering
  const filteredData = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return data;
    const query = debouncedSearchQuery.toLowerCase().trim();
    return data.filter(item => {
      return Object.keys(item).some(key => {
        const value = item[key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      });
    });
  }, [data, debouncedSearchQuery]);

  // Sorting logic
  const sortedData = useMemo(() => {
    const sortableItems = [...filteredData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Normalise strings for case-insensitive sort
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  // Pagination logic
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const paginatedData = useMemo(() => {
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, startIndex]);

  // Virtualization logic check (if items > 20)
  const useVirtual = sortedData.length > 20;

  const displayData = useMemo(() => {
    if (useVirtual) return sortedData;
    return paginatedData;
  }, [useVirtual, sortedData, paginatedData]);

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const { virtualItems, startIndexVirtual, totalHeight, paddingTop } = useMemo(() => {
    if (!useVirtual) {
      return { virtualItems: displayData, startIndexVirtual: 0, totalHeight: 0, paddingTop: 0 };
    }

    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 3); // 3 items buffer
    const end = Math.min(displayData.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 3);

    const items = displayData.slice(start, end);
    const total = displayData.length * rowHeight;
    const padding = start * rowHeight;

    return {
      virtualItems: items,
      startIndexVirtual: start,
      totalHeight: total,
      paddingTop: padding
    };
  }, [useVirtual, displayData, scrollTop]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return (
        <span className="flex flex-col opacity-30 ml-1">
          <ChevronUp size={10} className="-mb-0.5" />
          <ChevronDown size={10} />
        </span>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp size={14} className="text-primary ml-1" />
    ) : (
      <ChevronDown size={14} className="text-primary ml-1" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs text-left">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-white border border-slate-200/80 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-primary transition"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {totalItems} record{totalItems !== 1 ? 's' : ''} found
          {useVirtual && <span className="text-emerald-500 ml-1">(Virtualized)</span>}
        </div>
      </div>

      {/* Table Wrapper with optional fixed height for virtualization */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-premium overflow-hidden">
        <div 
          ref={containerRef}
          onScroll={useVirtual ? handleScroll : undefined}
          className={`w-full overflow-x-auto no-scrollbar ${useVirtual ? 'max-h-[350px] overflow-y-auto' : ''}`}
        >
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider sticky top-0 z-10">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => requestSort(col.key)}
                    className="py-3 px-5 cursor-pointer hover:bg-slate-100/50 hover:text-slate-700 select-none transition-all"
                  >
                    <div className="flex items-center">
                      <span>{col.label}</span>
                      {getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {isLoading ? (
                // Skeleton Loader Rows
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={rIdx}>
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className="py-4 px-5">
                        <div className="h-4 bg-slate-100 rounded-md animate-pulse w-4/5"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : virtualItems.length === 0 ? (
                // Empty State Row
                <tr>
                  <td colSpan={columns.length} className="py-12 px-5 text-center text-slate-400">
                    <p className="font-extrabold text-sm text-slate-600">No records found</p>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Try adjusting your search filters or add a new record.</p>
                  </td>
                </tr>
              ) : (
                // Render with virtualization placeholders if useVirtual is true
                <>
                  {useVirtual && paddingTop > 0 && (
                    <tr style={{ height: `${paddingTop}px` }}><td colSpan={columns.length} className="p-0" /></tr>
                  )}
                  {virtualItems.map((item, index) => {
                    const actualIndex = startIndexVirtual + index;
                    return (
                      <tr key={item.id || actualIndex} className="hover:bg-slate-50/50 transition-colors" style={useVirtual ? { height: `${rowHeight}px` } : undefined}>
                        {columns.map((col) => (
                          <td key={col.key} className="py-3.5 px-5 text-slate-700 font-semibold">
                            {col.render ? col.render(item) : item[col.key]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {useVirtual && (totalHeight - paddingTop - (virtualItems.length * rowHeight)) > 0 && (
                    <tr style={{ height: `${totalHeight - paddingTop - (virtualItems.length * rowHeight)}px` }}><td colSpan={columns.length} className="p-0" /></tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls - Hidden when using Virtualization scroll */}
      {!isLoading && totalItems > 0 && !useVirtual && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1 font-semibold text-xs text-slate-500">
          <div>
            Showing <span className="text-slate-800 font-bold">{startIndex + 1}</span> to{' '}
            <span className="text-slate-800 font-bold">{endIndex}</span> of{' '}
            <span className="text-slate-800 font-bold">{totalItems}</span> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl border text-xs font-bold transition ${
                    currentPage === pageNum
                      ? 'bg-primary border-primary text-white shadow-md shadow-primary/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
