import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './DashboardPage.css'

const mockData = {
  fileName: 'retail_clean.csv',
  aiHeadline: 'Sales are up 8.3% overall, but 3 products need your attention — Item 5 dropped 18% last week.',
  kpis: {
    totalRevenue: 47704512,
    salesTrend: 'Increasing',
    trendDelta: '+8.3%',
    activeAlerts: 5,
    badAlerts: 3,
    goodAlerts: 2,
    projectedRevenue: 4200000,
    projectionLabel: 'Next 90 days',
  },
  alerts: [
    { direction: 'down', product: 'Item 5',  pct: 18 },
    { direction: 'down', product: 'Item 1',  pct: 12 },
    { direction: 'down', product: 'Item 41', pct: 8  },
    { direction: 'up',   product: 'Item 15', pct: 25 },
    { direction: 'up',   product: 'Item 28', pct: 10 },
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

        {/* Logo */}
        <div className="db-sidebar-top">
          <img
            src="/logo.webp"
            alt="InventoryIQ"
            className="db-logo"
            onClick={() => navigate('/')}
          />
        </div>

        {/* Nav */}
        <div className="db-sidebar-section">
          <p className="db-sidebar-label">Menu</p>
          <nav className="db-nav">
            {[
              { id: 'overview', icon: '📊', label: 'Overview'  },
              { id: 'products', icon: '🏆', label: 'Products'  },
              { id: 'analysis', icon: '📈', label: 'Analysis'  },
            ].map(item => (
              <button
                key={item.id}
                className={`db-nav-btn ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="db-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {activeTab === item.id && <span className="db-nav-pip" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
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
          }}>↺ Reset</button>
        </div>

        {/* Bottom */}
        <div className="db-sidebar-bottom">
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

        {/* Header */}
        <header className="db-header">
          <div className="db-header-left">
            <div className="db-header-titles">
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
          </div>
          <button className="db-ai-btn">✦ Generate AI Summary</button>
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
  const { kpis, alerts, aiHeadline } = data
  const bad  = alerts.filter(a => a.direction === 'down')
  const good = alerts.filter(a => a.direction === 'up')

  return (
    <div className="tab">

      {/* AI Banner */}
      <div className="ai-banner">
        <div className="ai-banner-icon">✦</div>
        <p className="ai-banner-text">{aiHeadline}</p>
        <span className="ai-banner-tag">AI Insight</span>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">

        {/* Hero */}
        <div className="kpi-hero">
          <div className="kpi-hero-bg" />
          <p className="kpi-hero-label">Total Revenue</p>
          <p className="kpi-hero-value">{fmt(kpis.totalRevenue)}</p>
          <p className="kpi-hero-sub">All stores combined</p>
          <div className="kpi-hero-trend">▲ {kpis.trendDelta} vs prior period</div>
        </div>

        {/* Sales Trend */}
        <div className="kpi-card kpi-card-green">
          <div className="kpi-card-top">
            <p className="kpi-card-label">Sales Trend</p>
            <span className="kpi-card-icon">📈</span>
          </div>
          <p className="kpi-card-value">{kpis.salesTrend}</p>
          <p className="kpi-card-delta kpi-up">▲ {kpis.trendDelta}</p>
        </div>

        {/* Alerts */}
        <div className="kpi-card kpi-card-red">
          <div className="kpi-card-top">
            <p className="kpi-card-label">Active Alerts</p>
            <span className="kpi-card-icon">🚨</span>
          </div>
          <p className="kpi-card-value">{kpis.activeAlerts}</p>
          <p className="kpi-card-delta kpi-down">⚠ {bad.length} need attention</p>
        </div>

        {/* Projected */}
        <div className="kpi-card kpi-card-blue">
          <div className="kpi-card-top">
            <p className="kpi-card-label">Projected Revenue</p>
            <span className="kpi-card-icon">🎯</span>
          </div>
          <p className="kpi-card-value">{fmt(kpis.projectedRevenue)}</p>
          <p className="kpi-card-delta kpi-neutral">{kpis.projectionLabel}</p>
        </div>

      </div>

      {/* Alert strip */}
      <div className="alert-strip">
        <span className="alert-strip-label">Live Alerts</span>
        <div className="alert-strip-pills">
          {bad.map((a, i) => (
            <span key={i} className="alert-pill alert-pill-red">
              📉 {a.product} -{a.pct}%
            </span>
          ))}
          {good.map((a, i) => (
            <span key={i} className="alert-pill alert-pill-green">
              📈 {a.product} +{a.pct}%
            </span>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="bottom-row">

        {/* Forecast chart */}
        <div className="panel panel-forecast">
          <div className="panel-header">
            <div>
              <p className="panel-title">Sales Forecast</p>
              <p className="panel-sub">Historical vs projected growth</p>
            </div>
            <div className="panel-legend">
              <span><span className="dot dot-green"/>Historical</span>
              <span><span className="dot dot-orange"/>Projected</span>
            </div>
          </div>
          <div className="chart-zone">
            📈 Recharts forecast chart — Mira wires in here
          </div>
        </div>

        {/* Alert list */}
        <div className="panel panel-alerts">
          <div className="panel-header">
            <div>
              <p className="panel-title">Alert Center</p>
              <p className="panel-sub">{alerts.length} active</p>
            </div>
            <span className="badge-red">{alerts.length} Active</span>
          </div>
          <div className="alert-list">
            {alerts.map((a, i) => (
              <div key={i} className={`alert-row alert-row-${a.direction}`}>
                <span className="alert-row-emoji">
                  {a.direction === 'up' ? '📈' : '📉'}
                </span>
                <div>
                  <p className="alert-row-name">{a.product}</p>
                  <p className="alert-row-detail">
                    {a.direction === 'up'
                      ? `Up ~${a.pct}% above normal`
                      : `Down ~${a.pct}% below normal`}
                  </p>
                </div>
              </div>
            ))}
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
          <div className="panel-header panel-header-green">
            <div>
              <p className="panel-title">Top Performers</p>
              <p className="panel-sub">Products driving the most revenue</p>
            </div>
          </div>
          {data.topProducts.map((row, i) => (
            <div key={i} className="product-row">
              <div className="product-left">
                <span className="rank rank-green">{i + 1}</span>
                <span className="product-name">{row.product}</span>
              </div>
              <span className="product-val val-green">{fmt(row.total_sales)}</span>
            </div>
          ))}
          <div className="panel-foot" />
        </div>

        <div className="panel">
          <div className="panel-header panel-header-red">
            <div>
              <p className="panel-title">Underperformers</p>
              <p className="panel-sub">Products generating the least revenue</p>
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
          <div className="panel-foot" />
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">Top 10 Products by Revenue</p>
            <p className="panel-sub">Your highest earning products</p>
          </div>
        </div>
        <div className="chart-zone chart-zone-tall">
          📊 Recharts horizontal bar — Mira wires in here
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-title">Top 5 Product Trends</p>
              <p className="panel-sub">Growing or declining month over month?</p>
            </div>
          </div>
          <div className="chart-zone chart-zone-tall">
            📈 Recharts line chart — Mira wires in here
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-title">Month-over-Month</p>
              <p className="panel-sub">Biggest movers vs last month</p>
            </div>
          </div>
          <div className="chart-zone chart-zone-tall">
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
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">Category Revenue Trends</p>
            <p className="panel-sub">Monthly revenue per category</p>
          </div>
        </div>
        <div className="chart-zone chart-zone-tall">
          📈 Recharts category trends — Mira wires in here
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">Store Comparison</p>
            <p className="panel-sub">Total revenue by store</p>
          </div>
        </div>
        <div className="chart-zone chart-zone-tall">
          📊 Recharts store bar chart — Mira wires in here
        </div>
      </div>
    </div>
  )
}

export default DashboardPage