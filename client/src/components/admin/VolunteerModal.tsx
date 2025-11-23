import React, { useState, useEffect } from 'react';
import { X, UserPlus, Users } from 'lucide-react';

interface VolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (volunteer: { rollNumber: string; name: string; email: string; }) => void;
}

const VolunteerModal: React.FC<VolunteerModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    rollNumber: '',
    name: '',
    email: ''
  });
  const [errors, setErrors] = useState({
    rollNumber: '',
    name: '',
    email: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({ rollNumber: '', name: '', email: '' });
      setErrors({ rollNumber: '', name: '', email: '' });
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = { rollNumber: '', name: '', email: '' };
    
    if (!formData.rollNumber.trim()) {
      newErrors.rollNumber = 'Roll number is required';
    } else if (!/^[A-Za-z0-9]+$/.test(formData.rollNumber.trim())) {
      newErrors.rollNumber = 'Roll number should contain only letters and numbers';
    } else if (formData.rollNumber.trim().length < 3) {
      newErrors.rollNumber = 'Roll number must be at least 3 characters';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return !newErrors.rollNumber && !newErrors.name && !newErrors.email;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave({
        rollNumber: formData.rollNumber.trim().toUpperCase(),
        name: formData.name.trim(),
        email: formData.email.trim()
      });
      setFormData({ rollNumber: '', name: '', email: '' });
      onClose();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="cyber-modal max-w-lg w-full my-8 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="text-cyan-400" size={24} />
            <h2 className="text-xl md:text-2xl font-bold text-cyan-400 uppercase tracking-wider text-glow">
              Add Volunteer
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
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs md:text-sm font-medium text-cyan-300 mb-2 uppercase tracking-wider">
              <Users size={16} />
              Roll Number
            </label>
            <input
              type="text"
              value={formData.rollNumber}
              onChange={(e) => handleInputChange('rollNumber', e.target.value)}
              className={`cyber-input w-full ${errors.rollNumber ? 'border-red-500 focus:border-red-400' : ''}`}
              placeholder="Enter student roll number..."
              autoFocus
              maxLength={20}
            />
            {errors.rollNumber && (
              <p className="text-red-400 text-xs mt-1 animate-slide-down">{errors.rollNumber}</p>
            )}
            <p className="text-gray-400 text-xs mt-1">
              Roll number will be automatically converted to uppercase
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs md:text-sm font-medium text-cyan-300 mb-2 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`cyber-input w-full ${errors.name ? 'border-red-500 focus:border-red-400' : ''}`}
              placeholder="Enter volunteer's full name..."
              maxLength={100}
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1 animate-slide-down">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs md:text-sm font-medium text-cyan-300 mb-2 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`cyber-input w-full ${errors.email ? 'border-red-500 focus:border-red-400' : ''}`}
              placeholder="Enter volunteer's email address..."
              maxLength={100}
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1 animate-slide-down">{errors.email}</p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cyber-button-secondary flex-1 py-3 px-6 text-sm uppercase tracking-wider hover:scale-105 transition-transform duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cyber-button-primary flex-1 py-3 px-6 text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-105 transition-transform duration-200"
            >
              <UserPlus size={18} />
              Add Volunteer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VolunteerModal;