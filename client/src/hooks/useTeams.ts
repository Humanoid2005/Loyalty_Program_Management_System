import { useState, useCallback } from 'react';
import type { Team } from '../models/Team';
import { APIService } from '../models/API_Service';

const api_service = new APIService();

interface UseTeamsReturn {
  team: Team | null;
  loading: boolean;
  error: string | null;
  fetchMyTeam: () => Promise<void>;
  createTeam: (teamName?: string) => Promise<Team>;
  joinTeamByCode: (joinCode: string) => Promise<Team>;
  leaveTeam: (teamId: string) => Promise<void>;
  refreshTeam: () => Promise<void>;
}

export function useTeams(): UseTeamsReturn {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api_service.makeRequest<{ team: Team }>('/api/my_team');
      setTeam(response.team);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch team';
      setError(message);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTeam = useCallback(async (teamName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api_service.makeRequest<{ team: Team; message: string }>(
        '/api/create_team',
        {
          method: 'POST',
          body: JSON.stringify({ team_name: teamName || undefined }),
        }
      );
      setTeam(response.team);
      return response.team;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create team';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const joinTeamByCode = useCallback(async (joinCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api_service.makeRequest<{ team: Team; message: string }>(
        '/api/join_team_by_code',
        {
          method: 'POST',
          body: JSON.stringify({ join_code: joinCode }),
        }
      );
      setTeam(response.team);
      return response.team;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join team';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const leaveTeam = useCallback(async (teamId: string) => {
    setLoading(true);
    setError(null);
    try {
      await api_service.makeRequest<{ message: string }>('/api/leave_team', {
        method: 'POST',
        body: JSON.stringify({ team_id: teamId }),
      });
      setTeam(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave team';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTeam = useCallback(async () => {
    await fetchMyTeam();
  }, [fetchMyTeam]);

  return {
    team,
    loading,
    error,
    fetchMyTeam,
    createTeam,
    joinTeamByCode,
    leaveTeam,
    refreshTeam,
  };
}
