import { User } from '../User';

export interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}