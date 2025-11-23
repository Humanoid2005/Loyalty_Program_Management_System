import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, LogOut, Users, Trophy, Check, Hash } from "lucide-react";
import { useTeams } from "../../hooks/useTeams";
import type { Team } from "../../models/Team";

interface TeamDashboardProps {
  team: Team;
  onTeamLeft: () => void;
}

const TeamDashboard: React.FC<TeamDashboardProps> = ({ team, onTeamLeft }) => {
  const { leaveTeam, loading } = useTeams();
  const [copied, setCopied] = useState<"qr" | "code" | null>(null);

  const handleCopy = (text: string, type: "qr" | "code") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleLeaveTeam = async () => {
    if (!confirm("Are you sure you want to leave this team?")) return;

    try {
      await leaveTeam(team.team_id);
      onTeamLeft();
    } catch (err) {
      console.error("Leave team error:", err);
      alert(err instanceof Error ? err.message : "Failed to leave team");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 font-['Orbitron'] space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]">
            {team.team_name}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base tracking-wide">
            Team Dashboard
          </p>
        </div>
        <button
          onClick={handleLeaveTeam}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-pink-500/60 text-pink-400 hover:bg-pink-500/10 rounded-lg transition-all duration-300 disabled:opacity-50 text-sm sm:text-base"
        >
          <LogOut className="w-4 h-4" />
          <span>{loading ? "Leaving..." : "Leave Team"}</span>
        </button>
      </div>

      {/* Invite Section */}
      {team.members.length < 3 && (
        <div className="bg-slate-900/60 border border-purple-500/30 rounded-xl p-5 sm:p-6 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 text-center md:text-left">
              <div className="flex justify-center md:justify-start items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="text-xl font-bold text-white">Invite Members</h3>
              </div>
              <p className="text-slate-400 text-sm mb-3">
                {3 - team.members.length} slot
                {3 - team.members.length > 1 ? "s" : ""} available.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 px-4 py-3 bg-slate-800/60 border border-purple-500/30 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">Join Code</div>
                  <div className="font-mono text-xl sm:text-2xl text-purple-300 font-bold tracking-widest break-all">
                    {team.join_code || "N/A"}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(team.join_code || "", "code")}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600/80 hover:bg-purple-700 rounded-lg font-semibold text-sm transition-all duration-200 w-full sm:w-auto"
                >
                  {copied === "code" ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* QR Section */}
        <div className="bg-slate-900/50 border border-cyan-500/30 rounded-xl p-6 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
          <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center justify-center sm:justify-start gap-2 text-cyan-300">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Hash className="w-5 h-5" />
            </div>
            Team QR Code
          </h3>
          <div className="flex flex-col items-center">
            <div className="bg-white p-3 sm:p-4 rounded-xl mb-4">
              <QRCodeSVG value={team.qr_id || team.team_id} size={120} className="sm:size-[150px]" />
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mb-3 text-center">
              Show this QR at event counters
            </p>
            <button
              onClick={() => handleCopy(team.qr_id || team.team_id, "qr")}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-lg transition-all duration-200 text-sm"
            >
              {copied === "qr" ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy QR ID</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Points Section */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-cyan-500/30 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 text-center sm:text-left">
              <h3 className="text-lg sm:text-xl font-bold flex items-center justify-center sm:justify-start gap-2 text-yellow-300 mb-2 sm:mb-0">
                <Trophy className="w-5 h-5" />
                Team Points
              </h3>
              <div className="text-3xl font-extrabold text-cyan-400">{team.points}</div>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm">
              Events participated: {team.events_participated.length}
            </p>
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-6 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
        <h3 className="text-lg sm:text-xl font-bold mb-4 text-purple-300 flex items-center gap-2 justify-center sm:justify-start">
          <Users className="w-5 h-5" />
          Team Members ({team.members.length}/3)
        </h3>
        <div className="space-y-3">
          {team.members.map((member, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/40 flex-wrap"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="font-semibold text-white truncate">{member.name}</div>
              </div>
              {index === 0 && (
                <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded">
                  Leader
                </span>
              )}
            </div>
          ))}
          {team.members.length < 3 && (
            <div className="p-4 bg-slate-800/20 rounded-lg border border-dashed border-slate-700 text-center text-slate-500 text-sm">
              {3 - team.members.length} slot
              {3 - team.members.length > 1 ? "s" : ""} available
            </div>
          )}
        </div>
      </div>

      {/* Events Section */}
      {team.events_participated.length > 0 && (
        <div className="bg-slate-900/50 border border-cyan-500/30 rounded-xl p-6 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
          <h3 className="text-lg sm:text-xl font-bold mb-4 text-cyan-300 text-center sm:text-left">
            Events Participated
          </h3>
          <div className="space-y-2">
            {team.events_participated.map((event: any, index: number) => (
              <div
                key={index}
                className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/40 text-slate-300 text-sm text-center sm:text-left"
              >
                {typeof event === "string"
                  ? event
                  : event.event || "Unknown Event"}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDashboard;
