import { useState, useCallback } from 'react';

interface UseBulkSelectionReturn<T> {
  selectedItems: Set<T>;
  isSelected: (id: T) => boolean;
  toggleSelection: (id: T) => void;
  selectAll: (ids: T[]) => void;
  clearSelection: () => void;
  selectedCount: number;
  hasSelection: boolean;
}

/**
 * Custom hook for managing bulk selection of items
 * @returns Selection state and controls
 */
export function useBulkSelection<T = string>(): UseBulkSelectionReturn<T> {
  const [selectedItems, setSelectedItems] = useState<Set<T>>(new Set());

  const isSelected = useCallback(
    (id: T) => selectedItems.has(id),
    [selectedItems]
  );

  const toggleSelection = useCallback((id: T) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((ids: T[]) => {
    setSelectedItems(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  return {
    selectedItems,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    selectedCount: selectedItems.size,
    hasSelection: selectedItems.size > 0,
  };
}
