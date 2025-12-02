import { useState, useRef, useEffect } from "react";
import { User, LogOut, Users, Trophy, ChevronDown, Mail } from "lucide-react";
import type { Team } from "../../models/Team";
import { logout as apiLogout } from "../../service/api";

interface UserProfile {
  name: string;
  email: string;
  rollNumber: string;
  role: string;
}

interface ProfileDropdownProps {
  user: UserProfile;
  team?: Team | null;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user, team }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-pink-600/20 text-pink-400 border-pink-600/40";
      case "volunteer":
        return "bg-purple-600/20 text-purple-300 border-purple-600/40";
      default:
        return "bg-cyan-600/20 text-cyan-300 border-cyan-600/40";
    }
  };

  const getRoleLabel = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);

  const handleLogoutClick = async () => {
    try {
      setLoggingOut(true);
      await apiLogout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect even if API call fails
      window.location.href = '/';
    }
  };

return (
  <div className="relative font-orbitron" ref={dropdownRef} style={{ fontFamily: "'Orbitron', sans-serif" }}>
    {/* Profile Button */}
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="flex items-center justify-start gap-1 sm:gap-1.5 md:gap-2 px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg bg-[#2a0a46]/60 hover:bg-[#3a0a6b]/70 border border-purple-700 text-purple-200 transition-all duration-200"
      aria-label="Profile menu"
    >
      <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-600 flex items-center justify-center shrink-0">
        <span className="text-[10px] sm:text-xs md:text-sm font-bold text-white">
          {user.name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Hide Name + Role on mobile screens */}
      <div className="hidden md:block min-w-0 text-left">
        <div className="text-sm font-semibold text-purple-100 truncate">{user.name}</div>
        <div className="text-xs text-purple-400 truncate">{getRoleLabel(user.role)}</div>
      </div>

      <ChevronDown
        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>

    {/* Dropdown */}
    {isOpen && (
      <div className="absolute right-2 sm:right-0 mt-2 w-[85vw] xs:w-[75vw] sm:w-80 max-w-sm bg-[#1b052f]/95 border border-purple-800 rounded-lg sm:rounded-xl shadow-[0_0_20px_rgba(130,50,255,0.3)] overflow-hidden z-50 backdrop-blur-md">
        
        {/* User Info */}
        <div className="p-2.5 sm:p-3 md:p-4 bg-[#2b0a4a]/70 border-b border-purple-700">
          <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 mb-2 sm:mb-2.5 md:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shrink-0">
              <span className="text-sm sm:text-base md:text-lg font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-xs sm:text-sm md:text-base lg:text-lg truncate">{user.name}</div>
              <div className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium border ${getRoleBadgeColor(user.role)} mt-0.5 sm:mt-1`}>
                {getRoleLabel(user.role)}
              </div>
            </div>
          </div>

          <div className="text-[10px] sm:text-xs md:text-sm text-purple-300 flex items-start sm:items-center gap-1.5 sm:gap-2">
            <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
            <span className="break-all leading-tight">{user.email}</span>
          </div>
        </div>

        {/* Team */}
        {team ? (
          <div className="p-2.5 sm:p-3 md:p-4 border-b border-purple-700">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-cyan-400 shrink-0" />
              <span className="font-semibold text-white text-[11px] sm:text-xs md:text-sm lg:text-base">Your Team</span>
            </div>

            <div className="bg-[#25083f]/60 rounded-md sm:rounded-lg p-2 sm:p-2.5 md:p-3 space-y-1 sm:space-y-1.5 md:space-y-2 max-h-24 sm:max-h-28 md:max-h-32 lg:max-h-40 overflow-y-auto">
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-purple-100 truncate text-[11px] sm:text-xs md:text-sm lg:text-base">{team.team_name}</span>
                <span className="flex items-center gap-0.5 sm:gap-1 text-cyan-300 text-[10px] sm:text-xs md:text-sm shrink-0">
                  <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" /> {team.points}
                </span>
              </div>

              <div className="text-[9px] sm:text-[10px] md:text-xs text-purple-400">{team.members.length} member{team.members.length !== 1 ? 's' : ''}</div>

              {team.members.map((member, idx) => (
                <div key={idx} className="flex items-center gap-1 sm:gap-1.5 md:gap-2 text-[9px] sm:text-[10px] md:text-xs text-purple-300 py-0.5">
                  <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 md:w-1.5 md:h-1.5 rounded-full bg-cyan-400 shrink-0"></div>
                  <span className="truncate flex-1">{member.name}</span>
                  {member.email === user.email && <span className="text-cyan-400 font-medium shrink-0 text-[9px] sm:text-[10px] md:text-xs">(You)</span>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-2.5 sm:p-3 md:p-4 border-b border-purple-700 text-purple-400 text-[10px] sm:text-xs md:text-sm flex items-center gap-1.5 sm:gap-2">
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" /> Not in a team
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogoutClick}
          disabled={loggingOut}
          className="w-full p-2.5 sm:p-3 md:p-4 flex items-center gap-2 sm:gap-2.5 md:gap-3 text-pink-400 hover:bg-pink-600/10 transition-colors duration-200 disabled:opacity-50 text-[11px] sm:text-xs md:text-sm lg:text-base"
        >
          <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          <span className="font-medium">{loggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    )}
  </div>
);
}
export default ProfileDropdown;
