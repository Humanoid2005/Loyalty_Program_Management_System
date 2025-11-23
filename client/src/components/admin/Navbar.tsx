import React, { useState } from 'react';
import { Users, Plus, Calendar, LogOut, UserCheck, ClipboardCheck, Menu, X, User, Mail, Hash, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {EVENT_NAME} from "../../config/config";

interface User {
  name: string;
  email: string;
  rollNumber: string;
  role: string;
}

interface NavbarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  user: User;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange, user, onLogout }) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'add-volunteer', label: 'Add Volunteer', icon: Users },
    { id: 'view-volunteers', label: 'View Volunteers', icon: UserCheck },
    { id: 'add-event', label: 'Add Event', icon: Plus },
    { id: 'view-events', label: 'View Events', icon: Calendar }
  ];

  const handleMarkAttendance = () => {
    navigate('/volunteer');
    setIsMobileMenuOpen(false);
  };

  const handleLeaderboard = () => {
    navigate('/leaderboard');
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (viewId: string) => {
    onViewChange(viewId);
    setIsMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    onLogout();
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-cyan-400/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="text-lg md:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              {EVENT_NAME.toUpperCase()} ADMIN
            </div>
          </div>
          
          {/* Unified Compact Menu - User Info + Hamburger */}
          <div className="flex items-center gap-3">
            {/* User Display - Only shows on medium screens and up */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              <div className="w-8 h-8 bg-cyan-400/20 rounded-full flex items-center justify-center">
                <User size={16} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium truncate max-w-32 lg:max-w-48">
                  {user.email}
                </p>
                <p className="text-cyan-400 text-xs uppercase tracking-wider">{user.role}</p>
              </div>
            </div>
            
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="cyber-nav-button p-2 rounded-md text-gray-300 hover:text-cyan-400"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Compact Menu Popup - Shows for all screen sizes */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-b border-cyan-400/30 shadow-lg z-40 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="px-4 py-2 space-y-1">
              {/* Navigation Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`cyber-nav-button px-4 py-3 rounded-md text-sm font-medium uppercase tracking-wider flex items-center gap-3 ${
                        currentView === item.id
                          ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/50'
                          : 'text-gray-300 hover:text-cyan-400'
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              
              {/* Navigation Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <button
                  onClick={handleMarkAttendance}
                  className="cyber-nav-button px-4 py-3 rounded-md text-sm font-medium uppercase tracking-wider flex items-center gap-3 text-gray-300 hover:text-cyan-400"
                >
                  <ClipboardCheck size={18} />
                  Mark Attendance
                </button>
                
                <button
                  onClick={handleLeaderboard}
                  className="cyber-nav-button px-4 py-3 rounded-md text-sm font-medium uppercase tracking-wider flex items-center gap-3 text-gray-300 hover:text-cyan-400"
                >
                  <Trophy size={18} />
                  Leaderboard
                </button>
              </div>
              
              {/* User Details & Logout Section */}
              <div className="border-t border-gray-700/50 mt-3 pt-3">
                <div className="px-4 py-3 bg-gray-800/50 rounded-md mb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-cyan-400/20 rounded-full flex items-center justify-center">
                      <User size={20} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{user.name}</p>
                      <p className="text-cyan-400 text-xs uppercase tracking-wider">{user.role}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-gray-400" />
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white break-all">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash size={12} className="text-gray-400" />
                      <span className="text-gray-400">Roll Number:</span>
                      <span className="text-white">{user.rollNumber}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleLogoutClick}
                  className="w-full bg-red-600/80 hover:bg-red-500 border border-red-500/50 hover:border-red-400 px-4 py-3 rounded-md text-sm font-medium uppercase tracking-wider flex items-center justify-center gap-3 text-white hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-red-500/30"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;