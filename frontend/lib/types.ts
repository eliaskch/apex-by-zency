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

export interface Consultation {
  id: string
  patient_id: string
  practitioner_id: string
  recorded_at: string
  audio_url: string | null
  duration_seconds: number
  status: ConsultationStatus
  act_type: string
  specialty: string
  transcript: string | null
}

export interface ConsultationListItem {
  id: string
  patient_id: string
  practitioner_id: string
  recorded_at: string
  status: ConsultationStatus
  act_type: string
  specialty: string
  duration_seconds: number
}

export interface ConsultationCreate {
  patient_id: string
  act_type: string
  specialty?: string
}

export interface Document {
  id: string
  consultation_id: string
  doc_type: string
  content_json: Record<string, unknown> | null
  pdf_url: string | null
  version: number
  created_at: string
}

export interface DashboardMetrics {
  consultations_count: number
  documents_count: number
  time_saved_minutes: number
  patients_count: number
}

export interface PatientSummary {
  id: string
  first_name: string
  last_name: string
}

export interface RecentConsultation {
  id: string
  patient_id: string
  recorded_at: string
  status: ConsultationStatus
  act_type: string
  specialty: string
  patient: PatientSummary
  has_document: boolean
  pdf_url: string | null
}
