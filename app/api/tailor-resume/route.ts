import { NextRequest, NextResponse } from 'next/server'
import { tailorResume } from '@/lib/resumeTailor'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { job } = await req.json()
  const resume = await tailorResume(job)
  return NextResponse.json({ resume })
}
