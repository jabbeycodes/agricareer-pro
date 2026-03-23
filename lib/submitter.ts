import { Job } from '@/types'
import { PROFILE } from './profile'

interface SubmissionResult {
  method: 'greenhouse' | 'lever' | 'email' | 'manual'
  success: boolean
  response?: string
  error?: string
}

// Detect which ATS platform the job URL belongs to
function detectPlatform(url: string): 'greenhouse' | 'lever' | 'email' | 'manual' {
  if (!url) return 'manual'
  const lower = url.toLowerCase()
  if (lower.includes('greenhouse.io')) return 'greenhouse'
  if (lower.includes('lever.co')) return 'lever'
  return 'manual'
}

// Parse Greenhouse board token and job ID from URL
// Formats: boards.greenhouse.io/{board}/jobs/{id}, {company}.greenhouse.io/jobs/{id}
function parseGreenhouseUrl(url: string): { boardToken: string; jobId: string } | null {
  // boards.greenhouse.io/{board}/jobs/{id}
  let match = url.match(/boards\.greenhouse\.io\/(\w+)\/jobs\/(\d+)/)
  if (match) return { boardToken: match[1], jobId: match[2] }

  // {company}.greenhouse.io/jobs/{id}
  match = url.match(/(\w+)\.greenhouse\.io\/jobs\/(\d+)/)
  if (match) return { boardToken: match[1], jobId: match[2] }

  return null
}

// Parse Lever company and posting ID from URL
// Format: jobs.lever.co/{company}/{posting_id}
function parseLeverUrl(url: string): { company: string; postingId: string } | null {
  const match = url.match(/jobs\.lever\.co\/([\w-]+)\/([\w-]+)/)
  if (match) return { company: match[1], postingId: match[2] }
  return null
}

async function submitToGreenhouse(
  url: string,
  resumeBuffer: Buffer,
  coverLetterText: string
): Promise<SubmissionResult> {
  const parsed = parseGreenhouseUrl(url)
  if (!parsed) return { method: 'greenhouse', success: false, error: 'Could not parse Greenhouse URL' }

  const formData = new FormData()
  formData.append('first_name', PROFILE.name.split(' ')[0])
  formData.append('last_name', PROFILE.name.split(' ').slice(1).join(' '))
  formData.append('email', PROFILE.email)
  formData.append('phone', PROFILE.phone)

  // Resume as file attachment
  const resumeBlob = new Blob([new Uint8Array(resumeBuffer)], { type: 'application/pdf' })
  formData.append('resume', resumeBlob, 'Joshua_Abbey_Resume.pdf')

  // Cover letter as text
  formData.append('cover_letter', coverLetterText)

  // EEO fields
  formData.append('demographic_question_answer[authorized_to_work]', 'true')
  formData.append('demographic_question_answer[requires_sponsorship]', 'false')

  try {
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${parsed.boardToken}/jobs/${parsed.jobId}/applications`
    const res = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    })

    const text = await res.text()
    if (res.ok) {
      return { method: 'greenhouse', success: true, response: text }
    }
    return { method: 'greenhouse', success: false, error: `${res.status}: ${text}` }
  } catch (e: any) {
    return { method: 'greenhouse', success: false, error: e.message }
  }
}

async function submitToLever(
  url: string,
  resumeBuffer: Buffer,
  coverLetterText: string
): Promise<SubmissionResult> {
  const parsed = parseLeverUrl(url)
  if (!parsed) return { method: 'lever', success: false, error: 'Could not parse Lever URL' }

  const formData = new FormData()
  formData.append('name', PROFILE.name)
  formData.append('email', PROFILE.email)
  formData.append('phone', PROFILE.phone)
  formData.append('org', 'Individual')
  formData.append('comments', coverLetterText)

  // Resume as file
  const resumeBlob = new Blob([new Uint8Array(resumeBuffer)], { type: 'application/pdf' })
  formData.append('resume', resumeBlob, 'Joshua_Abbey_Resume.pdf')

  // URLs
  formData.append('urls[LinkedIn]', `https://${PROFILE.linkedin}`)
  formData.append('urls[GitHub]', `https://${PROFILE.github}`)

  try {
    const apiUrl = `https://api.lever.co/v0/postings/${parsed.company}/${parsed.postingId}?key=${process.env.LEVER_API_KEY || ''}`
    const res = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    })

    const text = await res.text()
    if (res.ok) {
      return { method: 'lever', success: true, response: text }
    }
    return { method: 'lever', success: false, error: `${res.status}: ${text}` }
  } catch (e: any) {
    return { method: 'lever', success: false, error: e.message }
  }
}

export async function submitApplication(
  job: Job,
  resumeBuffer: Buffer,
  coverLetterText: string
): Promise<SubmissionResult> {
  const platform = detectPlatform(job.url)

  switch (platform) {
    case 'greenhouse':
      return submitToGreenhouse(job.url, resumeBuffer, coverLetterText)
    case 'lever':
      return submitToLever(job.url, resumeBuffer, coverLetterText)
    default:
      // No auto-submit available — mark for manual review
      return {
        method: 'manual',
        success: false,
        error: 'No supported ATS detected — saved for manual application',
      }
  }
}
