import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { job, tailored_resume, cover_letter } = body

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job data required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Upsert the job first (so we have it on record)
    await supabase.from('jobs').upsert({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      salary_text: job.salary_text,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      salary_mid: job.salary_mid,
      type: job.type,
      source: job.source,
      source_id: job.source_id,
      posted_at: job.posted_at,
      url: job.url,
      description: job.description,
      tags: job.tags,
      scores: job.scores,
    }, { onConflict: 'id' })

    // Save the application
    const { data, error } = await supabase.from('applications').insert({
      job_id: job.id,
      status: 'applied',
      cover_letter: cover_letter || null,
      applied_at: new Date().toISOString(),
      authorized_to_work: true,
      requires_sponsorship: false,
      has_disability: false,
      is_veteran: false,
    }).select().single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      application: data,
      message: `Application saved for ${job.title} at ${job.company}`,
    })
  } catch (error) {
    console.error('Error preparing application:', error)
    return NextResponse.json({ success: false, error: 'Failed to prepare application' }, { status: 400 })
  }
}
