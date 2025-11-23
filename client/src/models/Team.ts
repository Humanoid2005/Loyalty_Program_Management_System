export interface Team {
  team_id: string;
  team_name: string;
  members: Array<{
    name: string;
    email: string;
    rollNumber: string;
    role: string;
  }>;
  points: number;
  events_participated: Array<any>;
  qr_id?: string;
  join_code?: string;
}