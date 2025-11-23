import { Event } from '../Event';

export interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: { event_name: string; points: number; secret_code:string;expired?: boolean }) => void;
  event?: Event;
}