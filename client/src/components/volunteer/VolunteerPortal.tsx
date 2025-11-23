import React, { useState } from "react";
import EventSelector from "./EventSelector";
import QRScanner from "./QRScanner";
import { useNavigate } from "react-router-dom";

const VolunteerPortal: React.FC = () => {
  const [eventToken, setEventToken] = useState("");
  const [eventName, setEventName] = useState("");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-2xl font-bold">
              <span className="text-cyan-400">SYNERGY</span>
              <span className="text-slate-400 ml-1 sm:ml-2">VOLUNTEER</span>
            </h1>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Participant Mode Toggle */}
              <button
                onClick={() => navigate('/participant')}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-200 group"
              >
                {/* <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 group-hover:text-cyan-300" /> */}
                <span className="text-xs sm:text-sm font-medium text-slate-300 group-hover:text-white">
                  Switch
                </span>
              </button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-bold">V</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-4 sm:py-8">
        {!eventToken ? (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                EVENT CHECK-IN SYSTEM
              </h2>
              <p className="text-slate-400 text-base sm:text-lg">
                Select an event to begin scanning attendee QR codes
              </p>
            </div>
            <EventSelector onAuthorized={(token, msg) => {
              setEventToken(token);
              setEventName(msg);
            }} />
          </div>
        ) : (
          <QRScanner eventToken={eventToken} eventName={eventName} />
        )}
      </div>
    </div>
  );
};

export default VolunteerPortal;
