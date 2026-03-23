import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { fetchAllJobs } from '@/lib/jobFetcher'
import { tailorResume } from '@/lib/resumeTailor'
import { generateResumePdf, generateCoverLetterPdf } from '@/lib/pdfGenerator'
import { uploadPdf } from '@/lib/storageUploader'
import { submitApplication } from '@/lib/submitter'
import { PROFILE, getResumeText } from '@/lib/profile'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MAX_APPLICATIONS_PER_RUN = 3

async function generateCoverLetter(job: { title: string; company: string; location: string; salary_text: string; description: string }): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `You are a professional career coach. Write a tailored cover letter for Joshua Abbey (Green Card holder, M.S. Technology Management/Data Science, B.S. Agricultural Science, Six Sigma Green Belt, Amazon Area Manager experience). Rules: 3 tight paragraphs, under 260 words, NO generic phrases. Start with "Dear Hiring Manager,"

JOB: ${job.title} at ${job.company} | ${job.location} | ${job.salary_text}
${job.description}

Write ONLY the cover letter.`
      }],
    }),
  })
  const data = await res.json()
  return data?.content?.[0]?.text || ''
}

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const log: string[] = []

  try {
    // ── Step 1: Fetch & score jobs ──
    log.push('Fetching jobs from all sources...')
    const jobs = await fetchAllJobs()
    log.push(`Found ${jobs.length} jobs after scoring/dedup`)

    if (jobs.length === 0) {
      return NextResponse.json({ success: true, log, applied: 0 })
    }

    // ── Step 2: Upsert all jobs to Supabase (one by one to handle unique constraints) ──
    let upserted = 0
    for (const j of jobs) {
      const { error } = await supabase.from('jobs').upsert({
        id: j.id, title: j.title, company: j.company, location: j.location,
        salary_text: j.salary_text, salary_min: j.salary_min, salary_max: j.salary_max,
        salary_mid: j.salary_mid, type: j.type, source: j.source, source_id: j.source_id,
        posted_at: j.posted_at, url: j.url, description: j.description,
        tags: j.tags, scores: j.scores,
      }, { onConflict: 'id', ignoreDuplicates: true })
      if (!error) upserted++
    }
    log.push(`Upserted ${upserted}/${jobs.length} jobs`)

    // ── Step 3: Filter out already-applied jobs ──
    const { data: existingApps } = await supabase.from('applications').select('job_id')
    const appliedJobIds = new Set((existingApps || []).map(a => a.job_id))
    const newJobs = jobs.filter(j => !appliedJobIds.has(j.id))
    log.push(`${newJobs.length} new jobs (${appliedJobIds.size} already applied)`)

    const topJobs = newJobs
      .sort((a, b) => b.scores.total - a.scores.total)
      .slice(0, MAX_APPLICATIONS_PER_RUN)

    log.push(`Processing top ${topJobs.length} jobs through full pipeline...`)

    // ── Step 4: Full pipeline per job ──
    let applied = 0
    let submitted = 0

    for (const job of topJobs) {
      try {
        log.push(`\n→ ${job.title} at ${job.company} (score: ${job.scores.total})`)

        // 4a. Ensure job exists in DB — try insert first, ignore if already exists
        const { error: jobErr } = await supabase.from('jobs').upsert({
          id: job.id, title: job.title, company: job.company, location: job.location,
          salary_text: job.salary_text, salary_min: job.salary_min, salary_max: job.salary_max,
          salary_mid: job.salary_mid, type: job.type, source: job.source, source_id: job.source_id,
          posted_at: job.posted_at, url: job.url, description: job.description,
          tags: job.tags, scores: job.scores,
        }, { onConflict: 'id', ignoreDuplicates: true })
        if (jobErr) {
          // If source_id conflict, try inserting without source_id constraint
          await supabase.from('jobs').insert({
            id: job.id, title: job.title, company: job.company, location: job.location,
            salary_text: job.salary_text, salary_min: job.salary_min, salary_max: job.salary_max,
            salary_mid: job.salary_mid, type: job.type, source: job.source, source_id: job.id,
            posted_at: job.posted_at, url: job.url, description: job.description,
            tags: job.tags, scores: job.scores,
          })
        }

        // 4b. Create application record as "queued"
        const { data: appRow, error: insertErr } = await supabase.from('applications').insert({
          job_id: job.id,
          status: 'queued',
          authorized_to_work: true,
          requires_sponsorship: false,
          has_disability: false,
          is_veteran: false,
        }).select().single()

        if (insertErr || !appRow) {
          log.push(`  ✗ DB insert failed: ${insertErr?.message}`)
          continue
        }

        const appId = appRow.id

        // 4b. Tailor resume + generate cover letter (parallel)
        log.push('  ⟳ Tailoring resume & generating cover letter...')
        const [tailoredResumeText, coverLetterText] = await Promise.all([
          tailorResume(job),
          generateCoverLetter(job),
        ])

        // 4c. Generate PDFs (parallel)
        log.push('  ⟳ Generating PDFs...')
        const [resumePdf, coverLetterPdf] = await Promise.all([
          generateResumePdf(tailoredResumeText),
          generateCoverLetterPdf(coverLetterText, job.title, job.company),
        ])

        // 4d. Upload PDFs to Supabase Storage (parallel)
        log.push('  ⟳ Uploading to storage...')
        const [resumeUrl, coverLetterUrl] = await Promise.all([
          uploadPdf(supabase, job.id, 'resume.pdf', resumePdf),
          uploadPdf(supabase, job.id, 'cover_letter.pdf', coverLetterPdf),
        ])

        // 4e. Attempt auto-submission to ATS
        log.push('  ⟳ Submitting application...')
        const submission = await submitApplication(job, resumePdf, coverLetterText)

        if (submission.success) {
          submitted++
          log.push(`  ✓ Auto-submitted via ${submission.method}`)
        } else {
          log.push(`  ◎ ${submission.method}: ${submission.error || 'saved for manual apply'}`)
        }

        // 4f. Update application record with all data
        const updateData: Record<string, any> = {
          status: submission.success ? 'applied' : 'queued',
          cover_letter: coverLetterText,
          applied_at: submission.success ? new Date().toISOString() : null,
        }

        // Try to update with new columns, fall back to base columns if they don't exist
        const { error: updateErr } = await supabase.from('applications').update({
          ...updateData,
          tailored_resume_text: tailoredResumeText,
          tailored_resume_url: resumeUrl,
          cover_letter_url: coverLetterUrl,
          submission_method: submission.method,
          submission_response: submission.response || submission.error || null,
        }).eq('id', appId)

        if (updateErr) {
          // Fallback: update only base columns (new columns may not exist yet)
          await supabase.from('applications').update(updateData).eq('id', appId)
        }

        applied++
        log.push(`  ✓ Application saved | Resume: ${resumeUrl ? 'uploaded' : 'failed'} | Cover letter: ${coverLetterUrl ? 'uploaded' : 'failed'}`)

      } catch (e: any) {
        log.push(`  ✗ Error: ${e.message}`)
      }
    }

    log.push(`\nDone. ${applied} processed, ${submitted} auto-submitted.`)

    return NextResponse.json({
      success: true,
      applied,
      submitted,
      total_jobs_found: jobs.length,
      new_jobs: newJobs.length,
      log,
    })
  } catch (error: any) {
    log.push(`Pipeline error: ${error.message}`)
    return NextResponse.json({ success: false, error: error.message, log }, { status: 500 })
  }
}
