import { useEffect } from 'react';
import { Trophy, Zap, Crown, RefreshCw, Award, Medal, ArrowLeft } from 'lucide-react';
import { useLeaderboard } from '../../hooks/useLeaderboard';

// Leaderboard-specific type that matches what the API returns
type LeaderboardTeam = {
  _id: string;
  name: string;
  points: number;
};

const LeaderboardPage = () => {
  const { leaderboard, loading, error, fetchFullLeaderboard } = useLeaderboard();
  const teams = leaderboard as unknown as LeaderboardTeam[];

  // Initial data fetch
  useEffect(() => {
    fetchFullLeaderboard();
  }, [fetchFullLeaderboard]);

  // Debug: Log the data
  useEffect(() => {
    console.log('Leaderboard data:', { leaderboard, teams, loading, error });
  }, [leaderboard, teams, loading, error]);

  // Helper functions for styling
  const getCardStyle = (rank: number) => {
    switch (rank) {
      case 1: 
        return {
          border: "border-yellow-400",
          bg: "bg-gradient-to-br from-yellow-400/20 via-yellow-500/10 to-amber-600/20",
          shadow: "shadow-2xl shadow-yellow-400/50",
          text: "text-yellow-400",
          glow: "drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]"
        };
      case 2:
        return {
          border: "border-gray-300",
          bg: "bg-gradient-to-br from-gray-300/20 via-gray-400/10 to-gray-500/20",
          shadow: "shadow-xl shadow-gray-300/40",
          text: "text-gray-300",
          glow: "drop-shadow-[0_0_10px_rgba(209,213,219,0.6)]"
        };
      case 3:
        return {
          border: "border-amber-600",
          bg: "bg-gradient-to-br from-amber-600/20 via-orange-600/10 to-amber-700/20",
          shadow: "shadow-xl shadow-amber-600/40",
          text: "text-amber-600",
          glow: "drop-shadow-[0_0_10px_rgba(217,119,6,0.6)]"
        };
      default:
        return {
          border: "border-cyan-500/30",
          bg: "bg-gray-900/60",
          shadow: "shadow-lg shadow-cyan-500/20",
          text: "text-cyan-400",
          glow: ""
        };
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1: return (
        <div className="relative">
          <Crown className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-pulse" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
        </div>
      );
      case 2: return <Medal className="w-9 h-9 text-gray-300 drop-shadow-[0_0_10px_rgba(209,213,219,0.6)]" />;
      case 3: return <Award className="w-9 h-9 text-amber-600 drop-shadow-[0_0_10px_rgba(217,119,6,0.6)]" />;
      default: return null;
    }
  };

  const getRankLabel = (rank: number) => {
    switch (rank) {
      case 1: return "🏆 CHAMPION";
      case 2: return "🥈 RUNNER-UP";
      case 3: return "🥉 3RD PLACE";
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin" />
          <div className="text-cyan-400 text-2xl font-bold animate-pulse">Loading Leaderboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400 text-2xl font-bold">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20"></div>
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header section with Back button and Refresh button */}
        <div className="text-center mb-8 sm:mb-16 relative">
          {/* Back Button - Top Left */}
          <a
            href="/"
            className="absolute left-0 sm:left-4 top-0 sm:top-4 flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs sm:text-base font-bold transition-all shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Back</span>
          </a>

          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-3 sm:mb-4 pt-12 sm:pt-0">
            <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-cyan-400 animate-bounce" />
            <h1 className="text-3xl sm:text-6xl md:text-7xl font-black bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              LEADERBOARD
            </h1>
            <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-pink-400 animate-bounce delay-100" />
          </div>
          <p className="text-xs sm:text-xl text-cyan-300 font-mono tracking-wider sm:tracking-widest mb-2">
            IIITB LOYALTY PROGRAM • LIVE RANKINGS
          </p>
          <div className="flex items-center justify-center gap-2 text-purple-400">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-semibold tracking-wide">{teams.length > 0 ? `${teams.length} TEAMS` : 'LOADING...'}</span>
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          
          {/* Refresh Button */}
          <button 
            onClick={fetchFullLeaderboard}
            disabled={loading}
            className="absolute right-0 sm:right-4 top-0 sm:top-4 flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white text-xs sm:text-base font-bold transition-all shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Top 3 Podium - Special Display */}
        {teams.length > 0 && (
          <div className="max-w-5xl mx-auto mb-8">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400 mb-2">Team Rankings</h2>
              <div className="h-1 w-24 sm:w-32 bg-gradient-to-r from-cyan-500 to-purple-500 mx-auto rounded-full"></div>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {teams.map((team, index) => {
                const rank = index + 1;
                const style = getCardStyle(rank);
                const isTopThree = rank <= 3;
                
                return (
                  <div key={team._id} className="relative group">
                    <div className={`relative backdrop-blur-sm ${style.bg} hover:bg-opacity-90 border-3 ${style.border} rounded-lg sm:rounded-xl p-3 sm:p-6 transition-all duration-300 ${style.shadow} ${isTopThree ? 'hover:scale-[1.03]' : 'hover:scale-[1.02]'} ${isTopThree ? 'border-4' : 'border-2'}`}>
                      <div className="flex items-center justify-between gap-2 sm:gap-4">
                        <div className="flex items-center space-x-2 sm:space-x-5 flex-1 min-w-0">
                          {/* Rank Badge */}
                          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
                            {isTopThree && (
                              <div className="hidden sm:block">
                                {getRankBadge(rank)}
                              </div>
                            )}
                            <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full ${isTopThree ? `bg-gradient-to-br ${style.bg}` : 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20'} border-3 ${style.border} flex items-center justify-center ${isTopThree ? 'border-3' : 'border-2'}`}>
                              <span className={`text-lg sm:text-2xl font-black ${style.text}`}>
                                {rank}
                              </span>
                            </div>
                          </div>
                          
                          {/* Team Info */}
                          <div className="flex-1 min-w-0">
                            {isTopThree && getRankLabel(rank) && (
                              <div className={`text-[10px] sm:text-xs font-bold tracking-wider mb-1 ${style.text} ${style.glow}`}>
                                {getRankLabel(rank)}
                              </div>
                            )}
                            <h3 className={`${isTopThree ? 'text-lg sm:text-3xl' : 'text-base sm:text-2xl'} font-black text-white ${isTopThree ? style.glow : ''} transition-colors truncate`}>
                              {team.name}
                            </h3>
                          </div>
                        </div>

                        {/* Points Display */}
                        <div className="text-right shrink-0">
                          <div className={`${isTopThree ? 'text-xl sm:text-4xl' : 'text-lg sm:text-3xl'} font-black ${style.text} ${isTopThree ? style.glow : ''}`}>
                            {team.points.toLocaleString()}
                          </div>
                          <p className={`${isTopThree ? 'text-[10px] sm:text-sm' : 'text-[10px] sm:text-xs'} font-mono tracking-wider ${isTopThree ? style.text : 'text-gray-500'} mt-1`}>
                            POINTS
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Empty state */}
        {teams.length === 0 && (
          <div className="text-center py-20">
            <Trophy className="w-24 h-24 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-xl">No teams to display yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;