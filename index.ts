export type JobSource = 'usajobs' | 'adzuna' | 'linkedin' | 'indeed'
export type JobType = 'Remote' | 'Hybrid' | 'Onsite'
export type ApplicationStatus = 'queued' | 'applied' | 'skipped' | 'interviewing' | 'offered' | 'rejected'

export interface JobScores {
  field: number
  salary: number
  location: number
  experience: number
  education: number
  total: number
}

export interface Job {
  id: string
  title: string
  company: string
  location: string
  salary_text: string
  salary_min: number | null
  salary_max: number | null
  salary_mid: number | null
  type: JobType
  source: JobSource
  source_id: string
  posted_at: string
  url: string
  description: string
  tags: string[]
  scores: JobScores
  created_at?: string
}

export interface Application {
  id: string
  job_id: string
  job?: Job
  status: ApplicationStatus
  cover_letter: string
  tailored_resume_url: string | null
  applied_at: string | null
  notes: string
  created_at: string
  authorized_to_work: boolean
  requires_sponsorship: boolean
  has_disability: boolean
  is_veteran: boolean
}
