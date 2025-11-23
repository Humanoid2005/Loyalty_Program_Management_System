import { useState, useCallback } from 'react';
import type { Event } from '../models/Event';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../service/api';

interface UseEventsReturn {
  events: Event[];
  loading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  createNewEvent: (eventData: {
    event_name: string;
    points: number;
    secret_code?: string;
  }) => Promise<Event>;
  updateExistingEvent: (
    eventId: string,
    eventData: {
      event_name?: string;
      points?: number;
      expired?: boolean;
      secret_code?: string;
    }
  ) => Promise<Event>;
  deleteExistingEvent: (eventId: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getEvents();
      setEvents(response.events);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewEvent = useCallback(
    async (eventData: { event_name: string; points: number; secret_code?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const response = await createEvent(eventData);
        setEvents((prev) => [response.event, ...prev]);
        return response.event;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create event';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateExistingEvent = useCallback(
    async (
      eventId: string,
      eventData: {
        event_name?: string;
        points?: number;
        expired?: boolean;
        secret_code?: string;
      }
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await updateEvent(eventId, eventData);
        setEvents((prev) =>
          prev.map((event) =>
            event.event_id === eventId ? response.event : event
          )
        );
        return response.event;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update event';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteExistingEvent = useCallback(async (eventId: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteEvent(eventId);
      setEvents((prev) => prev.filter((event) => event.event_id !== eventId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete event';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    await fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    fetchEvents,
    createNewEvent,
    updateExistingEvent,
    deleteExistingEvent,
    refreshEvents,
  };
}
