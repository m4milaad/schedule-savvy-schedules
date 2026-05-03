/**
 * Pagination hook for managing paginated data
 * Provides state and controls for server-side pagination
 */

import { useState, useCallback, useMemo } from "react";

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationControls {
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setPageSize: (size: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  range: { from: number; to: number };
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems: number;
}

export interface UsePaginationReturn extends PaginationState, PaginationControls {}

/**
 * Hook for managing pagination state and controls
 * 
 * @example
 * const pagination = usePagination({ totalItems: 100, initialPageSize: 20 });
 * 
 * // Use in query
 * const { data } = useQuery({
 *   queryKey: ['items', pagination.currentPage],
 *   queryFn: () => fetchItems(pagination.range.from, pagination.range.to)
 * });
 * 
 * // Use controls in UI
 * <Button onClick={pagination.goToPreviousPage} disabled={!pagination.canGoPrevious}>
 *   Previous
 * </Button>
 */
export function usePagination({
  initialPage = 1,
  initialPageSize = 20,
  totalItems,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize]);

  // Calculate range for Supabase .range(from, to)
  const range = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;
    return { from, to };
  }, [currentPage, pageSize]);

  // Navigation controls
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  const goToNextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const goToPreviousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const goToFirstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const goToLastPage = useCallback(() => {
    goToPage(totalPages);
  }, [totalPages, goToPage]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  // Can navigate flags
  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;

  return {
    // State
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    // Controls
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setPageSize: handleSetPageSize,
    canGoNext,
    canGoPrevious,
    range,
  };
}

/**
 * Get pagination info text (e.g., "Showing 1-20 of 100")
 */
export function getPaginationInfo(pagination: PaginationState): string {
  const { currentPage, pageSize, totalItems } = pagination;
  
  if (totalItems === 0) {
    return "No items";
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return `Showing ${start}-${end} of ${totalItems}`;
}
