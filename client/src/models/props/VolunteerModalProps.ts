export interface VolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (volunteer: { rollNumber: string; name: string; email: string; }) => void;
}