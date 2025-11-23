export interface Event {
  event_id: string;
  event_name: string;
  points: number;
  secret_code: string;
  expired: boolean;
  participants: number;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}