import { NextRequest, NextResponse } from 'next/server'
import { getResumeText, PROFILE } from '@/lib/profile'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { job } = await req.json()
  const prompt = `You are a professional career coach specializing in agriculture and technology management.
Write a tailored cover letter. Rules:
- 3 tight paragraphs: (1) Strong hook connecting candidate's ag+tech background to THIS role, (2) 2 concrete achievements most relevant to this job, (3) Forward-looking close
- Under 260 words
- NO generic phrases like "I am excited to apply" — be specific
- Start with "Dear Hiring Manager,"
- End with full contact info

RESUME:
${getResumeText()}

JOB: ${job.title} at ${job.company} | ${job.location} | ${job.type} | ${job.salary_text}
${job.description}

Write ONLY the cover letter.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
    })
    const data = await res.json()
    return NextResponse.json({ letter: data?.content?.[0]?.text || fallback(job) })
  } catch {
    return NextResponse.json({ letter: fallback(job) })
  }
}

function fallback(job: any) {
  return `Dear Hiring Manager,

My background sits at the exact intersection the ${job.title} role at ${job.company} demands — a B.S. in Agricultural Science & Technology from the University of Ghana, combined with an M.S. in Technology Management (Data Science) from NC A&T, and four-plus years managing multi-site operations and teams up to 200 people while applying Six Sigma methodology to drive measurable improvement.

At Lifepath of Mid-Missouri I currently direct 10 service locations — building compliance frameworks, analytics dashboards, and standardised workflows operating 24/7. At Amazon I scaled workforce operations from baseline to peak-season surge capacity across 50–200 associates. Both roles demanded the cross-functional leadership, data fluency, and operational discipline ${job.company} is looking for.${job.type === 'Remote' ? ' I am fully equipped for remote collaboration with a consistent record of delivering results across distributed operations.' : ''}

I would welcome the opportunity to bring this combination of agricultural expertise and technology management to your team.

Sincerely,
${PROFILE.name}
${PROFILE.location} | ${PROFILE.phone} | ${PROFILE.email}`
}
