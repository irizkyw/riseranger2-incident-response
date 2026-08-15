import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100]
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border bg-card/60">
      {/* Information & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          Showing <span className="font-semibold text-foreground font-mono">{startItem}</span> to{' '}
          <span className="font-semibold text-foreground font-mono">{endItem}</span> of{' '}
          <span className="font-semibold text-foreground font-mono">{totalItems}</span> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-3">
            <span className="text-[11px] uppercase tracking-wider">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 px-2 rounded bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-xs disabled:opacity-30"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="First Page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-xs disabled:opacity-30"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Previous Page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-xs text-muted-foreground">
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <Button
                key={pageNum}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={`h-8 min-w-[32px] px-2 text-xs font-mono font-medium ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-xs disabled:opacity-30"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Next Page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-xs disabled:opacity-30"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Last Page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
