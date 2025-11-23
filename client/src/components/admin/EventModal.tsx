import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Zap } from 'lucide-react';
import type { Event } from '../../models/Event';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: { event_name: string; points: number; secret_code:string;expired?: boolean }) => void;
  event?: Event;
}

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, event }) => {
  const [formData, setFormData] = useState({
    event_name: '',
    points: '',
    secret_code:"",
    expired: false
  });
  const [errors, setErrors] = useState({
    event_name: '',
    points: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (event) {
        setFormData({
          event_name: event.event_name,
          points: event.points.toString(),
          secret_code: event.secret_code,
          expired: event.expired
        });
      } else {
        setFormData({
          event_name: '',
          points: '',
          secret_code:"",
          expired: false
        });
      }
      setErrors({ event_name: '', points: '' });
    }
  }, [event, isOpen]);

  const validateForm = () => {
    const newErrors = { event_name: '', points: '' };
    
    if (!formData.event_name.trim()) {
      newErrors.event_name = 'Event name is required';
    }
    
    if (!formData.points.trim()) {
      newErrors.points = 'Points value is required';
    } else if (isNaN(parseInt(formData.points)) || parseInt(formData.points) < 0) {
      newErrors.points = 'Points must be a valid positive number';
    }
    
    setErrors(newErrors);
    return !newErrors.event_name && !newErrors.points;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const eventData: { event_name: string; points: number; expired?: boolean; secret_code: string } = {
        event_name: formData.event_name.trim(),
        points: parseInt(formData.points),
        secret_code: formData.secret_code
      };
      
      if (event) {
        eventData.expired = formData.expired;
      }
      
      onSave(eventData);
      onClose();
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (field in errors) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="cyber-modal max-w-lg w-full my-8 animate-scale-in">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <Zap className="text-cyan-400 flex-shrink-0" size={20} />
            <h2 className="text-lg md:text-2xl font-bold text-cyan-400 uppercase tracking-wider text-glow truncate">
              {event ? 'Modify Event' : 'Create Event'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-400 transition-all duration-300 hover:rotate-90 p-2 rounded-full hover:bg-red-500/10 flex-shrink-0"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs md:text-sm font-medium text-cyan-300 mb-2 uppercase tracking-wider">
              Event Name
            </label>
            <input
              type="text"
              value={formData.event_name}
              onChange={(e) => handleInputChange('event_name', e.target.value)}
              className={`cyber-input w-full ${errors.event_name ? 'border-red-500 focus:border-red-400' : ''}`}
              placeholder="Enter event name..."
              autoFocus
            />
            {errors.event_name && (
              <p className="text-red-400 text-xs mt-1 animate-slide-down">{errors.event_name}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs md:text-sm font-medium text-cyan-300 mb-2 uppercase tracking-wider">
              Points Reward
            </label>
            <input
              type="number"
              value={formData.points}
              onChange={(e) => handleInputChange('points', e.target.value)}
              className={`cyber-input w-full ${errors.points ? 'border-red-500 focus:border-red-400' : ''}`}
              placeholder="Enter points value..."
              min="0"
              step="1"
            />
            {errors.points && (
              <p className="text-red-400 text-xs mt-1 animate-slide-down">{errors.points}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs md:text-sm font-medium text-cyan-300 mb-2 uppercase tracking-wider">
              Secret Code
            </label>
            <input
              type="string"
              value={formData.secret_code}
              onChange={(e) => handleInputChange('secret_code', e.target.value)}
              className={`cyber-input w-full ${errors.points ? 'border-red-500 focus:border-red-400' : ''}`}
              placeholder="Enter secret code..."
              min="0"
              step="1"
            />
          </div>
          

          
          <div className="flex items-center space-x-3 p-4 bg-gray-800/30 rounded-lg border border-gray-600/30">
            <input
              type="checkbox"
              id="expired"
              checked={formData.expired}
              onChange={(e) => handleInputChange('expired', e.target.checked)}
              className="w-5 h-5 text-cyan-400 bg-gray-800 border-2 border-gray-600 rounded focus:ring-2 focus:ring-cyan-400 focus:ring-offset-0 transition-all duration-200"
            />
            <label htmlFor="expired" className="text-sm text-gray-300 uppercase tracking-wider cursor-pointer select-none">
              Mark as Expired Event
            </label>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cyber-button-secondary flex-1 py-3 px-4 text-sm uppercase tracking-wider hover:scale-105 transition-transform duration-200 min-w-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cyber-button-primary flex-1 py-3 px-4 text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-105 transition-transform duration-200 min-w-0"
            >
              {event ? <Save size={16} /> : <Plus size={16} />}
              <span className="truncate">{event ? 'Update Event' : 'Create Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;