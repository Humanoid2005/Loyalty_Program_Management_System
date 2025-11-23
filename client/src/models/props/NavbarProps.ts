import { User } from '../User';

export interface NavbarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  user: User;
  onLogout: () => void;
}