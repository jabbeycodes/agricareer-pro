import { Job, JobType } from '@/types'
import { scoreJob } from './profile'

async function fetchWithPerplexity(): Promise<Job[]> {
  const key = process.env.PERPLEXITY_API_KEY
  if (!key) return []
  const searches = [
    'remote agriculture program manager jobs 2026 salary 90000',
    'USDA agricultural program manager remote jobs 2026 usajobs.gov',
    'agtech operations manager remote jobs 2026 linkedin.com',
    'food systems technology manager remote 2026 cargill OR bayer',
    'precision agriculture data manager remote OR Columbia Missouri 2026',
    'sustainable agriculture project manager remote 2026',
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
            { role: 'system', content: 'Find real open job postings and return ONLY a JSON array. Each object: title, company, location, salary_min (number|null), salary_max (number|null), type ("Remote"|"Hybrid"|"Onsite"), url, description (2-3 sentences), source ("usajobs"|"linkedin"|"indeed"|"adzuna"). Return [] if none. No markdown.' },
            { role: 'user', content: `Find 3-5 real open jobs: ${query}` },
          ],
          max_tokens: 2000, temperature: 0.1,
        }),
        signal: AbortSignal.timeout(15000),
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
        const scores = scoreJob(item.title, item.company, item.description || '', item.location || '', item.salary_min, item.salary_max, item.type || 'Onsite')
        if (scores.total < 62) continue
        const salaryMid = item.salary_min && item.salary_max ? (item.salary_min + item.salary_max) / 2 : item.salary_min || item.salary_max || null
        jobs.push({
          id: `perplexity_${key2}_${Date.now()}`, title: item.title, company: item.company,
          location: item.location || 'USA',
          salary_text: item.salary_min ? `$${Math.round(item.salary_min / 1000)}k – $${Math.round((item.salary_max || item.salary_min) / 1000)}k` : 'See posting',
          salary_min: item.salary_min || null, salary_max: item.salary_max || null, salary_mid: salaryMid,
          type: (['Remote', 'Hybrid', 'Onsite'].includes(item.type) ? item.type : 'Onsite') as JobType,
          source: (['usajobs', 'linkedin', 'indeed', 'adzuna'].includes(item.source) ? item.source : 'indeed') as any,
          source_id: key2, posted_at: new Date().toISOString(), url: item.url || 'https://usajobs.gov',
          description: (item.description || item.title).slice(0, 700),
          tags: extractTags(item.title, item.description || ''), scores,
        })
      }
    } catch (e) { console.error('Perplexity error:', e) }
  }
  return jobs
}

async function fetchUSAJobs(): Promise<Job[]> {
  const jobs: Job[] = []
  const seen = new Set<string>()
  for (const query of ['agricultural program manager', 'agtech operations', 'rural development', 'food systems']) {
    try {
      const params = new URLSearchParams({ Keyword: query, ResultsPerPage: '8', SortField: 'DatePosted' })
      const res = await fetch(`https://data.usajobs.gov/api/search?${params}`, {
        headers: { 'Host': 'data.usajobs.gov', 'User-Agent': process.env.USAJOBS_EMAIL || 'jaanertey@gmail.com', 'Authorization-Key': process.env.USAJOBS_API_KEY || '' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) continue
      const data = await res.json()
      for (const item of data?.SearchResult?.SearchResultItems || []) {
        const j = item.MatchedObjectDescriptor
        if (seen.has(j.PositionID)) continue
        seen.add(j.PositionID)
        const pay = j.PositionRemuneration?.[0]
        const salaryMin = pay ? parseFloat(pay.MinimumRange) : null
        const salaryMax = pay ? parseFloat(pay.MaximumRange) : null
        const loc = j.PositionLocation?.[0]?.LocationName || 'USA'
        const isRemote = j.PositionOfferingType?.some((t: any) => t.Name?.toLowerCase().includes('remote'))
        const scores = scoreJob(j.PositionTitle, j.OrganizationName, j.QualificationSummary || '', loc, salaryMin, salaryMax, isRemote ? 'Remote' : 'Onsite')
        if (scores.total < 62) continue
        jobs.push({
          id: `usajobs_${j.PositionID}`, title: j.PositionTitle, company: j.OrganizationName,
          location: isRemote ? 'Remote' : loc,
          salary_text: salaryMin ? `$${Math.round(salaryMin / 1000)}k – $${Math.round((salaryMax || salaryMin) / 1000)}k` : 'See posting',
          salary_min: salaryMin, salary_max: salaryMax, salary_mid: salaryMin && salaryMax ? (salaryMin + salaryMax) / 2 : null,
          type: isRemote ? 'Remote' : 'Onsite', source: 'usajobs', source_id: j.PositionID,
          posted_at: j.PublicationStartDate || new Date().toISOString(), url: j.ApplyURI?.[0] || j.PositionURI,
          description: (j.QualificationSummary || j.PositionTitle).slice(0, 600),
          tags: extractTags(j.PositionTitle, j.QualificationSummary || ''), scores,
        })
      }
    } catch {}
  }
  return jobs
}

export async function fetchAllJobs(): Promise<Job[]> {
  const [perplexity, usajobs] = await Promise.allSettled([fetchWithPerplexity(), fetchUSAJobs()])
  const all = [...(perplexity.status === 'fulfilled' ? perplexity.value : []), ...(usajobs.status === 'fulfilled' ? usajobs.value : [])]
  const seen = new Set<string>()
  return all.filter(j => { const k = `${j.title}_${j.company}`.toLowerCase().replace(/\W/g, ''); if (seen.has(k)) return false; seen.add(k); return true }).sort((a, b) => b.scores.total - a.scores.total)
}

function extractTags(title: string, desc: string): string[] {
  const text = `${title} ${desc}`.toLowerCase()
  const map: Record<string, string> = { 'remote': 'Remote', 'usda': 'USDA', 'federal': 'Federal', 'agtech': 'AgTech', 'agriculture': 'Agriculture', 'food system': 'Food Systems', 'rural': 'Rural Dev', 'sustainab': 'Sustainability', 'program manager': 'Program Mgmt', 'operations': 'Operations', 'columbia': 'Columbia MO' }
  return Object.entries(map).filter(([k]) => text.includes(k)).map(([, v]) => v).slice(0, 5)
}
