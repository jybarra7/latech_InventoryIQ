import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
    { date: 'Aug', value: 3200 },
    { date: 'Sep', value: 2900 },
    { date: 'Oct', value: 3100 },
    { date: 'Nov', value: 2800 },
    { date: 'Dec', value: 3400 },
    { date: 'Jan', value: 3600 },
    { date: 'Feb', value: 3500 },
    { date: 'Mar', value: 3800 },
    { date: 'Apr', value: 4100 },
    { date: 'May', value: 4400 },
    { date: 'Jun', value: 4700 },
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
  { id: 'overview', icon: '📊', label: 'Overview'  },
  { id: 'products', icon: '🏆', label: 'Products'  },
  { id: 'analysis', icon: '📈', label: 'Analysis'  },
]

const HORIZONS = ['Next 30 days', 'Next 90 days', 'Next 6 months', 'Next 12 months']

function DashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('overview')
  const [horizon, setHorizon] = useState('Next 90 days')
  const [selectedStores, setSelectedStores] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])

  const apiState = location.state
  const kpis       = apiState?.kpiData    ?? mockData.kpis
  const alertsData = apiState?.alertsData ?? mockData.alertsData
  const fileName   = apiState?.fileName   ?? mockData.fileName

  const forecastChart = apiState?.forecastData?.forecast_records
    ? (() => {
        const records = apiState.forecastData.forecast_records
        const byMonth = {}
        records.forEach(r => {
          const month = r.date.slice(0, 7)
          if (!byMonth[month]) byMonth[month] = { total: 0, count: 0, actual: 0, actualCount: 0 }
          byMonth[month].total += r.prediction
          byMonth[month].count += 1
          if (r.actual) {
            byMonth[month].actual += r.actual
            byMonth[month].actualCount += 1
          }
        })
        return Object.entries(byMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([month, data]) => ({
            date: month,
            value: Math.round(data.total / data.count),
            actual: data.actualCount > 0 ? Math.round(data.actual / data.actualCount) : null,
          }))
      })()
    : mockData.forecastChart

  const data = {
    ...mockData,
    kpis,
    alertsData,
    fileName,
    forecastChart,
  }

  function toggleStore(store) {
    setSelectedStores(prev =>
      prev.includes(store)
        ? prev.filter(s => s !== store)
        : [...prev, store]
    )
  }

  function toggleCategory(cat) {
    setSelectedCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    )
  }

  function resetFilters() {
    setHorizon('Next 90 days')
    setSelectedStores([])
    setSelectedCategories([])
  }

  const hasActiveFilters = selectedStores.length > 0 ||
    selectedCategories.length > 0 ||
    horizon !== 'Next 90 days'

  return (
    <div className="db">

      {/* ── Sidebar ── */}
      <aside className="db-sidebar">

        {/* Logo */}
        <div className="db-sidebar-logo" onClick={() => navigate('/')}>
          <img src="/logo.webp" alt="InventoryIQ" className="db-sidebar-logo-img" />
        </div>

        {/* Nav */}
        <div className="db-sidebar-section">
          <p className="db-sidebar-label">Menu</p>
          <nav className="db-nav">
            {NAV_ITEMS.map(item => (
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

        {/* Horizon filter */}
        <div className="db-sidebar-section">
          <p className="db-sidebar-label">Forecast Horizon</p>
          <div className="db-radio-group">
            {HORIZONS.map(h => (
              <label key={h} className="db-radio-item">
                <input
                  type="radio"
                  name="horizon"
                  value={h}
                  checked={horizon === h}
                  onChange={() => setHorizon(h)}
                />
                <span>{h}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Store filter */}
        <div className="db-sidebar-section">
          <p className="db-sidebar-label">
            Stores
            {selectedStores.length > 0 &&
              <span className="db-filter-count">{selectedStores.length}</span>
            }
          </p>
          <div className="db-checkbox-group">
            {data.stores.map(store => (
              <label key={store} className="db-checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedStores.includes(store)}
                  onChange={() => toggleStore(store)}
                />
                <span>{store}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Category filter */}
        <div className="db-sidebar-section">
          <p className="db-sidebar-label">
            Categories
            {selectedCategories.length > 0 &&
              <span className="db-filter-count">{selectedCategories.length}</span>
            }
          </p>
          <div className="db-checkbox-group">
            {data.categories.map(cat => (
              <label key={cat} className="db-checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                />
                <span>{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Reset + bottom */}
        <div className="db-sidebar-bottom">
          {hasActiveFilters && (
            <button className="db-reset-btn" onClick={resetFilters}>
              ↺ Reset Filters
            </button>
          )}
          <div className="db-file-chip">
            <span>📄</span>
            <span className="db-file-name">{fileName}</span>
          </div>
          <button className="db-new-file" onClick={() => navigate('/upload')}>
            + Upload New File
          </button>
        </div>

      </aside>

      {/* ── Main ── */}
      <div className="db-main">
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
          <button className="db-ai-btn">✦ AI Summary</button>
        </header>

        <div className="db-content">
          {activeTab === 'overview' && <OverviewTab data={data} horizon={horizon} />}
          {activeTab === 'products' && <ProductsTab data={data} />}
          {activeTab === 'analysis' && <AnalysisTab />}
        </div>
      </div>

    </div>
  )
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function OverviewTab({ data, horizon }) {
  const { kpis, alertsData, forecastChart } = data
  const alerts = alertsData?.alerts ?? []
  const bad = alerts.filter(a => a.severity >= 1.5)

  const projectedRevenue = () => {
    const base = kpis.total_sales
    if (horizon === 'Next 30 days')   return fmt(base * 0.085)
    if (horizon === 'Next 90 days')   return fmt(base * 0.24)
    if (horizon === 'Next 6 months')  return fmt(base * 0.48)
    if (horizon === 'Next 12 months') return fmt(base * 0.95)
    return fmt(base * 0.24)
  }

  return (
    <div className="tab">

      <div className="ai-insight">
        <span className="ai-insight-icon">✦</span>
        <span className="ai-insight-label">AI INSIGHT</span>
        <span className="ai-insight-text">
          Sales are {kpis.forecast_direction} — model accuracy MAE {kpis.mae}. {bad.length} products need your attention.
        </span>
        <button className="ai-insight-btn">Full Summary</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-hero">
          <div className="kpi-hero-bg" />
          <p className="kpi-hero-label">Total Revenue</p>
          <p className="kpi-hero-value">{fmt(kpis.total_sales)}</p>
        </div>

        <div className="kpi-card">
          <p className="kpi-label">Sales Trend</p>
          <p className="kpi-value" style={{textTransform:'capitalize'}}>{kpis.forecast_direction}</p>
        </div>

        <div className="kpi-card" style={{
          background: (alertsData?.total ?? 0) === 0
            ? 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)'
            : 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)',
          boxShadow: (alertsData?.total ?? 0) === 0
            ? '0 4px 16px rgba(22,163,74,0.4)'
            : '0 4px 16px rgba(239,68,68,0.4)'
        }}>
          <p className="kpi-label">Active Alerts</p>
          <p className="kpi-value">{alertsData?.total ?? 0}</p>
          <p className="kpi-delta" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {(alertsData?.total ?? 0) === 0 ? '✅ All clear' : `⚠ ${bad.length} need attention`}
          </p>
        </div>

        <div className="kpi-card">
          <p className="kpi-label">Projected Revenue</p>
          <p className="kpi-value">{projectedRevenue()}</p>
          <p className="kpi-delta kpi-neutral">→ {horizon}</p>
        </div>
      </div>

      <div className="bottom-row">
        <div className="panel">
          <p className="panel-title">Sales Forecast</p>
          <p className="panel-sub">Historical performance vs projected growth</p>
          <div className="chart-legend">
            <span><span className="chart-dot chart-dot-navy" />Actual Sales</span>
            <span><span className="chart-dot chart-dot-blue" />Forecast</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={forecastChart} margin={{ top: 10, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#8aaac8' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.floor(forecastChart.length / 8)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8aaac8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v.toLocaleString()}`}
                  width={80}
                />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #dce3ed', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#1e3a5f', fontWeight: 600 }}
                  formatter={(value, name) => [
                    `${value.toLocaleString()} units`,
                    name === 'value' ? '📈 Forecast' : '📊 Actual'
                  ]}
                />
                <Line type="monotone" dataKey="actual" stroke="#1e3a5f" strokeWidth={2} dot={false} name="actual" />
                <Line type="monotone" dataKey="value" stroke="#2196f3" strokeWidth={2.5} dot={false} name="value" strokeDasharray="5 5" activeDot={{ r: 5, fill: '#2196f3' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header-row">
            <div>
              <p className="panel-title">Alert Center</p>
              <p className="panel-sub">{alertsData?.total ?? 0} active alerts</p>
            </div>
            <span className="badge-red">{alertsData?.total ?? 0} Active</span>
          </div>
          <div className="alert-list">
            {alerts.length === 0 ? (
              <p style={{color:'#8aaac8', fontSize:'0.82rem', padding:'1rem 0'}}>No alerts detected</p>
            ) : alerts.map((a, i) => {
              const isDown = a.metric?.includes('below')
              const cardColor = isDown ? '#fef2f2' : '#f0fdf4'
              const borderColor = isDown ? '#ef4444' : '#22c55e'
              const plainEnglish = isDown
                ? `⚠️ Sales have unexpectedly dropped — this item may need attention`
                : `✅ Sales have unexpectedly spiked — this item is performing above normal`

              return (
                <div key={i} className="alert-row" style={{
                  borderLeftColor: borderColor,
                  backgroundColor: cardColor,
                  borderRadius: '8px',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '2px' }}>
                    {isDown ? '📉' : '📈'}
                  </span>
                  <div>
                    <p className="alert-name" style={{ color: isDown ? '#ef4444' : '#16a34a' }}>
                      {a.product_name} · {a.alert_type}
                    </p>
                    <p className="alert-metric">{plainEnglish}</p>
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