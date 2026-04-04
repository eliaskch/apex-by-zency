export interface Patient {
  id: string
  cabinet_id: string
  last_name: string
  first_name: string
  birth_date?: string | null
  gender?: 'M' | 'F' | 'autre' | null
  phone?: string | null
  email?: string | null
  address?: { street: string; city: string; postal_code: string } | null
  mutual_name?: string | null
  mutual_number?: string | null
  allergies: string[]
  medical_notes?: string | null
  is_active: boolean
  created_at: string
  updated_at?: string | null
}

export interface PatientListItem {
  id: string
  cabinet_id: string
  last_name: string
  first_name: string
  birth_date?: string | null
  gender?: string | null
  phone?: string | null
  email?: string | null
  is_active: boolean
  created_at: string
}

export interface PatientCreate {
  last_name: string
  first_name: string
  birth_date?: string | null
  gender?: 'M' | 'F' | 'autre' | null
  phone?: string | null
  email?: string | null
  address?: { street: string; city: string; postal_code: string } | null
  mutual_name?: string | null
  mutual_number?: string | null
  allergies?: string[]
  medical_notes?: string | null
}

export interface PatientUpdate {
  last_name?: string
  first_name?: string
  birth_date?: string | null
  gender?: 'M' | 'F' | 'autre' | null
  phone?: string | null
  email?: string | null
  address?: { street: string; city: string; postal_code: string } | null
  mutual_name?: string | null
  mutual_number?: string | null
  allergies?: string[]
  medical_notes?: string | null
}

export interface PatientSearchResult {
  id: string
  last_name: string
  first_name: string
  birth_date?: string | null
  phone?: string | null
}

export interface PatientListResponse {
  items: PatientListItem[]
  total: number
}
