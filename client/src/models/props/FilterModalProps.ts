export interface FilterOptions {
  status: 'all' | 'active' | 'expired';
  sortBy: 'name' | 'points-asc' | 'points-desc' | 'event_id';
}

export interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}