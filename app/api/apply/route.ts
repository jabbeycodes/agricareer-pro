import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { job, tailored_resume, cover_letter } = body

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job data required' }, { status: 400 })
    }

    // Build the application package
    const applicationPackage = {
      job_id: job.id,
      job_title: job.title,
      company: job.company,
      job_url: job.url,
      tailored_resume: tailored_resume || null,
      cover_letter: cover_letter || null,
      applied_at: new Date().toISOString(),
      status: 'prepared',
    }

    // TODO: When Supabase is connected, persist applications:
    // await supabase.from('applications').insert(applicationPackage)

    return NextResponse.json({
      success: true,
      application: applicationPackage,
      message: `Application package ready for ${job.title} at ${job.company}`,
    })
  } catch (error) {
    console.error('Error preparing application:', error)
    return NextResponse.json({ success: false, error: 'Failed to prepare application' }, { status: 400 })
  }
}
