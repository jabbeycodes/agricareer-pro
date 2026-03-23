import { Job, JobType } from '@/types'
import { scoreJob, detectIndustry } from './profile'

async function fetchAdzunaJobs(): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return []

  const jobs: Job[] = []
  const seen = new Set<string>()

  // Queries spanning all industries Josh qualifies for
  const queries = [
    // Operations & Management
    'operations manager',
    'program manager',
    'project manager',
    'area manager',
    'continuous improvement manager',
    'supply chain manager',
    // Data & Analytics
    'data analyst',
    'business intelligence analyst',
    'data science manager',
    // Agriculture & AgTech
    'agriculture manager',
    'agtech operations',
    'food systems technology',
    'precision agriculture',
    // Technology
    'technology manager',
    'product manager software',
    // Process / Six Sigma
    'six sigma',
    'process improvement manager',
  ]

  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        results_per_page: '10',
        what: query,
        content_type: 'application/json',
        sort_by: 'date',
      })
      const res = await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`, {
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) continue
      const data = await res.json()
      for (const item of data?.results || []) {
        const key = `${item.title}_${item.company?.display_name}`.toLowerCase().replace(/\W/g, '')
        if (seen.has(key)) continue
        seen.add(key)

        const salaryMin = item.salary_min || null
        const salaryMax = item.salary_max || null
        const loc = item.location?.display_name || 'USA'
        const description = item.description || item.title
        const isRemote = (item.title + ' ' + description + ' ' + loc).toLowerCase().includes('remote')

        const scores = scoreJob(item.title, item.company?.display_name || '', description, loc, salaryMin, salaryMax, isRemote ? 'Remote' : 'Onsite')
        if (scores.total < 55) continue

        const industries = detectIndustry(item.title, description)

        jobs.push({
          id: `adzuna_${item.id}`,
          title: item.title,
          company: item.company?.display_name || 'Unknown',
          location: isRemote ? 'Remote' : loc,
          salary_text: salaryMin ? `$${Math.round(salaryMin / 1000)}k – $${Math.round((salaryMax || salaryMin) / 1000)}k` : 'See posting',
          salary_min: salaryMin,
          salary_max: salaryMax,
          salary_mid: salaryMin && salaryMax ? (salaryMin + salaryMax) / 2 : null,
          type: isRemote ? 'Remote' : 'Onsite' as JobType,
          source: 'adzuna',
          source_id: String(item.id),
          posted_at: item.created || new Date().toISOString(),
          url: item.redirect_url || item.adref || 'https://adzuna.com',
          description: description,
          tags: [...industries, ...extractTags(item.title, description)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6),
          scores,
        })
      }
    } catch (e) {
      console.error('Adzuna error:', e)
    }
  }
  return jobs
}

async function fetchRemotiveJobs(): Promise<Job[]> {
  const jobs: Job[] = []
  // Fetch multiple relevant categories
  const categories = [
    'project-management',
    'data',
    'software-dev',
    'product',
    'all',
  ]

  for (const category of categories) {
    try {
      const res = await fetch(`https://remotive.com/api/remote-jobs?category=${category}&limit=30`, {
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) continue
      const data = await res.json()
      const seen = new Set<string>()

      for (const item of data?.jobs || []) {
        const key = `${item.title}_${item.company_name}`.toLowerCase().replace(/\W/g, '')
        if (seen.has(key)) continue
        seen.add(key)

        let salaryMin: number | null = null
        let salaryMax: number | null = null
        if (item.salary) {
          const nums = item.salary.match(/[\d,]+/g)?.map((n: string) => parseInt(n.replace(/,/g, ''))) || []
          if (nums.length >= 2) { salaryMin = nums[0]; salaryMax = nums[1] }
          else if (nums.length === 1) { salaryMin = nums[0]; salaryMax = nums[0] }
        }

        const rawDesc = (item.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

        const scores = scoreJob(item.title, item.company_name || '', rawDesc, 'Remote', salaryMin, salaryMax, 'Remote')
        if (scores.total < 55) continue

        const industries = detectIndustry(item.title, rawDesc)

        jobs.push({
          id: `remotive_${item.id}`,
          title: item.title,
          company: item.company_name || 'Unknown',
          location: 'Remote',
          salary_text: item.salary || 'See posting',
          salary_min: salaryMin,
          salary_max: salaryMax,
          salary_mid: salaryMin && salaryMax ? (salaryMin + salaryMax) / 2 : null,
          type: 'Remote',
          source: 'remotive',
          source_id: String(item.id),
          posted_at: item.publication_date || new Date().toISOString(),
          url: item.url || 'https://remotive.com',
          description: rawDesc,
          tags: [...industries, ...extractTags(item.title, rawDesc)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6),
          scores,
        })
      }
    } catch (e) {
      console.error('Remotive error:', e)
    }
  }

  // Deduplicate across categories
  const seen = new Set<string>()
  return jobs.filter(j => {
    const k = `${j.title}_${j.company}`.toLowerCase().replace(/\W/g, '')
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

async function fetchWithPerplexity(): Promise<Job[]> {
  const key = process.env.PERPLEXITY_API_KEY
  if (!key) return []

  // Diverse queries matching Josh's full resume
  const searches = [
    'remote operations manager jobs 2026 salary $90k+ six sigma lean',
    'remote program manager jobs 2026 salary $80k+ agile cross-functional',
    'remote data analyst business intelligence jobs 2026 python sql power bi',
    'remote agriculture technology manager jobs 2026',
    'remote supply chain manager continuous improvement jobs 2026',
    'remote product manager SaaS jobs 2026 salary $90k+',
    'remote project manager technology jobs 2026 salary $80k+',
    'process improvement manager remote OR Columbia Missouri 2026',
  ]
  const jobs: Job[] = []
  const seen = new Set<string>()
  for (const query of searches) {
    try {
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            { role: 'system', content: 'Find real open job postings (NOT federal/government jobs) and return ONLY a JSON array. Each object must have: title, company, location, salary_min (number|null), salary_max (number|null), type ("Remote"|"Hybrid"|"Onsite"), url (the actual application URL), description (full job description including duties, qualifications, and requirements — at least 200 words), source ("linkedin"|"indeed"|"adzuna"). Return [] if none. No markdown.' },
            { role: 'user', content: `Find 3-5 real open PRIVATE SECTOR jobs (no government/federal) with FULL descriptions: ${query}` },
          ],
          max_tokens: 4000, temperature: 0.1,
        }),
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) continue
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content || ''
      let parsed: any[] = []
      try {
        const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
        const match = cleaned.match(/\[[\s\S]*\]/)
        if (match) parsed = JSON.parse(match[0])
      } catch { continue }
      for (const item of parsed) {
        if (!item.title || !item.company) continue
        const key2 = `${item.title}_${item.company}`.toLowerCase().replace(/\W/g, '')
        if (seen.has(key2)) continue
        seen.add(key2)
        const description = item.description || item.title
        const scores = scoreJob(item.title, item.company, description, item.location || '', item.salary_min, item.salary_max, item.type || 'Onsite')
        if (scores.total < 55) continue
        const salaryMid = item.salary_min && item.salary_max ? (item.salary_min + item.salary_max) / 2 : item.salary_min || item.salary_max || null
        const industries = detectIndustry(item.title, description)
        jobs.push({
          id: `perplexity_${key2}_${Date.now()}`, title: item.title, company: item.company,
          location: item.location || 'USA',
          salary_text: item.salary_min ? `$${Math.round(item.salary_min / 1000)}k – $${Math.round((item.salary_max || item.salary_min) / 1000)}k` : 'See posting',
          salary_min: item.salary_min || null, salary_max: item.salary_max || null, salary_mid: salaryMid,
          type: (['Remote', 'Hybrid', 'Onsite'].includes(item.type) ? item.type : 'Onsite') as JobType,
          source: (['linkedin', 'indeed', 'adzuna'].includes(item.source) ? item.source : 'indeed') as any,
          source_id: key2, posted_at: new Date().toISOString(), url: item.url || '#',
          description: description,
          tags: [...industries, ...extractTags(item.title, description)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6),
          scores,
        })
      }
    } catch (e) { console.error('Perplexity error:', e) }
  }
  return jobs
}

