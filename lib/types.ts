export type PlayerStatus =
  | 'Confirmed'
  | 'Prospective'
  | 'Offered'
  | 'Not Selected'
  | 'Declined'
  | 'Archived'

export type Team = {
  id: string
  name: string
  division: string | null
  photo_url: string | null
  docuseal_template_id: string | null
  calendar_url: string | null
  created_at: string
  updated_at: string
}

export type Player = {
  id: string
  team_id: string | null
  first_name: string
  last_name: string
  number: string | null
  dob: string | null
  positions: string[]
  status: PlayerStatus
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null
  parent2_name: string | null
  parent2_phone: string | null
  parent2_email: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  notes: string | null
  photo_url: string | null
  team_reach: boolean
  created_at: string
  updated_at: string
}

export type Coach = {
  id: string
  first_name: string
  last_name: string
  role: 'Head Coach' | 'Assistant Coach' | 'Club Director' | 'Volunteer' | 'Team Manager'
  teams: string[]
  email: string | null
  phone: string | null
  notes: string | null
  agreement_status: 'not_sent' | 'sent' | 'signed'
  agreement_sent_at: string | null
  agreement_signed_at: string | null
  agreement_submission_id: string | null
  created_at: string
  updated_at: string
}

export type Document = {
  id: string
  player_id: string
  doc_type: 'Waiver' | 'Medical Release' | 'Family Code of Conduct' | 'Player Participation' | 'Proof of Birth' | 'Team Reach'
  status: 'not_sent' | 'sent' | 'signed'
  date_sent: string | null
  date_signed: string | null
  external_id: string | null
}

export type Assessment = {
  id: string
  player_id: string
  date: string
  evaluator: string | null
  technical: number
  tactical: number
  physical: number
  mental: number
  notes: string | null
}

export type Apparel = {
  id: string
  entity_id: string
  entity_type: 'player' | 'coach'
  item: 'Shirt' | 'Shorts' | 'Pants' | 'Jacket'
  size: string | null
  status: 'not_issued' | 'issued'
  date_issued: string | null
}

export const POSITIONS = [
  { code: 'GK', label: 'Goalkeeper' },
  { code: 'CB', label: 'Center Back' },
  { code: 'FB', label: 'Fullback' },
  { code: 'RB', label: 'Right Back' },
  { code: 'LB', label: 'Left Back' },
  { code: 'WB', label: 'Wing Back' },
  { code: 'DM', label: 'Defensive Mid' },
  { code: 'CM', label: 'Center Mid' },
  { code: 'AM', label: 'Attacking Mid' },
  { code: 'LM', label: 'Left Mid' },
  { code: 'RM', label: 'Right Mid' },
  { code: 'LW', label: 'Left Wing' },
  { code: 'RW', label: 'Right Wing' },
  { code: 'CF', label: 'Center Forward' },
  { code: 'ST', label: 'Striker' },
  { code: 'SS', label: 'Second Striker' },
]

export const ACTIVE_STATUSES: PlayerStatus[] = ['Confirmed', 'Prospective', 'Offered']

export const STATUS_COLORS: Record<PlayerStatus, string> = {
  Confirmed:      '#2F8F54',
  Prospective:    '#D98E04',
  Offered:        '#6B4FA0',
  'Not Selected': '#E05A3A',
  Declined:       '#9B59A0',
  Archived:       '#9B968A',
}
