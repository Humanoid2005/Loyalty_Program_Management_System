import React, { useState } from 'react';
import { X, Filter, TrendingUp, TrendingDown, Clock, CheckCircle } from 'lucide-react';

export interface FilterOptions {
  status: 'all' | 'active' | 'expired';
  sortBy: 'name' | 'points-asc' | 'points-desc' | 'event_id';
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApplyFilter, currentFilters }) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  const handleApply = () => {
    onApplyFilter(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      status: 'all',
      sortBy: 'event_id'
    };
    setFilters(resetFilters);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="cyber-modal max-w-lg w-full my-8 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Filter className="text-cyan-400" size={24} />
            <h2 className="text-xl md:text-2xl font-bold text-cyan-400 uppercase tracking-wider text-glow">
              Filter Events
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-400 transition-all duration-300 hover:rotate-90 p-2 rounded-full hover:bg-red-500/10"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Status Filter */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} />
              Event Status
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <label className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/30 hover:border-cyan-400/50 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="all"
                  checked={filters.status === 'all'}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as FilterOptions['status'] })}
                  className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 focus:ring-2 focus:ring-cyan-400"
                />
                <span className="text-gray-300 text-sm uppercase tracking-wider">All Events</span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/30 hover:border-cyan-400/50 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={filters.status === 'active'}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as FilterOptions['status'] })}
                  className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 focus:ring-2 focus:ring-cyan-400"
                />
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-gray-300 text-sm uppercase tracking-wider">Active Only</span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/30 hover:border-cyan-400/50 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="expired"
                  checked={filters.status === 'expired'}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as FilterOptions['status'] })}
                  className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 focus:ring-2 focus:ring-cyan-400"
                />
                <X size={16} className="text-red-400" />
                <span className="text-gray-300 text-sm uppercase tracking-wider">Expired Only</span>
              </label>
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} />
              Sort By
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <label className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/30 hover:border-cyan-400/50 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value="event_id"
                  checked={filters.sortBy === 'event_id'}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterOptions['sortBy'] })}
                  className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 focus:ring-2 focus:ring-cyan-400"
                />
                <span className="text-gray-300 text-sm uppercase tracking-wider">Event ID</span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/30 hover:border-cyan-400/50 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value="name"
                  checked={filters.sortBy === 'name'}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterOptions['sortBy'] })}
                  className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 focus:ring-2 focus:ring-cyan-400"
                />
                <span className="text-gray-300 text-sm uppercase tracking-wider">Event Name</span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/30 hover:border-cyan-400/50 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value="points-desc"
                  checked={filters.sortBy === 'points-desc'}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterOptions['sortBy'] })}
                  className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 focus:ring-2 focus:ring-cyan-400"
                />
                <TrendingUp size={16} className="text-orange-400" />
                <span className="text-gray-300 text-sm uppercase tracking-wider">Points (High to Low)</span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/30 hover:border-cyan-400/50 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value="points-asc"
                  checked={filters.sortBy === 'points-asc'}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterOptions['sortBy'] })}
                  className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 focus:ring-2 focus:ring-cyan-400"
                />
                <TrendingDown size={16} className="text-orange-400" />
                <span className="text-gray-300 text-sm uppercase tracking-wider">Points (Low to High)</span>
              </label>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="cyber-button-secondary flex-1 py-3 px-6 text-sm uppercase tracking-wider hover:scale-105 transition-transform duration-200"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cyber-button-secondary flex-1 py-3 px-6 text-sm uppercase tracking-wider hover:scale-105 transition-transform duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="cyber-button-primary flex-1 py-3 px-6 text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-105 transition-transform duration-200"
            >
              <Filter size={18} />
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;