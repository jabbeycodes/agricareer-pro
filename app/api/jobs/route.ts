import { NextResponse } from 'next/server'
import { fetchAllJobs } from '@/lib/jobFetcher'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const jobs = await fetchAllJobs()
    return NextResponse.json({
      jobs,
      count: jobs.length,
      live: true,
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ jobs: [], count: 0, live: false, error: 'Failed to fetch live jobs' })
  }
}
