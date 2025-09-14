import React, { useMemo, useState, useEffect, Fragment } from 'react'
import Papa from 'papaparse'

// Detect if running inside an iframe (e.g., Notion) or via ?embed=1
const isEmbed = (() => {
  try {
    const inIframe = typeof window !== 'undefined' && window.self !== window.top
    const qp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    return inIframe || (qp?.get('embed') === '1')
  } catch { return false }
})()

const ROLES: Record<string, { name: string; class: string }> = {
  UL: { name: 'Unlocker', class: 'bg-sky-100 text-sky-900 border-sky-300' },
  GR: { name: 'Grind', class: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  SU: { name: 'Support', class: 'bg-amber-100 text-amber-900 border-amber-300' },
  RW: { name: 'Reward', class: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300' },
  CH: { name: 'Challenge', class: 'bg-rose-100 text-rose-900 border-rose-300' },
  CD: { name: 'Cool-down', class: 'bg-slate-100 text-slate-900 border-slate-300' },
}

type GridDomain = {
  key: string; label: string; colorClass: string; headerClass: string; initials: string;
  stages: Record<string, { name: string; role: keyof typeof ROLES }[]>
}

const GRID: GridDomain[] = [
  { key: 'red', label: 'Language & Literacy', colorClass:'bg-red-50 border-red-200', headerClass:'bg-red-100 text-red-900 border-red-300', initials:'R',
    stages: { 'Stage 0–1 (2–4 yrs)': [{name:'Vocabulary',role:'GR'},{name:'Storytime',role:'UL'}],
              'Stage 2–3 (4–5 yrs)': [{name:'Echo Reading',role:'GR'},{name:'Word Building',role:'GR'}],
              'Stage 4+ (5+ yrs)': [{name:'Story Builder',role:'RW'},{name:'Writing Prompts',role:'CH'}] } },
  { key: 'blue', label: 'Exploration & Science', colorClass:'bg-blue-50 border-blue-200', headerClass:'bg-blue-100 text-blue-900 border-blue-300', initials:'B',
    stages: { 'Stage 0–1 (2–4 yrs)': [{name:'Identify Colors',role:'GR'},{name:'Animals',role:'GR'}],
              'Stage 2–3 (4–5 yrs)': [{name:'Scavenger Hunts',role:'GR'},{name:'Object Naming',role:'GR'}],
              'Stage 4+ (5+ yrs)': [{name:'Science Magnifier',role:'GR'},{name:'Explore Camera',role:'GR'}] } },
  { key: 'green', label: 'Logic & Critical Thinking', colorClass:'bg-green-50 border-green-200', headerClass:'bg-green-100 text-green-900 border-green-300', initials:'G',
    stages: { 'Stage 0–1 (2–4 yrs)': [{name:'Sorting',role:'GR'},{name:'Counting',role:'GR'}],
              'Stage 2–3 (4–5 yrs)': [{name:'Puzzles',role:'GR'},{name:'Pattern Recognition',role:'GR'}],
              'Stage 4+ (5+ yrs)': [{name:'Problem Solving',role:'CH'},{name:'Critical Thinking Prompts',role:'CH'}] } },
  { key: 'yellow', label: 'Physical / Motor Skills', colorClass:'bg-yellow-50 border-yellow-200', headerClass:'bg-yellow-100 text-yellow-900 border-yellow-300', initials:'Y',
    stages: { 'Stage 0–1 (2–4 yrs)': [{name:'Tap to Respond',role:'GR'},{name:'Gesture Mimicry',role:'CD'}],
              'Stage 2–3 (4–5 yrs)': [{name:'Drag & Drop',role:'GR'},{name:'Drawing Shapes',role:'CD'}],
              'Stage 4+ (5+ yrs)': [{name:'Movement Challenges',role:'CH'},{name:'Real-world Coordination',role:'CH'}] } },
  { key: 'purple', label: 'Creativity & Imagination', colorClass:'bg-purple-50 border-purple-200', headerClass:'bg-purple-100 text-purple-900 border-purple-300', initials:'P',
    stages: { 'Stage 0–1 (2–4 yrs)': [{name:'Simple Art Prompts',role:'RW'},{name:'Singing',role:'RW'}],
              'Stage 2–3 (4–5 yrs)': [{name:'Creative Play',role:'RW'},{name:'Simple Story Builder',role:'RW'}],
              'Stage 4+ (5+ yrs)': [{name:'Open Inquiry',role:'RW'},{name:'Project Mode',role:'RW'}] } },
  { key: 'orange', label: 'Social & Emotional Learning', colorClass:'bg-orange-50 border-orange-200', headerClass:'bg-orange-100 text-orange-900 border-orange-300', initials:'H',
    stages: { 'Stage 0–1 (2–4 yrs)': [{name:'Emotions Recognition',role:'SU'}],
              'Stage 2–3 (4–5 yrs)': [{name:'Empathy Games',role:'SU'},{name:'Perspective-taking',role:'SU'}],
              'Stage 4+ (5+ yrs)': [{name:'Conflict Resolution',role:'SU'},{name:'Social Scenarios',role:'SU'}] } },
]

const PATTERNS = [
  { id:'R-Y-G-P', steps:['red','yellow','green','purple'], label:['R','Y','G','P'] },
  { id:'Y-Y-G-H-P', steps:['yellow','yellow','green','orange','purple'], label:['Y','Y','G','H','P'] },
  { id:'R-Y-H-Y-G-P', steps:['red','yellow','orange','yellow','green','purple'], label:['R','Y','H','Y','G','P'] },
]

const PatternLabel = ({ parts }: { parts: string[] }) => (
  <span>{parts.map((p,i)=>(<Fragment key={i}>{i>0&&<span>&nbsp;&gt;&nbsp;</span>}<span>{p}</span></Fragment>))}</span>
)

export default function QuestMapper(){
  const [stageFilter,setStageFilter] = useState(new Set(['Stage 0–1 (2–4 yrs)','Stage 2–3 (4–5 yrs)','Stage 4+ (5+ yrs)']))
  const [roleFilter,setRoleFilter] = useState(new Set(Object.keys(ROLES)))
  const [activePattern,setActivePattern] = useState(PATTERNS[0].id)
  const activeSteps = useMemo(()=>PATTERNS.find(p=>p.id===activePattern)?.steps||[],[activePattern])

  const toggleSet=(s:Set<string>,v:string)=>{const n=new Set(s); n.has(v)?n.delete(v):n.add(v); return n}

  const sortedDomains = useMemo(()=>{
    const inP:GridDomain[]=[]; const other:GridDomain[]=[]
    GRID.forEach(d=>activeSteps.includes(d.key)?inP.push(d):other.push(d))
    inP.sort((a,b)=>activeSteps.indexOf(a.key)-activeSteps.indexOf(b.key))
    return [...inP,...other]
  },[activeSteps])

  return (
    <div className={`min-h-screen ${isEmbed?'p-3':'p-6'} text-slate-900`}>
      {!isEmbed && <h1 className="text-2xl font-bold mb-2">Trustin Jr. Quest Mapper</h1>}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="p-3 border rounded-xl bg-white shadow-sm border-slate-200">
          <div className="font-semibold mb-2">Stage Filter</div>
          {Object.keys(GRID[0].stages).map(s=>(
            <label key={s} className="flex items-center gap-2 mr-3 mb-2">
              <input type="checkbox" checked={stageFilter.has(s)} onChange={()=>setStageFilter(toggleSet(stageFilter,s))}/>
              <span className="text-sm">{s}</span>
            </label>
          ))}
        </div>

        <div className="p-3 border rounded-xl bg-white shadow-sm border-slate-200">
          <div className="font-semibold mb-2">Role Filter</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROLES).map(([code,meta])=>(
              <button key={code} onClick={()=>setRoleFilter(toggleSet(roleFilter as Set<string>,code))}
                className={`text-xs px-2 py-1 border rounded-full ${ (roleFilter as Set<string>).has(code) ? meta.class : 'bg-white text-slate-500 border-slate-300' }`}>
                {code} — {meta.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border rounded-xl bg-white shadow-sm border-slate-200">
          <div className="font-semibold mb-2">Highlight Quest Pattern</div>
          <div className="flex flex-wrap gap-2">
            {PATTERNS.map(p=>(
              <button key={p.id} onClick={()=>setActivePattern(p.id)} className={`text-xs px-2 py-1 border rounded-lg ${activePattern===p.id?'bg-black text-white border-black':'bg-white'}`}>
                <PatternLabel parts={p.label}/>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {sortedDomains.map(domain=>{
          const stepIndex = activeSteps.map((k,i)=>k===domain.key?i:-1).filter(i=>i!==-1)
          const notInPattern = stepIndex.length===0
          return (
            <div key={domain.key} className={`border rounded-xl overflow-hidden ${notInPattern?'opacity-80':''}`}>
              <div className={`flex items-center justify-between px-3 py-2 border ${domain.headerClass} rounded-lg`}>
                <div className="font-medium">{domain.label}</div>
                {notInPattern?(
                  <div className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">Not in selected pattern</div>
                ):(
                  <div className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/10">
                    {stepIndex.length===1?`Step ${stepIndex[0]+1}`:`Steps ${stepIndex.map(i=>i+1).join(', ')}`}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-0 ring-2 ring-black/5">
                {Object.entries(domain.stages).map(([stage,items])=>(
                  <div key={stage} className={`p-3 border-t md:border-l ${domain.colorClass} ${ (stageFilter as Set<string>).has(stage)?'':'opacity-40' }`}>
                    <div className="text-xs font-semibold mb-2">{stage}</div>
                    <div className="flex flex-wrap">
                      {(items as any[]).filter(a=>(roleFilter as Set<string>).has((a as any).role)).map((a:any,idx:number)=>(
                        <div key={idx} className="inline-flex items-center px-2 py-1 mr-2 mb-2 border rounded-xl bg-white">
                          <span className="text-xs mr-1">{a.name}</span>
                          <span className={`inline-block text-[10px] px-2 py-0.5 border rounded-full ml-1 ${(ROLES as any)[a.role].class}`}>{a.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 text-xs text-slate-500">
        Tip: Append <b>?embed=1</b> to the URL for tighter Notion embed padding.
      </div>
    </div>
  )
}
