'use client'
import { useState, useEffect, useCallback } from 'react'
import { Job } from '@/types'

const SCORE_COLOR = (s: number) => s >= 80 ? '#34C97A' : s >= 65 ? '#E8B355' : '#666058'
const SOURCE_STYLE: Record<string, { bg: string; color: string }> = {
  usajobs: { bg: 'rgba(91,158,240,0.12)', color: '#5B9EF0' },
  adzuna:  { bg: 'rgba(232,179,85,0.12)',  color: '#E8B355' },
  linkedin:{ bg: 'rgba(52,201,122,0.12)',  color: '#34C97A' },
  indeed:  { bg: 'rgba(224,82,82,0.12)',   color: '#E05252' },
}
type ViewType = 'feed' | 'applied' | 'profile' | 'rules'
type FilterType = 'all' | 'high' | 'remote' | 'local' | 'new'

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = size / 2 - 4, circ = 2 * Math.PI * r, fill = (score / 100) * circ, color = SCORE_COLOR(score)
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#222" strokeWidth="2.5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <span style={{ fontFamily: 'Syne', fontSize: size === 52 ? 13 : 11, fontWeight: 800, color, position: 'relative' }}>{score}</span>
    </div>
  )
}

function Toast({ msg }: { msg: { icon: string; title: string; sub: string } | null }) {
  if (!msg) return null
  return (
    <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 999, minWidth: 240, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.7)', animation: 'fadeUp 0.25s ease' }}>
      <span style={{ fontSize: 18 }}>{msg.icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#EEEBE4' }}>{msg.title}</div>
        <div style={{ fontSize: 11, color: '#666058', marginTop: 2 }}>{msg.sub}</div>
      </div>
    </div>
  )
}

function BottomNav({ view, setView, appliedCount, jobCount }: { view: ViewType; setView: (v: ViewType) => void; appliedCount: number; jobCount: number }) {
  const tabs: { id: ViewType; icon: string; label: string; badge?: number }[] = [
    { id: 'feed', icon: '⚡', label: 'Jobs', badge: jobCount },
    { id: 'applied', icon: '✅', label: 'Applied', badge: appliedCount },
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'rules', icon: '⚙️', label: 'Rules' },
  ]
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: '#101010', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setView(t.id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative', color: view === t.id ? '#E8B355' : '#555', transition: 'color 0.15s' }}>
          {t.badge != null && t.badge > 0 && <span style={{ position: 'absolute', top: 6, right: '50%', transform: 'translateX(8px)', background: t.id === 'applied' ? '#E8B355' : '#34C97A', color: '#000', borderRadius: 999, fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono', padding: '1px 5px', lineHeight: '14px' }}>{t.badge > 99 ? '99+' : t.badge}</span>}
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px' }}>{t.label}</span>
          {view === t.id && <span style={{ position: 'absolute', bottom: 0, left: '25%', right: '25%', height: 2, background: '#E8B355', borderRadius: 999 }} />}
        </button>
      ))}
    </nav>
  )
}

