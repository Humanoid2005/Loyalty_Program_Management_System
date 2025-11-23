import React from 'react';
import { Calendar, Star, AlertTriangle, Edit, Trash2, Users, Eye, EyeOff } from 'lucide-react';
import type { Event } from '../../models/Event';

interface EventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onEdit, onDelete }) => {
  const [showSecret, setShowSecret] = React.useState(false);
  
  return (
    <div className={`cyber-card p-4 md:p-6 ${event.expired ? 'cyber-card-expired' : 'cyber-card-active'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-cyan-400" />
          <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
            EVENT #{event.event_name}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {event.expired && <AlertTriangle size={16} className="text-orange-500" />}
          <span className={`text-xs px-2 py-1 rounded ${
            event.expired 
              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
              : 'bg-green-500/20 text-green-400 border border-green-500/30'
          }`}>
            {event.expired ? 'EXPIRED' : 'ACTIVE'}
          </span>
        </div>
      </div>
      
      <h3 className="text-lg md:text-xl font-bold text-white mb-3 uppercase tracking-wide break-words">
        {event.event_name}
      </h3>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-orange-500" />
          <span className="text-lg font-semibold text-orange-400">
            {event.points} POINTS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={16} className="text-purple-400" />
          <span className="text-sm font-medium text-purple-300">
            {event.participants}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Secret Code</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-sm md:text-lg px-3 py-2 rounded-md bg-slate-900/30 text-white break-all select-all">
            {showSecret ? event.secret_code : '•'.repeat(Math.max(4, event.secret_code.length))}
          </div>
          <button
            type="button"
            onClick={() => setShowSecret((s:boolean)=> !s)}
            aria-label={showSecret ? 'Hide secret code' : 'Show secret code'}
            className="cyber-button-secondary p-2 rounded-md flex items-center justify-center"
          >
            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => onEdit(event)}
          className="cyber-button-secondary flex-1 py-2 text-xs md:text-sm uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <Edit size={14} />
          Edit
        </button>
        <button
          onClick={() => onDelete(event.event_id)}
          className="cyber-button-danger py-2 px-4 text-xs md:text-sm uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
};

export default EventCard;
