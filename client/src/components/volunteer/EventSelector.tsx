import React, { useState, useEffect } from "react";
import { authorizeVolunteer } from "../../service/api";
import { useEvents } from "../../hooks/useEvents";
import { Lock, Calendar, Search, Eye, EyeOff, CheckCircle } from "lucide-react";

interface Props {
  onAuthorized: (eventToken: string, eventName: string) => void;
}

const EventSelector: React.FC<Props> = ({ onAuthorized }) => {
  const { events, fetchEvents } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter(e => 
    e.event_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedEventName = events.find(e => e.event_id === selectedEvent)?.event_name || "";

  const handleAuthorize = async () => {
    try {
      setLoading(true);
      setMsg("");
      const userToken = localStorage.getItem("session_token") || "";
      const res = await authorizeVolunteer(selectedEvent, secretCode, userToken) as any;
      localStorage.setItem("event_token", res.token);
      onAuthorized(res.token, res.message);
    } catch (err: any) {
      setMsg(err.response?.data?.detail || "Authorization failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl">
        {/* Event Selection with Search */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            Search & Select Event
          </label>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
            <input
              type="text"
              placeholder="Type to search events..."
              className="w-full pl-10 pr-10 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              value={selectedEvent ? selectedEventName : searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedEvent("");
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
            />
            
            {/* Selected Indicator */}
            {selectedEvent && (
              <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
            )}
            
            {/* Results Dropdown */}
            {showResults && searchQuery && (
              <div className="absolute z-20 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {filteredEvents.length > 0 ? (
                  <>
                    {filteredEvents.map((e) => (
                      <button
                        key={e.event_id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-b-0 text-white"
                        onClick={() => {
                          setSelectedEvent(e.event_id);
                          setSearchQuery("");
                          setShowResults(false);
                        }}
                      >
                        <div className="font-medium">{e.event_name}</div>
                        {/* <div className="text-xs text-slate-400 mt-1">ID: {e.event_id}</div> */}
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="px-4 py-6 text-center text-slate-400">
                    <p className="text-sm">No events found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Selected Event Display */}
          {selectedEvent && (
            <div className="mt-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="text-sm text-cyan-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Selected: {selectedEventName}
              </p>
            </div>
          )}
        </div>

        {/* Secret Code Input */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            Volunteer Access Code
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter secret code"
              className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedEvent && secretCode) {
                  handleAuthorize();
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <Eye className="w-5 h-5" />
              ) : (
                <EyeOff className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Authorize Button */}
        <button
          onClick={handleAuthorize}
          disabled={loading || !selectedEvent || !secretCode}
          className="w-full py-3 rounded-lg font-semibold text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-cyan-500/20"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Authorizing...
            </span>
          ) : (
            "Authorize & Continue"
          )}
        </button>

        {/* Error Message */}
        {msg && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{msg}</p>
          </div>
        )}

        {/* Helper Text */}
        <p className="mt-4 text-xs text-slate-500 text-center">
          Contact your event coordinator if you need the access code
        </p>
      </div>
    </div>
  );
};

export default EventSelector;