import { JobScores } from '@/types'

export const PROFILE = {
  name: 'Joshua Anertey Abbey',
  location: 'Columbia, MO',
  email: 'jaanertey@gmail.com',
  phone: '(336) 457-2361',
  linkedin: 'linkedin.com/in/josh-abbey',
  github: 'github.com/jabbeycodes',
  eeo: {
    authorized_to_work: true,
    requires_sponsorship: false,
    has_disability: false,
    is_veteran: false,
    protected_veteran: false,
  },
  education: [
    { degree: 'M.S. Technology Management — Data Science', school: 'NC A&T State University', gpa: '3.7/4.0', year: '2020' },
    { degree: 'B.S. Agricultural Science & Technology', school: 'University of Ghana', gpa: '3.24/4.0', year: '2017' },
  ],
  experience: [
    {
      title: 'Degreed Professional Manager', org: 'Lifepath of Mid-Missouri LLC', dates: 'Jun 2024–Present',
      highlights: [
        'Direct operational oversight for 10 residential homes across multi-site environment',
        'Supervise 6 House Managers and 20+ frontline staff with performance evaluations',
        'Led compliance audits, incident investigations, and corrective action planning',
        'Implemented data-driven shift handover processes reducing communication gaps',
        'Workforce planning for 24/7 operations balancing coverage and labor costs',
      ],
    },
    {
      title: 'Area Manager', org: 'Amazon', dates: 'Feb 2021–2022',
      highlights: [
        'Led 50–200 associates in high-volume fulfillment center operations',
        'Drove continuous improvement using Six Sigma and Lean methodologies',
        'Managed performance through daily coaching and development plans',
        'Executed labor planning during standard and peak season operations',
      ],
    },
  ],
  certifications: ['Six Sigma Green Belt'],
  skills: {
    languages: ['JavaScript', 'TypeScript', 'Python', 'SQL', 'R', 'Dart'],
    frameworks: ['Flutter', 'React', 'Next.js', 'Node.js', 'Supabase'],
    data: ['Power BI', 'Tableau', 'Excel', 'Statistical Modeling'],
    management: ['Agile/Scrum', 'Six Sigma Green Belt', 'Lean', 'KPI Tracking', 'Workforce Planning', 'Compliance'],
  },
}

const WEIGHTS = { field: 0.30, salary: 0.25, location: 0.20, experience: 0.15, education: 0.10 }

const AG_KEYWORDS = ['agricultur', 'agtech', 'agri', 'farm', 'crop', 'precision farm', 'food system', 'rural', 'livestock', 'sustainab', 'conservation', 'extension', 'soil', 'usda', 'commodity', 'irrigation', 'horticultur', 'forestry', 'harvest', 'grain', 'dairy', 'watershed']
const TECH_KEYWORDS = ['program manager', 'project manager', 'operations manager', 'product manager', 'technology manager', 'data manager', 'process improvement', 'six sigma', 'lean', 'kpi', 'cross-functional']

export function scoreJob(title: string, company: string, description: string, location: string, salaryMin: number | null, salaryMax: number | null, jobType: string): JobScores {
  const text = `${title} ${company} ${description}`.toLowerCase()

  const agMatches = AG_KEYWORDS.filter(k => text.includes(k)).length
  const techMatches = TECH_KEYWORDS.filter(k => text.includes(k)).length
  const fieldScore = Math.min(100, Math.round((agMatches / AG_KEYWORDS.length) * 70 * 1.8 + (techMatches / TECH_KEYWORDS.length) * 30 * 2) + (agMatches > 0 ? 20 : 0))

  const salaryMid = salaryMin && salaryMax ? (salaryMin + salaryMax) / 2 : salaryMin ?? salaryMax ?? 0
  let salaryScore = 50
  if (salaryMid >= 100000) salaryScore = 100
  else if (salaryMid >= 90000) salaryScore = 90
  else if (salaryMid >= 80000) salaryScore = 80
  else if (salaryMid >= 75000) salaryScore = 70
  else if (salaryMid >= 70000) salaryScore = 55
  else if (salaryMid > 0) salaryScore = 30

  const loc = location.toLowerCase()
  const isRemote = jobType === 'Remote' || loc.includes('remote')
  const isColumbia = loc.includes('columbia') && loc.includes('mo')
  let locationScore = 40
  if (isRemote) locationScore = 100
  else if (isColumbia) locationScore = salaryMid >= 75000 ? 95 : 60
  else if (loc.includes('missouri')) locationScore = salaryMid >= 80000 ? 80 : 45
  else if (salaryMid >= 80000) locationScore = 70
  else locationScore = 30

  const expKeywords = ['manager', 'director', 'lead', 'supervisor', 'coordinator', 'operations', 'program', 'workforce', 'compliance']
  const expScore = Math.min(100, 40 + expKeywords.filter(k => text.includes(k)).length * 8)

  const eduKeywords = ['agricultural', 'agriculture', 'technology management', 'data science', 'bachelor', 'master', 'degree']
  const eduScore = Math.min(100, 50 + eduKeywords.filter(k => text.includes(k)).length * 10)

  const total = Math.round(fieldScore * WEIGHTS.field + salaryScore * WEIGHTS.salary + locationScore * WEIGHTS.location + expScore * WEIGHTS.experience + eduScore * WEIGHTS.education)

  return { field: Math.min(100, fieldScore), salary: salaryScore, location: locationScore, experience: Math.min(100, expScore), education: Math.min(100, eduScore), total }
}

export function getResumeText(): string {
  return `Joshua Anertey Abbey | Columbia, MO | jaanertey@gmail.com | (336) 457-2361

EDUCATION
• M.S. Technology Management (Data Science) — NC A&T State University, GPA 3.7/4.0, Dec 2020
• B.S. Agricultural Science & Technology — University of Ghana, GPA 3.24/4.0, Dec 2017

EXPERIENCE
Degreed Professional Manager | Lifepath of Mid-Missouri | Jun 2024–Present
• Direct 10 residential homes with 26+ staff across multi-site 24/7 operations
• Led compliance audits, corrective action planning, and workforce development
• Implemented data-driven workflows improving shift continuity across all sites

Area Manager | Amazon | Feb 2021–2022
• Led 50–200 associates in high-volume fulfillment operations
• Drove Six Sigma/Lean continuous improvement reducing cycle times
• Executed peak season workforce scaling from baseline to surge capacity

CERTIFICATIONS: Six Sigma Green Belt

SKILLS: Python, SQL, R, Power BI, Tableau, Flutter, React, Supabase, Agile/Scrum, Workforce Planning, Compliance, KPI Tracking

PROJECTS: ShowMe (Flutter + Supabase + Stripe), ShowMe Content Studio (AI content generation)`
}
