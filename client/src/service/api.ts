import {APIService} from "../models/API_Service"
import type { User } from "../models/User";
import type { Event } from "../models/Event";
import type { Team } from "../models/Team";
import {Volunteer} from "../models/User"
import { decryptSecretCode,encryptSecretCode } from "./cryptography";

const api_service  = new APIService();

export async function healthCheck(): Promise<{ status: string; message: string }> {
    return api_service.makeRequest('/api/health');
}

export async function getUserProfile(): Promise<User> {
    return api_service.makeRequest('/api/user/profile');
}

export async function fetchUser(): Promise<User | null> {
  try {
    const data = await api_service.makeRequest<any>('/api/user/profile');
    if (data && typeof data.name === 'string' && data.name.includes(' ')) {
      const parts = data.name.split(' ');
      data.rollNumber = parts[0];
      data.name = parts.slice(1).join(' ');
    }
    return data as User;
  } catch (error) {
    return null;
  }
}

export async function logout(): Promise<void> {
    await api_service.makeRequest('/auth/logout', { method: 'GET' });
}

export async function getEvents(): Promise<{ events: Event[] }> {
    const response = await api_service.makeRequest<{ events: Event[] }>('/api/events');
    // Decrypt secret codes for all events
    const eventsWithDecryptedCodes = await Promise.all(
      response.events.map(async (event) => ({
        ...event,
        secret_code: await decryptSecretCode(event.secret_code),
      }))
    );
    return { events: eventsWithDecryptedCodes };
}

export async function createEvent(eventData: {
    event_name: string;
    points: number;
    secret_code?: string;
  }): Promise<{ message: string; event: Event }> {
    // Encrypt secret_code before sending
    const dataToSend = {
      ...eventData,
      secret_code: await encryptSecretCode(eventData.secret_code || ''),
    };
    
    const response = await api_service.makeRequest<{ message: string; event: Event }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(dataToSend),
    });
    
    // Decrypt the secret_code in the response
    return {
      ...response,
      event: {
        ...response.event,
        secret_code: await decryptSecretCode(response.event.secret_code),
      },
    };
}

export async function updateEvent(
  eventId: string,
  eventData: {
    event_name?: string;
    points?: number;
    expired?: boolean;
    secret_code?: string;
  }
): Promise<{ message: string; event: Event }> {
  // Encrypt secret_code before sending
  const dataToSend: any = { ...eventData };
  if (eventData.secret_code !== undefined) {
    dataToSend.secret_code = await encryptSecretCode(eventData.secret_code || '');
  }

  const response = await api_service.makeRequest<{ message: string; event: Event }>(`/api/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(dataToSend),
  });

  // Decrypt the secret_code in the response
  return {
    ...response,
    event: {
      ...response.event,
      secret_code: await decryptSecretCode(response.event.secret_code),
    },
  };
}

export async function deleteEvent(eventId: string): Promise<{ message: string }> {
  return api_service.makeRequest(`/api/events/${eventId}`, {
    method: 'DELETE',
  });
}

// Volunteer endpoints
export async function getVolunteers(): Promise<{ volunteers: Volunteer[] }> {
  return api_service.makeRequest('/api/volunteers');
}

export async function addVolunteer(volunteerData: {
  rollNumber: string;
  name: string;
  email: string;
}): Promise<{ message: string; volunteer: Volunteer }> {
  return api_service.makeRequest('/api/volunteers', {
    method: 'POST',
    body: JSON.stringify(volunteerData),
  });
}

export async function removeVolunteer(rollNumber: string): Promise<{ message: string }> {
  return api_service.makeRequest(`/api/volunteers/${rollNumber}`, {
    method: 'DELETE',
  });
}

export async function getVolunteer(rollNumber: string): Promise<{ volunteer: Volunteer }> {
  return api_service.makeRequest(`/api/volunteers/${rollNumber}`);
}

export async function getLeaderboard(): Promise<{ volunteers: Volunteer[] }> {
  return api_service.makeRequest('/api/leaderboard');
}

export async function getLeaderboardFull(): Promise<{ teams: Team[] }> {
  return api_service.makeRequest('/api/leaderboard/full');
}

export async function authorizeVolunteer(eventId: string, secretCode: string, token: string) {
  const encrypted_secret_code = await encryptSecretCode(secretCode);
  return api_service.makeRequest('/api/volunteer/authorize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      event_id: eventId,
      secret_code: encrypted_secret_code,
    }),
  });
}

export async function scanTeamQR(teamId: string, eventToken: string) {
  return api_service.makeRequest('/api/volunteer/scan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${eventToken}` },
    body: JSON.stringify({ team_id: teamId }),
  });
}