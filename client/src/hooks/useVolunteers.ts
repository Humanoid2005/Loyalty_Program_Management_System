import { useState, useCallback } from 'react';
import type { Volunteer } from '../models/User';
import { getVolunteers, addVolunteer, removeVolunteer, getVolunteer } from '../service/api';

interface UseVolunteersReturn {
  volunteers: Volunteer[];
  loading: boolean;
  error: string | null;
  fetchVolunteers: () => Promise<void>;
  addNewVolunteer: (volunteerData: {
    rollNumber: string;
    name: string;
    email: string;
  }) => Promise<Volunteer>;
  removeExistingVolunteer: (rollNumber: string) => Promise<void>;
  fetchVolunteer: (rollNumber: string) => Promise<Volunteer>;
  refreshVolunteers: () => Promise<void>;
}

export function useVolunteers(): UseVolunteersReturn {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getVolunteers();
      setVolunteers(response.volunteers);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch volunteers';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addNewVolunteer = useCallback(
    async (volunteerData: { rollNumber: string; name: string; email: string }) => {
      setLoading(true);
      setError(null);
      try {
        const response = await addVolunteer(volunteerData);
        setVolunteers((prev) => [response.volunteer, ...prev]);
        return response.volunteer;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add volunteer';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const removeExistingVolunteer = useCallback(async (rollNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      await removeVolunteer(rollNumber);
      setVolunteers((prev) =>
        prev.filter((volunteer) => volunteer.rollNumber !== rollNumber)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove volunteer';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVolunteer = useCallback(async (rollNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getVolunteer(rollNumber);
      return response.volunteer;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch volunteer';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshVolunteers = useCallback(async () => {
    await fetchVolunteers();
  }, [fetchVolunteers]);

  return {
    volunteers,
    loading,
    error,
    fetchVolunteers,
    addNewVolunteer,
    removeExistingVolunteer,
    fetchVolunteer,
    refreshVolunteers,
  };
}
