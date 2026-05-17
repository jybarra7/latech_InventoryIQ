import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
      { product_id: 41, product_name: 'Item 41', alert_type: 'Demand Decline', severity: 1.5, metric: 'Sales of 18 is 1.5 std devs below 90-day mean of 30.2' },
      { product_id: 15, product_name: 'Item 15', alert_type: 'Sales Anomaly',  severity: 2.1, metric: 'Sales of 58 is 2.1 std devs above 90-day mean of 31.2' },
      { product_id: 28, product_name: 'Item 28', alert_type: 'Sales Anomaly',  severity: 1.9, metric: 'Sales of 52 is 1.9 std devs above 90-day mean of 29.8' },
    ],
    total: 5
  },

  forecastData: {
    method: 'lightgbm_global_lag',
    future_days: 30,
    forecast_records: [
      { date: '2018-01-01', store: 1, item: 1, actual: 42.0, prediction: 44.2 },
      { date: '2018-01-02', store: 1, item: 1, actual: 38.0, prediction: 40.1 },
      { date: '2018-01-03', store: 1, item: 1, actual: 45.0, prediction: 43.8 },
      { date: '2018-01-04', store: 1, item: 1, actual: null, prediction: 46.5 },
      { date: '2018-01-05', store: 1, item: 1, actual: null, prediction: 48.2 },
    ]
  },

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

function DashboardPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [horizon, setHorizon] = useState('Next 90 days')
  const [selectedStore, setSelectedStore] = useState('All Stores')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const data = mockData

  return (
    <div className="db">

      {/* ── Sidebar ── */}
      <aside className="db-sidebar">
        <div className="db-sidebar-logo">
          <img src="/logo.webp" alt="InventoryIQ" className="db-logo" onClick={() => navigate('/')} />
        </div>

        <div className="db-sidebar-section">
          <p className="db-sidebar-label">Menu</p>
          <nav className="db-nav">
            {[
              { id: 'overview', icon: '📊', label: 'Overview' },
              { id: 'products', icon: '🏆', label: 'Products' },
              { id: 'analysis', icon: '📈', label: 'Analysis' },
            ].map(item => (
              <button
                key={item.id}
                className={`db-nav-btn ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {activeTab === item.id && <span className="db-nav-pip" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="db-sidebar-section">
          <p className="db-sidebar-label">Filters</p>
          <div className="db-filter">
            <label>Horizon</label>
            <select value={horizon} onChange={e => setHorizon(e.target.value)}>
              <option>Next 30 days</option>
              <option>Next 90 days</option>
              <option>Next 6 months</option>
              <option>Next 12 months</option>
            </select>
          </div>
          <div className="db-filter">
            <label>Store</label>
            <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)}>
              <option>All Stores</option>
              {data.stores.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="db-filter">
            <label>Category</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
              <option>All Categories</option>
              {data.categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button className="db-reset" onClick={() => {
            setHorizon('Next 90 days')
            setSelectedStore('All Stores')
            setSelectedCategory('All Categories')
          }}>↺ Reset Filters</button>
        </div>

        <div className="db-sidebar-bottom">
          <p className="db-sidebar-label">Data Source</p>
          <div className="db-file-chip">
            <span>📄</span>
            <span className="db-file-name">{data.fileName}</span>
          </div>
          <button className="db-new-file" onClick={() => navigate('/upload')}>
            + Upload New File
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="db-main">
        <header className="db-header">
          <div>
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
          <button className="db-ai-btn">✦ Generate AI Summary</button>
        </header>

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
  const { kpis, alertsData } = data
  const alerts = alertsData.alerts
  const bad  = alerts.filter(a => a.metric.includes('below'))
  const good = alerts.filter(a => a.metric.includes('above'))
  const aiHeadline = `Sales are ${kpis.forecast_direction} — model accuracy MAE ${kpis.mae}. ${bad.length} products need your attention.`

  return (
    <div className="tab">

      {/* AI Banner */}
      <div className="ai-banner">
        <div className="ai-banner-left">
          <span className="ai-banner-icon">✦</span>
          <div>
            <p className="ai-banner-label">AI Insight</p>
            <p className="ai-banner-text">{aiHeadline}</p>
          </div>
        </div>
        <button className="ai-banner-btn">Generate Full Summary</button>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">

        <div className="kpi-hero">
          <div className="kpi-hero-circle" />
          <div className="kpi-hero-circle2" />
          <p className="kpi-hero-label">Total Revenue</p>
          <p className="kpi-hero-value">{fmt(kpis.total_sales)}</p>
          <p className="kpi-hero-sub">All stores combined</p>
          <div className="kpi-hero-badge" style={{textTransform: 'capitalize'}}>▲ {kpis.forecast_direction}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <p className="kpi-card-label">Sales Trend</p>
            <div className="kpi-card-icon-wrap kpi-icon-blue">📈</div>
          </div>
          <p className="kpi-card-value" style={{textTransform: 'capitalize'}}>{kpis.forecast_direction}</p>
          <p className="kpi-card-delta delta-up">▲ Trending up</p>
          <p className="kpi-card-period">based on LightGBM forecast</p>
        </div>

        <div className="kpi-card kpi-card-alert">
          <div className="kpi-card-header">
            <p className="kpi-card-label">Active Alerts</p>
            <div className="kpi-card-icon-wrap kpi-icon-red">🚨</div>
          </div>
          <p className="kpi-card-value">{alertsData.total}</p>
          <p className="kpi-card-delta delta-down">⚠ {bad.length} need attention</p>
          <p className="kpi-card-period">vs previous 30 days</p>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <p className="kpi-card-label">Model Accuracy</p>
            <div className="kpi-card-icon-wrap kpi-icon-navy">🎯</div>
          </div>
          <p className="kpi-card-value">MAE {kpis.mae}</p>
          <p className="kpi-card-delta delta-neutral">{kpis.winner_model}</p>
          <p className="kpi-card-period">winning forecast model</p>
        </div>

      </div>

      {/* Alert pills */}
      <div className="alert-strip">
        <span className="alert-strip-label">Live Alerts</span>
        <div className="alert-pills">
          {bad.map((a, i) => (
            <span key={i} className="pill pill-red">📉 {a.product_name} · {a.alert_type}</span>
          ))}
          {good.map((a, i) => (
            <span key={i} className="pill pill-blue">📈 {a.product_name} · {a.alert_type}</span>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="bottom-row">
        <div className="card card-forecast">
          <div className="card-header">
            <div>
              <p className="card-title">Sales Forecast</p>
              <p className="card-sub">Historical performance vs projected growth</p>
            </div>
            <div className="card-legend">
              <span><span className="dot dot-navy" />Historical</span>
              <span><span className="dot dot-blue" />Projected</span>
            </div>
          </div>
          <div className="chart-zone">
            📈 Recharts forecast chart — Mira wires in here
          </div>
        </div>

        <div className="card card-alerts">
          <div className="card-header">
            <div>
              <p className="card-title">Alert Center</p>
              <p className="card-sub">{alertsData.total} active alerts</p>
            </div>
            <span className="badge-red">{alertsData.total} Active</span>
          </div>
          <div className="alert-list">
            {alerts.map((a, i) => {
              const isUp = a.metric.includes('above')
              return (
                <div key={i} className={`alert-row alert-${isUp ? 'up' : 'down'}`}>
                  <span className="alert-emoji">{isUp ? '📈' : '📉'}</span>
                  <div>
                    <p className="alert-name">{a.product_name}</p>
                    <p className="alert-detail">{a.alert_type} · severity {a.severity}</p>
                    <p className="alert-metric">{a.metric}</p>
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
        <div className="card">
          <div className="card-header card-header-blue">
            <div>
              <p className="card-title">Top Performers</p>
              <p className="card-sub">Products driving the most revenue</p>
            </div>
          </div>
          {data.topProducts.map((row, i) => (
            <div key={i} className="product-row">
              <div className="product-left">
                <span className="rank rank-blue">{i + 1}</span>
                <span className="product-name">{row.product}</span>
              </div>
              <span className="product-val val-blue">{fmt(row.total_sales)}</span>
            </div>
          ))}
          <div className="card-foot" />
        </div>

        <div className="card">
          <div className="card-header card-header-red">
            <div>
              <p className="card-title">Underperformers</p>
              <p className="card-sub">Products generating the least revenue</p>
            </div>
          </div>
          {data.bottomProducts.map((row, i) => (
            <div key={i} className="product-row">
              <div className="product-left">
                <span className="rank rank-red">{i + 1}</span>
                <span className="product-name">{row.product}</span>
              </div>
              <span className="product-val val-red">{fmt(row.total_sales)}</span>
            </div>
          ))}
          <div className="card-foot" />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <p className="card-title">Top 10 Products by Revenue</p>
            <p className="card-sub">Your highest earning products across all stores</p>
          </div>
        </div>
        <div className="chart-zone chart-tall">
          📊 Recharts horizontal bar chart — Mira wires in here
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <div>
              <p className="card-title">Top 5 Product Trends</p>
              <p className="card-sub">Growing or declining month over month?</p>
            </div>
          </div>
          <div className="chart-zone chart-tall">
            📈 Recharts line chart — Mira wires in here
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <p className="card-title">Month-over-Month</p>
              <p className="card-sub">Biggest movers vs last month</p>
            </div>
          </div>
          <div className="chart-zone chart-tall">
            📊 MoM leaderboard — Mira wires in here
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ANALYSIS ──────────────────────────────────────────────────────────────────
function AnalysisTab() {
  return (
    <div className="tab">
      <div className="card">
        <div className="card-header">
          <div>
            <p className="card-title">Category Revenue Trends</p>
            <p className="card-sub">Monthly revenue per category — see which are growing or declining</p>
          </div>
        </div>
        <div className="chart-zone chart-tall">
          📈 Recharts category trend lines — Mira wires in here
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div>
            <p className="card-title">Store Comparison</p>
            <p className="card-sub">Total revenue by store for selected filters</p>
          </div>
        </div>
        <div className="chart-zone chart-tall">
          📊 Recharts store bar chart — Mira wires in here
        </div>
      </div>
    </div>
  )
}

export default DashboardPage