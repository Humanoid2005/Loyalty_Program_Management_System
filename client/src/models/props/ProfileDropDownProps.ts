import { Team } from '../Team';
import { User } from '../User';

export interface ProfileDropdownProps {
  user: User;
  team?: Team | null;
  onLogout: () => void;
}