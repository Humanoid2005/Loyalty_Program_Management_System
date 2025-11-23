import { useState, useCallback } from 'react';
import type { Team } from '../models/Team';
import type { Volunteer } from '../models/User';
import { getLeaderboard, getLeaderboardFull } from '../service/api';

interface UseLeaderboardReturn {
  leaderboard: Volunteer[] | Team[];
  loading: boolean;
  error: string | null;
  fetchShortLeaderboard: () => Promise<void>;
  fetchFullLeaderboard: () => Promise<void>;
  refreshLeaderboard: (full?: boolean) => Promise<void>;
}

export function useLeaderboard(): UseLeaderboardReturn {
  const [leaderboard, setLeaderboard] = useState<Volunteer[] | Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShortLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getLeaderboard();
      setLeaderboard(response.volunteers);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch leaderboard';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFullLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getLeaderboardFull();
      setLeaderboard(response.teams);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch full leaderboard';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshLeaderboard = useCallback(
    async (full = false) => {
      if (full) {
        await fetchFullLeaderboard();
      } else {
        await fetchShortLeaderboard();
      }
    },
    [fetchShortLeaderboard, fetchFullLeaderboard]
  );

  return {
    leaderboard,
    loading,
    error,
    fetchShortLeaderboard,
    fetchFullLeaderboard,
    refreshLeaderboard,
  };
}