function JobCard({ job, isApplied, onApply, onSkip, onOpen, index }: { job: Job; isApplied: boolean; onApply: () => void; onSkip: () => void; onOpen: () => void; index: number }) {
  const sc = job.scores.total
  const src = SOURCE_STYLE[job.source] || SOURCE_STYLE.indeed
  const postedDate = new Date(job.posted_at)
  const posted = new Date().toDateString() === postedDate.toDateString() ? 'Today' : Math.floor((Date.now() - postedDate.getTime()) / 86400000) + 'd ago'
  return (
    <div onClick={onOpen} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${SCORE_COLOR(sc)}`, borderRadius: 12, padding: '14px 14px 12px', cursor: 'pointer', opacity: isApplied ? 0.45 : 1, animation: `rise 0.3s ease ${index * 0.04}s both`, WebkitTapHighlightColor: 'transparent' }}>
      <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: '#E8B355' }}>{job.company[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#EEEBE4', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
          <div style={{ fontSize: 11, color: '#666058' }}>{job.company}</div>
        </div>
        <ScoreRing score={sc} size={48} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', padding: '2px 7px', borderRadius: 4, background: 'rgba(52,201,122,0.1)', color: '#34C97A', border: '1px solid rgba(52,201,122,0.2)' }}>💰 {job.salary_text}</span>
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', padding: '2px 7px', borderRadius: 4, background: job.type === 'Remote' ? 'rgba(232,179,85,0.1)' : 'rgba(91,158,240,0.1)', color: job.type === 'Remote' ? '#E8B355' : '#5B9EF0', border: `1px solid ${job.type === 'Remote' ? 'rgba(232,179,85,0.2)' : 'rgba(91,158,240,0.2)'}` }}>{job.type === 'Remote' ? '🌐 Remote' : job.type === 'Hybrid' ? '🔀 Hybrid' : '📍 ' + (job.location.length > 18 ? job.location.slice(0, 15) + '…' : job.location)}</span>
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', padding: '2px 7px', borderRadius: 4, background: '#1A1A1A', color: '#666058', border: '1px solid #222' }}>{posted}</span>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.5px', textTransform: 'uppercase', ...src }}>{job.source}</span>
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 11 }} onClick={e => e.stopPropagation()}>
        {isApplied ? (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 6, background: 'rgba(52,201,122,0.1)', color: '#34C97A', border: '1px solid rgba(52,201,122,0.25)', letterSpacing: 1 }}>✓ APPLIED</span>
        ) : (
          <>
            <button onClick={onSkip} style={{ flex: 1, padding: '8px 0', borderRadius: 7, background: '#1A1A1A', border: '1px solid #222', color: '#666058', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Instrument Sans' }}>Skip</button>
            <button onClick={onOpen} style={{ flex: 1, padding: '8px 0', borderRadius: 7, background: '#1A1A1A', border: '1px solid rgba(232,179,85,0.3)', color: '#E8B355', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Instrument Sans' }}>Details</button>
            <button onClick={onApply} style={{ flex: 2, padding: '8px 0', borderRadius: 7, background: '#34C97A', border: 'none', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Instrument Sans' }}>⚡ Apply</button>
          </>
        )}
      </div>
    </div>
  )
}

function DetailSheet({ job, isApplied, onApply, onClose }: { job: Job | null; isApplied: boolean; onApply: () => void; onClose: () => void }) {
  const [letter, setLetter] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!job) return
    setLetter(''); setLoading(true)
    fetch('/api/cover-letter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job }) })
      .then(r => r.json()).then(d => { setLetter(d.letter || ''); setLoading(false) }).catch(() => setLoading(false))
  }, [job?.id])
  if (!job) return null
  const sc = job.scores.total
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: '#111', borderRadius: '18px 18px 0 0', border: '1px solid rgba(255,255,255,0.09)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.28s cubic-bezier(0.34,1.1,0.64,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}><div style={{ width: 36, height: 4, borderRadius: 999, background: '#333' }} /></div>
        <div style={{ padding: '12px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 700, marginBottom: 3, color: '#EEEBE4' }}>{job.title}</div>
              <div style={{ fontSize: 12, color: '#666058' }}>{job.company} · {job.location}</div>
            </div>
            <ScoreRing score={sc} size={52} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', paddingBottom: 100 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
            {[{ k: 'Salary', v: job.salary_text, col: '#34C97A' }, { k: 'Type', v: job.type, col: '#E8B355' }, { k: 'Source', v: job.source.toUpperCase(), col: '#5B9EF0' }, { k: 'Score', v: `${sc}/100`, col: SCORE_COLOR(sc) }].map(x => (
              <div key={x.k} style={{ background: '#1A1A1A', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>{x.k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: x.col }}>{x.v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#E8B355', marginBottom: 10 }}>Match Breakdown</div>
            {[{ l: 'Field Match', v: job.scores.field }, { l: 'Salary Fit', v: job.scores.salary }, { l: 'Location', v: job.scores.location }, { l: 'Experience', v: job.scores.experience }, { l: 'Education', v: job.scores.education }].map(r => (
              <div key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#666058', width: 80, flexShrink: 0 }}>{r.l}</div>
                <div style={{ flex: 1, height: 4, background: '#1E1E1E', borderRadius: 999, overflow: 'hidden' }}><div style={{ height: '100%', width: `${r.v}%`, background: SCORE_COLOR(r.v), borderRadius: 999 }} /></div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#555', width: 24, textAlign: 'right' }}>{r.v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#E8B355', marginBottom: 10 }}>Description</div>
            <div style={{ fontSize: 13, color: '#7A7570', lineHeight: 1.75 }}>{job.description}</div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#E8B355', marginBottom: 10 }}>AI Cover Letter</div>
            <div style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px', fontSize: 12.5, lineHeight: 1.8, color: '#7A7570', whiteSpace: 'pre-wrap' }}>
              {loading ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#555', padding: '8px 0' }}><div style={{ width: 14, height: 14, border: '2px solid #222', borderTopColor: '#E8B355', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />Generating with Claude AI…</div> : letter}
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', background: '#111', display: 'flex', gap: 8 }}>
          <button onClick={() => window.open(job.url, '_blank')} style={{ flex: 1, padding: '12px 0', borderRadius: 8, background: '#1A1A1A', border: '1px solid rgba(232,179,85,0.3)', color: '#E8B355', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Instrument Sans' }}>🔗 View Post</button>
          {isApplied ? <div style={{ flex: 2, padding: '12px 0', borderRadius: 8, background: 'rgba(52,201,122,0.1)', color: '#34C97A', fontSize: 13, fontWeight: 700, textAlign: 'center', border: '1px solid rgba(52,201,122,0.25)' }}>✓ Applied</div>
            : <button onClick={() => { onApply(); onClose() }} style={{ flex: 2, padding: '12px 0', borderRadius: 8, background: '#34C97A', border: 'none', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Instrument Sans' }}>⚡ Apply Now</button>}
        </div>
      </div>
    </>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}><div style={{ fontFamily: 'Syne', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#E8B355', marginBottom: 10 }}>{title}</div>{children}</div>
}

export default function Dashboard() {
  const [view, setView] = useState<ViewType>('feed')
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [toast, setToast] = useState<{ icon: string; title: string; sub: string } | null>(null)

  const showToast = useCallback((icon: string, title: string, sub: string) => {
    setToast({ icon, title, sub }); setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true)
    showToast('🔍', 'Scanning Job Boards', 'USAJOBS · Perplexity · LinkedIn…')
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      setAllJobs(data.jobs || [])
      showToast('✅', `${data.count} Jobs Found`, 'Ranked by AI match score')
    } catch { showToast('⚠️', 'Using demo data', '') }
    finally { setLoadingJobs(false) }
  }, [showToast])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const doApply = useCallback(async (job: Job) => {
    setApplied(prev => new Set([...prev, job.id]))
    showToast('⚡', 'Application Sent!', `${job.title} @ ${job.company}`)
    fetch('/api/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: job.id }) }).catch(() => {})
  }, [showToast])

  const filteredJobs = allJobs.filter(j => {
    if (skipped.has(j.id)) return false
    if (filter === 'high') return j.scores.total >= 80
    if (filter === 'remote') return j.type === 'Remote'
    if (filter === 'local') return j.location.toLowerCase().includes('columbia')
    if (filter === 'new') return new Date().toDateString() === new Date(j.posted_at).toDateString()
    return true
  }).filter(j => !search || [j.title, j.company, j.location].some(s => s.toLowerCase().includes(search.toLowerCase())))

  const topCount = allJobs.filter(j => j.scores.total >= 80).length
  const avgSalary = allJobs.filter(j => j.salary_mid).length ? Math.round(allJobs.filter(j => j.salary_mid).reduce((a, j) => a + (j.salary_mid || 0), 0) / allJobs.filter(j => j.salary_mid).length / 1000) : 0

  const bulkApply = useCallback(() => {
    const top = filteredJobs.filter(j => j.scores.total >= 80 && !applied.has(j.id))
    if (!top.length) { showToast('ℹ️', 'All top matches applied', ''); return }
    setApplied(prev => new Set([...prev, ...top.map(j => j.id)]))
    showToast('🚀', `Applied to ${top.length} jobs`, 'Score ≥ 80 — all submitted')
    top.forEach(j => fetch('/api/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: j.id }) }).catch(() => {}))
  }, [filteredJobs, applied, showToast])

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#080808;color:#EEEBE4;font-family:'Instrument Sans',sans-serif}
        @keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shim{0%{background-position:200% 0}100%{background-position:-200% 0}}
        input::placeholder{color:#444}
        ::-webkit-scrollbar{display:none}
        button:active{opacity:0.8;transform:scale(0.98)}
      `}</style>
      <div style={{ minHeight: '100vh', background: '#080808', paddingBottom: 64 }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: 'calc(14px + env(safe-area-inset-top)) 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, background: 'linear-gradient(135deg, #E8B355, #C9933A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AgriCareer Pro</div>
              <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase', marginTop: 1 }}>{view === 'feed' ? 'Job Feed' : view === 'applied' ? 'Applications' : view === 'profile' ? 'My Profile' : 'Score Rules'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#444', background: '#111', border: '1px solid #1E1E1E', padding: '5px 10px', borderRadius: 6 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34C97A' }} />Live
              </div>
              <button onClick={fetchJobs} style={{ padding: '7px 12px', borderRadius: 7, background: '#111', border: '1px solid rgba(255,255,255,0.07)', color: '#7A7570', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Instrument Sans' }}>🔄</button>
            </div>
          </div>
        </div>

        {/* Feed View */}
        {view === 'feed' && (
          <div style={{ padding: '14px 14px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[{ label: 'Jobs Found', val: allJobs.length, color: '#E8B355' }, { label: 'Top Match', val: topCount, color: '#34C97A' }, { label: 'Applied', val: applied.size, color: '#5B9EF0' }, { label: 'Avg Salary', val: avgSalary ? `$${avgSalary}k` : '—', color: '#E8B355' }].map(s => (
                <div key={s.label} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: '#555', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 32, color: s.color, lineHeight: 1 }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#151515', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '9px 13px', marginBottom: 10 }}>
              <span style={{ color: '#444', fontSize: 14 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, company, location…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#EEEBE4', fontSize: 13, fontFamily: 'Instrument Sans' }} />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 16 }}>✕</button>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {(['all', 'high', 'remote', 'local', 'new'] as FilterType[]).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 13px', borderRadius: 6, border: `1px solid ${filter === f ? 'rgba(232,179,85,0.4)' : 'rgba(255,255,255,0.07)'}`, background: filter === f ? 'rgba(232,179,85,0.12)' : '#111', color: filter === f ? '#E8B355' : '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Instrument Sans' }}>
                  {f === 'all' ? 'All' : f === 'high' ? '⭐ Top Match' : f === 'remote' ? '🌐 Remote' : f === 'local' ? '📍 Columbia' : '🆕 Today'}
                </button>
              ))}
            </div>
            {topCount > 0 && applied.size < topCount && (
              <button onClick={bulkApply} style={{ width: '100%', padding: '13px', borderRadius: 10, marginBottom: 14, background: 'linear-gradient(135deg, #E8B355, #C9933A)', border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Instrument Sans' }}>
                ⚡ Apply to All Top Matches ({topCount - applied.size} remaining)
              </button>
            )}
            {loadingJobs ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: 130, borderRadius: 12, background: 'linear-gradient(90deg, #151515 25%, #1E1E1E 50%, #151515 75%)', backgroundSize: '200% 100%', animation: `shim 1.3s infinite ${i*0.15}s` }} />)}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌾</div>
                <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 700, color: '#666', marginBottom: 6 }}>No Jobs Found</div>
                <div style={{ fontSize: 13 }}>Try a different filter or tap Refresh</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingBottom: 16 }}>
                {filteredJobs.map((job, i) => <JobCard key={job.id} job={job} index={i} isApplied={applied.has(job.id)} onApply={() => doApply(job)} onSkip={() => setSkipped(prev => new Set([...prev, job.id]))} onOpen={() => setSelectedJob(job)} />)}
              </div>
            )}
          </div>
        )}

        {/* Applied View */}
        {view === 'applied' && (
          <div style={{ padding: '14px 14px 0' }}>
            <div style={{ background: 'rgba(52,201,122,0.08)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 36, color: '#34C97A', lineHeight: 1 }}>{applied.size}</div>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>Applications Sent</div><div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>this session</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingBottom: 16 }}>
              {allJobs.filter(j => applied.has(j.id)).map((job, i) => <JobCard key={job.id} job={job} index={i} isApplied onApply={() => {}} onSkip={() => {}} onOpen={() => setSelectedJob(job)} />)}
            </div>
          </div>
        )}

        {/* Profile View */}
        {view === 'profile' && (
          <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(232,179,85,0.1), rgba(52,201,122,0.05))', border: '1px solid rgba(232,179,85,0.2)', borderRadius: 14, padding: '18px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #E8B355, #1A7A43)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: '#000', flexShrink: 0 }}>JA</div>
                <div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: '#EEEBE4' }}>Joshua Anertey Abbey</div>
                  <div style={{ fontSize: 12, color: '#E8B355', marginTop: 2 }}>AgTech Program Manager</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Columbia, MO · jaanertey@gmail.com</div>
                </div>
              </div>
            </div>
            <SectionCard title="EEO Pre-Filled">
              {[['Authorized to work in USA', '✅ Yes'], ['Requires sponsorship', '❌ No'], ['Disability', '❌ No'], ['Protected veteran', '❌ No']].map(([q, a]) => (
                <div key={q} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 13, color: '#7A7570' }}>{q}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a}</span>
                </div>
              ))}
            </SectionCard>
            <SectionCard title="Education">
              {[['M.S. Technology Management — Data Science', 'NC A&T State University · 3.7 GPA · 2020'], ['B.S. Agricultural Science & Technology', 'University of Ghana · 3.24 GPA · 2017']].map(([d, s]) => (
                <div key={d} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#EEEBE4', marginBottom: 2 }}>{d}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{s}</div>
                </div>
              ))}
            </SectionCard>
            <SectionCard title="Key Skills">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
                {['Six Sigma Green Belt', 'Python', 'SQL', 'R', 'Flutter', 'React', 'Supabase', 'Power BI', 'Agile/Scrum', 'Workforce Planning', 'Compliance', 'KPI Tracking'].map(s => (
                  <span key={s} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, background: '#1A1A1A', color: '#7A7570', border: '1px solid #222', fontFamily: 'JetBrains Mono' }}>{s}</span>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* Rules View */}
        {view === 'rules' && (
          <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}>
            <SectionCard title="Auto-Apply Rules">
              {[['#34C97A','⭐','Remote + Agriculture/Tech','Score 85–100 → Auto-queue'], ['#E8B355','📍','Columbia MO + $75k+','Score 75+ → Auto-queue'], ['#E8B355','✈️','Relocate + $80k+','Score 70+ → Auto-queue'], ['#555','⚠️','Onsite below $75k','Score <65 → Flagged'], ['#E05252','🚫','No ag/tech overlap','Filtered out']].map(([c,i,r,a]) => (
                <div key={r} style={{ padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: `3px solid ${c}`, paddingLeft: 10, marginLeft: -2 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#EEEBE4' }}>{i} {r}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{a}</div>
                </div>
              ))}
            </SectionCard>
            <SectionCard title="Score Weights">
              {[['Field / Industry Match', 30], ['Salary Fit', 25], ['Location Fit', 20], ['Experience Match', 15], ['Education Match', 10]].map(([l, w]) => (
                <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 12, color: '#7A7570', width: 130, flexShrink: 0 }}>{l}</div>
                  <div style={{ flex: 1, height: 4, background: '#1E1E1E', borderRadius: 999, overflow: 'hidden' }}><div style={{ height: '100%', width: `${(w as number) * 3}%`, background: '#E8B355', borderRadius: 999 }} /></div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#E8B355', width: 28, textAlign: 'right' }}>{w}%</div>
                </div>
              ))}
            </SectionCard>
          </div>
        )}
      </div>

      <BottomNav view={view} setView={setView} appliedCount={applied.size} jobCount={allJobs.length} />
      <DetailSheet job={selectedJob} isApplied={selectedJob ? applied.has(selectedJob.id) : false} onApply={() => selectedJob && doApply(selectedJob)} onClose={() => setSelectedJob(null)} />
      <Toast msg={toast} />
    </>
  )
}
