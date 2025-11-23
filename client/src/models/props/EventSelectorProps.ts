import { Team } from '../Team';

export interface TeamDashboardProps {
  team: Team;
  onTeamLeft: () => void;
}