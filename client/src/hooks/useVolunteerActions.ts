import { useState, useCallback } from 'react';
import { authorizeVolunteer, scanTeamQR } from '../service/api';

interface UseVolunteerActionsReturn {
  loading: boolean;
  error: string | null;
  eventToken: string | null;
  authorize: (eventId: string, secretCode: string, token: string) => Promise<any>;
  scanQR: (teamId: string, eventToken: string) => Promise<any>;
  clearEventToken: () => void;
}

export function useVolunteerActions(): UseVolunteerActionsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventToken, setEventToken] = useState<string | null>(null);

  const authorize = useCallback(async (eventId: string, secretCode: string, token: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authorizeVolunteer(eventId, secretCode, token) as any;
      if (response?.event_token) {
        setEventToken(response.event_token);
      }
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to authorize volunteer';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const scanQR = useCallback(async (teamId: string, token: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await scanTeamQR(teamId, token);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to scan QR code';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearEventToken = useCallback(() => {
    setEventToken(null);
  }, []);

  return {
    loading,
    error,
    eventToken,
    authorize,
    scanQR,
    clearEventToken,
  };
}
