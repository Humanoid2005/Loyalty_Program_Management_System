import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Users, TrendingUp, AlertCircle, X } from 'lucide-react';
import Navbar from './Navbar';
import EventCard from './EventCard';
import EventModal from './EventModal';
import VolunteerModal from './VolunteerModal';
import FilterModal, { FilterOptions } from './FilterModal';
import { useEvents } from '../../hooks/useEvents';
import { useVolunteers } from '../../hooks/useVolunteers';
import type { Event } from '../../models/Event';

interface User {
  name: string;
  email: string;
  rollNumber: string;
  role: string;
}

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState('view-events');
  const [searchTerm, setSearchTerm] = useState('');
  const [volunteerSearchTerm, setVolunteerSearchTerm] = useState('');
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [volunteerModalOpen, setVolunteerModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | undefined>();
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    sortBy: 'event_id'
  });

  const {
    events,
    loading: eventsLoading,
    error: eventsError,
    fetchEvents,
    createNewEvent,
    updateExistingEvent,
    deleteExistingEvent
  } = useEvents();

  const {
    volunteers,
    loading: volunteersLoading,
    error: volunteersError,
    fetchVolunteers,
    addNewVolunteer,
    removeExistingVolunteer
  } = useVolunteers();

  const loading = eventsLoading || volunteersLoading;
  const error = eventsError || volunteersError;

  // Load data on component mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (currentView === 'view-volunteers') {
      fetchVolunteers();
    }
  }, [currentView, fetchVolunteers]);

  const filteredEvents = events
    .filter(event => {
      // Apply search filter
      const matchesSearch = event.event_name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      
      // Apply status filter
      if (filters.status === 'active' && event.expired) return false;
      if (filters.status === 'expired' && !event.expired) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Apply sorting
      switch (filters.sortBy) {
        case 'name':
          return a.event_name.localeCompare(b.event_name);
        case 'points-asc':
          return a.points - b.points;
        case 'points-desc':
          return b.points - a.points;
        case 'event_id':
        default:
          return a.event_id.localeCompare(b.event_id);
      }
    });

  const filteredVolunteers = volunteers
    .filter(volunteer => {
      if (!volunteerSearchTerm) return true;
      
      const searchLower = volunteerSearchTerm.toLowerCase();
      return (
        volunteer.name.toLowerCase().includes(searchLower) ||
        volunteer.email.toLowerCase().includes(searchLower) ||
        volunteer.rollNumber.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    if (view === 'add-event') {
      setEditingEvent(undefined);
      setEventModalOpen(true);
    } else if (view === 'add-volunteer') {
      setVolunteerModalOpen(true);
    }
    // view-volunteers and view-events just change the current view
  };

  const handleCloseEventModal = () => {
    setEventModalOpen(false);
    setEditingEvent(undefined);
    setCurrentView('view-events');
  };

  const handleCloseVolunteerModal = () => {
    setVolunteerModalOpen(false);
    setCurrentView('view-events');
  };

  const handleApplyFilter = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleSaveEvent = async (eventData: { event_name: string; points: number; expired?: boolean; secret_code?: string }) => {
    if (editingEvent) {
      await updateExistingEvent(editingEvent.event_id, eventData);
    } else {
      const { event_name, points, secret_code } = eventData;
      await createNewEvent({ event_name, points, secret_code });
    }
    setEventModalOpen(false);
    setEditingEvent(undefined);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    await deleteExistingEvent(eventId);
  };

  const handleSaveVolunteer = async (volunteerData: { rollNumber: string; name: string; email: string }) => {
    await addNewVolunteer(volunteerData);
    setVolunteerModalOpen(false);
  };

  const handleRemoveVolunteer = async (rollNumber: string) => {
    if (!confirm(`Are you sure you want to remove volunteer ${rollNumber}?`)) return;
    await removeExistingVolunteer(rollNumber);
  };

  const stats = {
    totalEvents: events.length,
    activeEvents: events.filter(e => !e.expired).length,
    totalPoints: events.reduce((sum, e) => sum + e.points, 0),
    expiredEvents: events.filter(e => e.expired).length
  };

  return (
    <div className="min-h-screen bg-gray-900 cyber-background">
      <Navbar 
        currentView={currentView} 
        onViewChange={handleViewChange} 
        user={user}
        onLogout={onLogout}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="cyber-stat-card hover:scale-105 transition-all duration-300 animate-pulse-border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-cyan-400 uppercase tracking-wider mb-1">Total Events</p>
                <p className="text-2xl md:text-3xl font-bold text-white text-glow">{stats.totalEvents}</p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <Calendar className="text-cyan-400 animate-pulse" size={28} />
              </div>
            </div>
          </div>
          
          <div className="cyber-stat-card hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-green-400 uppercase tracking-wider mb-1">Active Events</p>
                <p className="text-2xl md:text-3xl font-bold text-white">{stats.activeEvents}</p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <TrendingUp className="text-green-400" size={28} />
              </div>
            </div>
          </div>
          
          <div className="cyber-stat-card hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-orange-400 uppercase tracking-wider mb-1">Total Points</p>
                <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalPoints.toLocaleString()}</p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <Users className="text-orange-400" size={28} />
              </div>
            </div>
          </div>
          
          <div className="cyber-stat-card hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-red-400 uppercase tracking-wider mb-1">Expired</p>
                <p className="text-2xl md:text-3xl font-bold text-white">{stats.expiredEvents}</p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <AlertCircle className="text-red-400" size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Volunteers Section */}
        {currentView === 'view-volunteers' && (
          <>
            <div className="cyber-section-header mb-8">
              <h1 className="text-2xl md:text-4xl font-bold text-cyan-400 uppercase tracking-wider mb-2">
                Volunteer Management
              </h1>
              <p className="text-gray-400">Manage registered volunteers by roll number</p>
            </div>

            {/* Volunteer Search */}
            {volunteers.length > 0 && (
              <div className="mb-8">
                <div className="flex-1 relative group">
                  <div className="flex items-center gap-3 cyber-input w-full text-base p-0">
                    <Search className="text-cyan-400 group-hover:text-cyan-300 transition-colors ml-4" size={20} />
                    <input
                      type="text"
                      placeholder="Search volunteers by name, email, or roll number..."
                      value={volunteerSearchTerm}
                      onChange={(e) => setVolunteerSearchTerm(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 py-3 pr-4"
                    />
                    {volunteerSearchTerm && (
                      <button
                        onClick={() => setVolunteerSearchTerm('')}
                        className="text-gray-400 hover:text-red-400 transition-colors mr-4"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {volunteers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredVolunteers.map((volunteer, index) => (
                  <div key={index} className="cyber-card p-4 md:p-6 cyber-card-active">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Users size={20} className="text-cyan-400" />
                        <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                          VOLUNTEER
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                          ACTIVE
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2 uppercase tracking-wide">
                      {volunteer.rollNumber}
                    </h3>
                    
                    <p className="text-sm text-gray-300 mb-1">{volunteer.name}</p>
                    <p className="text-xs text-gray-400 mb-4">{volunteer.email}</p>
                    
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleRemoveVolunteer(volunteer.rollNumber)}
                        className="cyber-button-danger py-2 px-4 text-xs md:text-sm uppercase tracking-wider flex items-center justify-center gap-2 w-full"
                        disabled={loading}
                      >
                        <X size={14} />
                        Remove Volunteer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : volunteers.length > 0 && filteredVolunteers.length === 0 ? (
              <div className="text-center py-12">
                <Search className="mx-auto text-gray-500 mb-4" size={48} />
                <p className="text-gray-400 text-lg mb-4">No volunteers found matching your search.</p>
                <p className="text-gray-500 text-sm mb-4">Try searching by name, email, or roll number.</p>
                <button
                  onClick={() => setVolunteerSearchTerm('')}
                  className="cyber-button-secondary px-6 py-3 text-sm uppercase tracking-wider flex items-center gap-2 mx-auto"
                >
                  <X size={16} />
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-500 mb-4" size={48} />
                <p className="text-gray-400 text-lg mb-4">No volunteers registered yet.</p>
                <button
                  onClick={() => handleViewChange('add-volunteer')}
                  className="cyber-button-primary px-6 py-3 text-sm uppercase tracking-wider flex items-center gap-2 mx-auto"
                >
                  <Users size={16} />
                  Add First Volunteer
                </button>
              </div>
            )}
          </>
        )}

        {/* Events Section */}
        {currentView === 'view-events' && (
          <>
            <div className="cyber-section-header mb-8">
              <h1 className="text-2xl md:text-4xl font-bold text-cyan-400 uppercase tracking-wider mb-2">
                Event Management System
              </h1>
              <p className="text-gray-400">Manage loyalty program events and their point values</p>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex-1 relative group">
                <div className="flex items-center gap-3 cyber-input w-full text-base p-0">
                  <Search className="text-cyan-400 group-hover:text-cyan-300 transition-colors ml-4" size={20} />
                  <input
                    type="text"
                    placeholder="Search events database..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 py-3 pr-4"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-gray-400 hover:text-red-400 transition-colors mr-4"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setFilterModalOpen(true)}
                className="cyber-button-secondary px-6 py-3 flex items-center gap-2 uppercase tracking-wider whitespace-nowrap hover:scale-105 transition-transform"
              >
                <Filter size={18} />
                <span className="hidden sm:inline">Advanced Filter</span>
                <span className="sm:hidden">Filter</span>
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                <p className="text-gray-400 mt-2">Loading...</p>
              </div>
            )}

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.event_id}
                  event={event}
                  onEdit={handleEditEvent}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>

            {filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto text-gray-500 mb-4" size={48} />
                <p className="text-gray-400 text-lg">No events found matching your search.</p>
              </div>
            )}
          </>
        )}

      </div>

      {/* Modals */}
      <EventModal
        isOpen={eventModalOpen}
        onClose={handleCloseEventModal}
        onSave={handleSaveEvent}
        event={editingEvent}
      />
      
      <VolunteerModal
        isOpen={volunteerModalOpen}
        onClose={handleCloseVolunteerModal}
        onSave={handleSaveVolunteer}
      />
      
      <FilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApplyFilter={handleApplyFilter}
        currentFilters={filters}
      />
    </div>
  );
};

export default AdminDashboard;