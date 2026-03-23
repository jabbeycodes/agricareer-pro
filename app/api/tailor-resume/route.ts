import { NextRequest, NextResponse } from 'next/server'
import { getResumeText, PROFILE } from '@/lib/profile'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { job } = await req.json()

  const prompt = `You are an expert resume writer specializing in ATS-optimized resumes for agriculture and technology management roles.

TASK: Tailor this resume specifically for the job below. Return ONLY the tailored resume text — no commentary.

RULES:
- Keep all factual information accurate — do NOT fabricate experiences, dates, or companies
- Reorder bullet points to prioritize the most relevant experience for THIS specific role
- Reword bullet points to naturally incorporate keywords from the job description (for ATS matching)
- Add a 2-line Professional Summary at the top tailored to this specific role
- If the job mentions specific skills the candidate has (Six Sigma, Python, SQL, Power BI, etc.), make them prominent
- Keep it to 1 page worth of content (roughly 400-500 words)
- Use clean formatting: NAME, PROFESSIONAL SUMMARY, EXPERIENCE, EDUCATION, CERTIFICATIONS, SKILLS sections
- Immigration status: ${PROFILE.immigration_status} — authorized to work, no sponsorship needed

BASE RESUME:
${getResumeText()}

TARGET JOB: ${job.title} at ${job.company} | ${job.location} | ${job.type} | ${job.salary_text}
JOB DESCRIPTION:
${job.description}

Return ONLY the tailored resume text.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    const resume = data?.content?.[0]?.text || fallbackResume(job)
    return NextResponse.json({ resume })
  } catch {
    return NextResponse.json({ resume: fallbackResume(job) })
  }
}

function fallbackResume(job: any) {
  return `JOSHUA ANERTEY ABBEY
Columbia, MO | (336) 457-2361 | jaanertey@gmail.com | linkedin.com/in/josh-abbey

PROFESSIONAL SUMMARY
Results-driven Agriculture & Technology Management professional with an M.S. in Technology Management (Data Science) and B.S. in Agricultural Science. Proven track record managing multi-site operations, leading cross-functional teams of 200+, and driving continuous improvement through Six Sigma methodology — seeking to bring this expertise to the ${job.title} role at ${job.company}.

EXPERIENCE

Degreed Professional Manager | Lifepath of Mid-Missouri LLC | Jun 2024–Present
• Direct operational oversight for 10 residential homes across multi-site 24/7 environment
• Supervise 6 House Managers and 20+ frontline staff with performance evaluations and development
• Led compliance audits, incident investigations, and corrective action planning
• Implemented data-driven shift handover processes reducing communication gaps by 40%
• Workforce planning for 24/7 operations balancing coverage, quality, and labor costs

Area Manager | Amazon | Feb 2021–2022
• Led 50–200 associates in high-volume fulfillment center operations
• Drove continuous improvement using Six Sigma and Lean methodologies reducing cycle times
• Managed performance through daily coaching, development plans, and KPI tracking
• Executed labor planning during standard and peak season operations scaling to surge capacity

EDUCATION
M.S. Technology Management (Data Science) — NC A&T State University, GPA 3.7/4.0, Dec 2020
B.S. Agricultural Science & Technology — University of Ghana, GPA 3.24/4.0, Dec 2017

CERTIFICATIONS: Six Sigma Green Belt

SKILLS: Python, SQL, R, Power BI, Tableau, Flutter, React, Supabase, Agile/Scrum, Workforce Planning, Compliance, KPI Tracking

WORK AUTHORIZATION: U.S. Permanent Resident (Green Card) — No sponsorship required`
}