export async function fetchAllJobs(): Promise<Job[]> {
  const [perplexity, adzuna, remotive] = await Promise.allSettled([
    fetchWithPerplexity(),
    fetchAdzunaJobs(),
    fetchRemotiveJobs(),
  ])

  const all = [
    ...(adzuna.status === 'fulfilled' ? adzuna.value : []),
    ...(remotive.status === 'fulfilled' ? remotive.value : []),
    ...(perplexity.status === 'fulfilled' ? perplexity.value : []),
  ]

  const sources = { adzuna: 0, remotive: 0, perplexity: 0 }
  if (adzuna.status === 'fulfilled') sources.adzuna = adzuna.value.length
  if (remotive.status === 'fulfilled') sources.remotive = remotive.value.length
  if (perplexity.status === 'fulfilled') sources.perplexity = perplexity.value.length
  console.log('Job sources:', sources, 'Total before dedup:', all.length)

  const seen = new Set<string>()
  return all.filter(j => {
    const k = `${j.title}_${j.company}`.toLowerCase().replace(/\W/g, '')
    if (seen.has(k)) return false
    seen.add(k)
    return true
  }).sort((a, b) => b.scores.total - a.scores.total)
}

function extractTags(title: string, desc: string): string[] {
  const text = `${title} ${desc}`.toLowerCase()
  const map: Record<string, string> = {
    'remote': 'Remote',
    'agtech': 'AgTech',
    'agriculture': 'Agriculture',
    'food system': 'Food Systems',
    'sustainab': 'Sustainability',
    'program manager': 'Program Mgmt',
    'project manager': 'Project Mgmt',
    'product manager': 'Product Mgmt',
    'operations': 'Operations',
    'supply chain': 'Supply Chain',
    'data analy': 'Data Analytics',
    'data scien': 'Data Science',
    'business intelligence': 'BI',
    'six sigma': 'Six Sigma',
    'lean': 'Lean',
    'agile': 'Agile',
    'python': 'Python',
    'sql': 'SQL',
    'power bi': 'Power BI',
    'software': 'Software',
    'react': 'React',
    'flutter': 'Flutter',
    'machine learning': 'ML',
    'columbia': 'Columbia MO',
    'manufacturing': 'Manufacturing',
    'logistics': 'Logistics',
    'saas': 'SaaS',
  }
  return Object.entries(map).filter(([k]) => text.includes(k)).map(([, v]) => v).slice(0, 6)
}
