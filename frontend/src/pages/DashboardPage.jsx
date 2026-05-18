import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './DashboardPage.css'

const mockData = {
  fileName: 'retail_clean.csv',
  kpis: {
    total_sales: 47704512.0,
    forecast_direction: 'increasing',
    winner_model: 'lightgbm_global_lag',
    mae: 5.882,
  },
  alertsData: {
    alerts: [
      { product_id: 5,  product_name: 'Item 5',  alert_type: 'Sales Anomaly',  severity: 2.4, metric: 'Sales of 12 is 2.4 std devs below 90-day mean of 35.1' },
      { product_id: 1,  product_name: 'Item 1',  alert_type: 'Demand Decline', severity: 1.8, metric: 'Sales of 15 is 1.8 std devs below 90-day mean of 28.4' },
      { product_id: 41, product_name: 'Item 41', alert_type: 'Demand Decline', severity: 1.6, metric: 'Sales of 18 is 1.5 std devs below 90-day mean of 30.2' },
      { product_id: 15, product_name: 'Item 15', alert_type: 'Sales Anomaly',  severity: 2.1, metric: 'Sales of 58 is 2.1 std devs above 90-day mean of 31.2' },
      { product_id: 28, product_name: 'Item 28', alert_type: 'Sales Anomaly',  severity: 1.9, metric: 'Sales of 52 is 1.9 std devs above 90-day mean of 29.8' },
    ],
    total: 5
  },
  forecastChart: [
    { month: 'Aug', value: 3200 },
    { month: 'Sep', value: 2900 },
    { month: 'Oct', value: 3100 },
    { month: 'Nov', value: 2800 },
    { month: 'Dec', value: 3400 },
    { month: 'Jan', value: 3600 },
    { month: 'Feb', value: 3500 },
    { month: 'Mar', value: 3800 },
    { month: 'Apr', value: 4100, projected: true },
    { month: 'May', value: 4400, projected: true },
    { month: 'Jun', value: 4700, projected: true },
  ],
  topProducts: [
    { product: 'Item 15', total_sales: 1607442 },
    { product: 'Item 28', total_sales: 1604713 },
    { product: 'Item 13', total_sales: 1539621 },
    { product: 'Item 18', total_sales: 1538876 },
    { product: 'Item 25', total_sales: 1473334 },
  ],
  bottomProducts: [
    { product: 'Item 5',  total_sales: 335230 },
    { product: 'Item 1',  total_sales: 401384 },
    { product: 'Item 41', total_sales: 401759 },
    { product: 'Item 47', total_sales: 401781 },
    { product: 'Item 4',  total_sales: 401907 },
  ],
  categories: ['Electronics', 'Food', 'Clothing', 'Home'],
  stores: ['Store 1', 'Store 2', 'Store 3', 'Store 4', 'Store 5'],
}

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

const NAV_ITEMS = [
  { id: 'overview', icon: '📊' },
  { id: 'products', icon: '🏆' },
  { id: 'analysis', icon: '📈' },
]

function DashboardPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [horizon, setHorizon] = useState('Next 90 days')
  const [selectedStore, setSelectedStore] = useState('All Stores')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const data = mockData

  return (
    <div className="db">

      {/* ── Icon rail sidebar ── */}
      <aside className="db-rail">
        <div className="db-rail-logo" onClick={() => navigate('/')}>
          <span className="db-rail-logo-text">IQ</span>
        </div>
        <nav className="db-rail-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`db-rail-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={item.id.charAt(0).toUpperCase() + item.id.slice(1)}
            >
              {item.icon}
            </button>
          ))}
        </nav>
        <div className="db-rail-bottom">
          <button className="db-rail-btn" onClick={() => navigate('/upload')} title="Upload New File">⬆</button>
          <button className="db-rail-btn" title="Settings">⚙</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="db-main">

        {/* Header */}
        <header className="db-header">
          <div className="db-header-left">
            <h1 className="db-header-title">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'products' && 'Products'}
              {activeTab === 'analysis' && 'Analysis'}
            </h1>
            <p className="db-header-sub">
              {activeTab === 'overview' && 'Your retail performance at a glance'}
              {activeTab === 'products' && 'Top and bottom performing products'}
              {activeTab === 'analysis' && 'Category trends and store performance'}
            </p>
          </div>
          <div className="db-header-right">
            <select className="db-filter-pill" value={selectedStore} onChange={e => setSelectedStore(e.target.value)}>
              <option>All Stores</option>
              {data.stores.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="db-filter-pill" value={horizon} onChange={e => setHorizon(e.target.value)}>
              <option>Next 90 days</option>
              <option>Next 30 days</option>
              <option>Next 6 months</option>
            </select>
            <select className="db-filter-pill" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
              <option>All Categories</option>
              {data.categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <button className="db-ai-btn">✦ AI Summary</button>
          </div>
        </header>

        {/* Content */}
        <div className="db-content">
          {activeTab === 'overview' && <OverviewTab data={data} />}
          {activeTab === 'products' && <ProductsTab data={data} />}
          {activeTab === 'analysis' && <AnalysisTab />}
        </div>

      </div>
    </div>
  )
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function OverviewTab({ data }) {
  const { kpis, alertsData, forecastChart } = data
  const alerts = alertsData.alerts
  const bad = alerts.filter(a => a.metric.includes('below'))

  return (
    <div className="tab">

      {/* AI Insight */}
      <div className="ai-insight">
        <span className="ai-insight-icon">✦</span>
        <span className="ai-insight-label">AI INSIGHT</span>
        <span className="ai-insight-text">
          Sales are {kpis.forecast_direction} — model accuracy MAE {kpis.mae}. {bad.length} products need your attention.
        </span>
        <button className="ai-insight-btn">Full Summary</button>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-hero">
          <div className="kpi-hero-bg" />
          <p className="kpi-hero-label">Total Revenue</p>
          <p className="kpi-hero-value">{fmt(kpis.total_sales)}</p>
          <div className="kpi-hero-badge" style={{textTransform:'capitalize'}}>▲ {kpis.forecast_direction}</div>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Sales Trend</p>
          <p className="kpi-value" style={{textTransform:'capitalize'}}>{kpis.forecast_direction}</p>
          <p className="kpi-delta kpi-up">▲ Trending up</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Active Alerts</p>
          <p className="kpi-value">{alertsData.total}</p>
          <p className="kpi-delta kpi-down">{bad.length} need attention</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Model Accuracy</p>
          <p className="kpi-value">MAE {kpis.mae}</p>
          <p className="kpi-delta kpi-neutral">Best model</p>
        </div>
      </div>

      {/* Bottom row */}
      <div className="bottom-row">

        {/* Forecast chart */}
        <div className="panel">
          <p className="panel-title">Sales Forecast</p>
          <p className="panel-sub">Historical performance vs projected growth</p>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={forecastChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8aaac8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8aaac8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #dce3ed', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#1e3a5f', fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#64B5F6"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (payload.projected) return null
                    return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#64B5F6" strokeWidth={0} />
                  }}
                  activeDot={{ r: 6, fill: '#1e3a5f' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alert list */}
        <div className="panel">
          <div className="panel-header-row">
            <div>
              <p className="panel-title">Alert Center</p>
              <p className="panel-sub">{alertsData.total} active alerts</p>
            </div>
            <span className="badge-red">{alertsData.total} Active</span>
          </div>
          <div className="alert-list">
            {alerts.map((a, i) => {
              const isUp = a.metric.includes('above')
              const severityColor = a.severity >= 2 ? '#ef4444' : '#f59e0b'
              return (
                <div key={i} className="alert-row" style={{ borderLeftColor: severityColor }}>
                  <div>
                    <p className="alert-name">{a.product_name} · {a.alert_type}</p>
                    <p className="alert-detail">Severity {a.severity}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
function ProductsTab({ data }) {
  return (
    <div className="tab">
      <div className="two-col">
        <div className="panel">
          <p className="panel-title">Top Performers</p>
          <p className="panel-sub">Products driving the most revenue</p>
          <div style={{marginTop: '1rem'}}>
            {data.topProducts.map((row, i) => (
              <div key={i} className="product-row">
                <div className="product-left">
                  <span className="rank rank-blue">{i + 1}</span>
                  <span className="product-name">{row.product}</span>
                </div>
                <span className="product-val val-blue">{fmt(row.total_sales)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <p className="panel-title">Underperformers</p>
          <p className="panel-sub">Products generating the least revenue</p>
          <div style={{marginTop: '1rem'}}>
            {data.bottomProducts.map((row, i) => (
              <div key={i} className="product-row">
                <div className="product-left">
                  <span className="rank rank-red">{i + 1}</span>
                  <span className="product-name">{row.product}</span>
                </div>
                <span className="product-val val-red">{fmt(row.total_sales)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="panel">
        <p className="panel-title">Top 10 Products by Revenue</p>
        <p className="panel-sub">Your highest earning products</p>
        <div className="chart-zone chart-tall">📊 Recharts bar chart — Mira wires in here</div>
      </div>
      <div className="two-col">
        <div className="panel">
          <p className="panel-title">Top 5 Product Trends</p>
          <p className="panel-sub">Growing or declining month over month?</p>
          <div className="chart-zone chart-tall">📈 Recharts line chart — Mira wires in here</div>
        </div>
        <div className="panel">
          <p className="panel-title">Month-over-Month</p>
          <p className="panel-sub">Biggest movers vs last month</p>
          <div className="chart-zone chart-tall">📊 MoM leaderboard — Mira wires in here</div>
        </div>
      </div>
    </div>
  )
}

// ── ANALYSIS ──────────────────────────────────────────────────────────────────
function AnalysisTab() {
  return (
    <div className="tab">
      <div className="panel">
        <p className="panel-title">Category Revenue Trends</p>
        <p className="panel-sub">Monthly revenue per category</p>
        <div className="chart-zone chart-tall">📈 Recharts category trends — Mira wires in here</div>
      </div>
      <div className="panel">
        <p className="panel-title">Store Comparison</p>
        <p className="panel-sub">Total revenue by store</p>
        <div className="chart-zone chart-tall">📊 Recharts store bar chart — Mira wires in here</div>
      </div>
    </div>
  )
}

export default DashboardPage