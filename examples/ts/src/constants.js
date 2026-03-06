/**
 * Shared constants (analysis types, etc.)
 */
export const ANALYSIS_TYPES = [
  { value: 'counter_movement_jump', label: 'Counter Movement Jump' },
  { value: 'gait', label: 'Overground Walking' },
  { value: 'treadmill_running', label: 'Treadmill Running' },
  { value: 'sit_to_stand', label: 'Sit-to-Stand Transfer' },
  { value: 'squats', label: 'Squats' },
  { value: 'range_of_motion', label: 'Range of Motion' },
  { value: 'overground_running', label: 'Overground Running' },
  { value: 'drop_jump', label: 'Drop Vertical Jump' },
  { value: 'hop', label: 'Hop Test' },
  { value: 'treadmill_gait', label: 'Treadmill Walking' },
  { value: 'change_of_direction', label: '5-0-5 Test' },
  { value: 'cut', label: 'Cutting Maneuver' },
];

export const DEFAULT_API_KEY = import.meta.env.VITE_API_KEY ?? 'YOUR_API_KEY_HERE';
