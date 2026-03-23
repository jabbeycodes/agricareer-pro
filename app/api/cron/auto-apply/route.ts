import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { fetchAllJobs } from '@/lib/jobFetcher'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 min for Vercel Pro, adjust if on hobby

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

async function callClaude(prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
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
  const MAX_APPLICATIONS_PER_RUN = 5

  try {
    // Step 1: Fetch live jobs from all sources
    log.push('Fetching jobs from all sources...')
    const jobs = await fetchAllJobs()
    log.push(`Found ${jobs.length} jobs after scoring/dedup`)

    if (jobs.length === 0) {
      return NextResponse.json({ success: true, log, applied: 0 })
    }

    // Step 2: Upsert all jobs to Supabase
    const jobRows = jobs.map(j => ({
      id: j.id, title: j.title, company: j.company, location: j.location,
      salary_text: j.salary_text, salary_min: j.salary_min, salary_max: j.salary_max,
      salary_mid: j.salary_mid, type: j.type, source: j.source, source_id: j.source_id,
      posted_at: j.posted_at, url: j.url, description: j.description,
      tags: j.tags, scores: j.scores,
    }))
    const { error: upsertErr } = await supabase.from('jobs').upsert(jobRows, { onConflict: 'id' })
    if (upsertErr) log.push(`Job upsert warning: ${upsertErr.message}`)
    else log.push(`Upserted ${jobRows.length} jobs to Supabase`)

    // Step 3: Filter out jobs we already applied to
    const { data: existingApps } = await supabase
      .from('applications')
      .select('job_id')
    const appliedJobIds = new Set((existingApps || []).map(a => a.job_id))

    const newJobs = jobs.filter(j => !appliedJobIds.has(j.id))
    log.push(`${newJobs.length} new jobs (${appliedJobIds.size} already applied)`)

    // Take top N by score
    const topJobs = newJobs
      .sort((a, b) => b.scores.total - a.scores.total)
      .slice(0, MAX_APPLICATIONS_PER_RUN)

    log.push(`Processing top ${topJobs.length} jobs...`)

    // Step 4: For each top job, generate resume + cover letter + save application
    let applied = 0
    for (const job of topJobs) {
      try {
        log.push(`→ ${job.title} at ${job.company} (score: ${job.scores.total})`)

        // Generate cover letter
        const coverLetter = await callClaude(
          `You are a professional career coach. Write a tailored cover letter for Joshua Abbey (Green Card holder, M.S. Technology Management/Data Science, B.S. Agricultural Science, Six Sigma Green Belt, Amazon Area Manager experience). Rules: 3 tight paragraphs, under 260 words, NO generic phrases. Start with "Dear Hiring Manager,"\n\nJOB: ${job.title} at ${job.company} | ${job.location} | ${job.salary_text}\n${job.description}\n\nWrite ONLY the cover letter.`,
          800
        )

        // Save application
        const { error: insertErr } = await supabase.from('applications').insert({
          job_id: job.id,
          status: 'applied',
          cover_letter: coverLetter || null,
          applied_at: new Date().toISOString(),
          authorized_to_work: true,
          requires_sponsorship: false,
          has_disability: false,
          is_veteran: false,
        })

        if (insertErr) {
          log.push(`  ✗ Save failed: ${insertErr.message}`)
        } else {
          applied++
          log.push(`  ✓ Application saved`)
        }
      } catch (e: any) {
        log.push(`  ✗ Error: ${e.message}`)
      }
    }

    log.push(`Done. ${applied} applications saved this run.`)

    return NextResponse.json({
      success: true,
      applied,
      total_jobs_found: jobs.length,
      new_jobs: newJobs.length,
      log,
    })
  } catch (error: any) {
    log.push(`Pipeline error: ${error.message}`)
    return NextResponse.json({ success: false, error: error.message, log }, { status: 500 })
  }
}
