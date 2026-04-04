export interface Practitioner {
  id: string
  cabinet_id: string
  first_name: string
  last_name: string
  email: string
  rpps: string | null
  role: 'owner' | 'associate'
  specialty: string
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface RegisterPayload {
  first_name: string
  last_name: string
  email: string
  password: string
  cabinet_name: string
  specialty: string
}

export interface LoginPayload {
  email: string
  password: string
}

export type ConsultationStatus =
  | 'idle'
  | 'recording'
  | 'uploading'
  | 'transcribing'
  | 'generating'
  | 'done'
  | 'error'
