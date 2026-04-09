import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, CheckCircle2, XCircle, Clock, Activity, ExternalLink, Rabbit } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { Sun, Moon } from 'lucide-react'

const SERVICES = [
  // Atomic
  { name: 'Tutor',                  url: 'http://localhost:5001/health', port: 5001, type: 'atomic' },
  { name: 'Student',                url: 'http://localhost:5002/health', port: 5002, type: 'atomic' },
  { name: 'Interest',               url: 'http://localhost:5003/health', port: 5003, type: 'atomic' },
  { name: 'Trials',                 url: 'http://localhost:5004/health', port: 5004, type: 'atomic' },
  { name: 'Payment',                url: 'http://localhost:5005/health', port: 5005, type: 'atomic' },
  { name: 'Notification',           url: 'http://localhost:5006/health', port: 5006, type: 'atomic' },
  { name: 'Credit',                 url: 'http://localhost:5007/health', port: 5007, type: 'atomic' },
  // Composite
  { name: 'Indicate Interest',      url: 'http://localhost:5010/health', port: 5010, type: 'composite' },
  { name: 'Get Interested Students',url: 'http://localhost:5011/health', port: 5011, type: 'composite' },
  { name: 'Accept Student',         url: 'http://localhost:5012/health', port: 5012, type: 'composite' },
  { name: 'Make Trial Booking',     url: 'http://localhost:5013/health', port: 5013, type: 'composite' },
  { name: 'Continue Lessons',       url: 'http://localhost:5014/health', port: 5014, type: 'composite' },
  { name: 'Cancel Trial Booking',   url: 'http://localhost:5015/health', port: 5015, type: 'composite' },
  { name: 'Cancel Trial Lessons',   url: 'http://localhost:5016/health', port: 5016, type: 'composite' },
]

const INFRA = [
  { name: 'Kong Gateway',   url: 'http://localhost:8000', label: ':8000', desc: 'API Gateway — all microservice traffic' },
  { name: 'Kong Admin UI',  url: 'http://localhost:8002', label: ':8002', desc: 'Manage routes, services, plugins' },
  { name: 'Prometheus',     url: 'http://localhost:9090', label: ':9090', desc: 'Metrics scraping & time-series storage' },
  { name: 'Grafana',        url: 'http://localhost:3000', label: ':3000', desc: 'Service health dashboards — admin / admin' },
  { name: 'RabbitMQ',       url: 'http://localhost:15672', label: ':15672', desc: 'Message queue management — guest / guest' },
]

async function probe(url) {
  const t0 = Date.now()
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    return { ok: res.ok || res.status < 500, ms: Date.now() - t0 }
  } catch {
    return { ok: false, ms: Date.now() - t0 }
  }
}

function StatusDot({ ok, checking }) {
  if (checking) return <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse inline-block" />
  return ok
    ? <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
    : <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
}

export default function Status() {
  const { dark, toggle } = useTheme()
  const [results, setResults]  = useState({})
  const [checking, setChecking] = useState(true)
  const [lastChecked, setLast]  = useState(null)

  const runChecks = useCallback(async () => {
    setChecking(true)
    const svcResults = await Promise.all(
      SERVICES.map(s => probe(s.url).then(r => [s.name, r]))
    )
    setResults(Object.fromEntries(svcResults))
    setLast(new Date())
    setChecking(false)
  }, [])

  useEffect(() => {
    runChecks()
    const id = setInterval(runChecks, 30000)
    return () => clearInterval(id)
  }, [runChecks])

  const up   = SERVICES.filter(s => results[s.name]?.ok).length
  const down = SERVICES.length - up
  const allOk = !checking && down === 0

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 dark:bg-slate-800 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-700 flex items-center justify-center">
              <span className="text-white text-[11px] font-black tracking-tight leading-none">TM</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight dark:text-white">TutorMatch</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 dark:text-slate-500">System Status</span>
            <button onClick={toggle} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Overall status banner */}
        <div className={`rounded-2xl p-5 mb-6 flex items-center gap-4 ${
          checking ? 'bg-slate-100 dark:bg-slate-800' :
          allOk    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700' :
                     'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
        }`}>
          {checking ? (
            <Activity className="h-6 w-6 text-slate-400 animate-pulse" />
          ) : allOk ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          ) : (
            <XCircle className="h-6 w-6 text-red-500" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              {checking ? 'Checking services…' : allOk ? 'All systems operational' : `${down} service${down > 1 ? 's' : ''} degraded`}
            </p>
            {lastChecked && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last checked {lastChecked.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                &nbsp;· auto-refreshes every 30s
              </p>
            )}
          </div>
          <div className="flex gap-4 text-center shrink-0">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{checking ? '–' : up}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Up</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{checking ? '–' : down}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Down</p>
            </div>
          </div>
          <button onClick={runChecks} disabled={checking}
            className="btn-secondary text-xs shrink-0">
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Microservices */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" /> Microservices
            </h2>

            {/* Atomic */}
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Atomic</p>
            <div className="card mb-4 divide-y divide-slate-100 dark:divide-slate-700">
              {SERVICES.filter(s => s.type === 'atomic').map(s => {
                const r = results[s.name]
                return (
                  <div key={s.name} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <StatusDot ok={r?.ok} checking={checking || !r} />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {r && <span>{r.ms}ms</span>}
                      <span className={`font-medium ${r?.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                        {checking || !r ? '…' : r.ok ? 'UP' : 'DOWN'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Composite */}
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Composite</p>
            <div className="card divide-y divide-slate-100 dark:divide-slate-700">
              {SERVICES.filter(s => s.type === 'composite').map(s => {
                const r = results[s.name]
                return (
                  <div key={s.name} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <StatusDot ok={r?.ok} checking={checking || !r} />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {r && <span>{r.ms}ms</span>}
                      <span className={`font-medium ${r?.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                        {checking || !r ? '…' : r.ok ? 'UP' : 'DOWN'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Infrastructure */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" /> Infrastructure
            </h2>
            <div className="card mb-4 divide-y divide-slate-100 dark:divide-slate-700">
              {INFRA.map(s => (
                <div key={s.name} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <span className="text-sm text-slate-700 dark:text-slate-200">{s.name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-1.5">{s.label}</span>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{s.desc}</p>
                  </div>
                  <a href={s.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-3">
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>

            {/* RabbitMQ card */}
            <div className="card p-5 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-700">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                  <Rabbit className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">RabbitMQ Management</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                    Monitor message queues, exchanges, and connections. Default credentials: <strong>guest / guest</strong>
                  </p>
                  <a href="http://localhost:15672" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 dark:text-orange-400 hover:underline">
                    Open RabbitMQ Dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Grafana shortcut */}
            <div className="card p-5 mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">Grafana Dashboards</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                    View service uptime, probe duration graphs, and historical health data. Login: <strong>admin / admin</strong>
                  </p>
                  <a href="http://localhost:3000" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline">
                    Open Grafana <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
