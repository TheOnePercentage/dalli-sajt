/**
 * Shopping Appointment Architecture (Phase 21)
 * Architecture only - no booking implementation
 */
export const APPOINTMENT_TYPES = [
  'virtual_appointment',
  'private_styling_session',
  'vip_consultation',
  'personal_shopping_event'
];
export function isAppointmentArchitectureEnabled() { return true; }
