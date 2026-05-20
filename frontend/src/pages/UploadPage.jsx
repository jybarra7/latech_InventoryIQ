import { useNavigate } from 'react-router-dom'
import { useState, useRef } from 'react'
import { getFutureForecast, getForecastKpis, runAlerts, parseApiError } from '../api/client'
import './UploadPage.css'

function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')

  const validTypes = [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]

  function handleFile(file) {
    if (!file) return
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setError('Please upload a CSV or Excel (.xlsx) file.')
      setUploadedFile(null)
      return
    }
    setError(null)
    setUploadedFile(file)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function handleInputChange(e) {
    handleFile(e.target.files[0])
  }

  function parseCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target.result
          const lines = text.trim().split('\n')
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

          const rows = lines.slice(1).map(line => {
            const values = line.split(',')
            const row = {}
            headers.forEach((h, i) => {
              row[h] = values[i]?.trim().replace(/['"]/g, '')
            })
            return row
          })

          // Find column names by priority
          const ITEM_PRIORITY = ['product_name', 'name', 'item_name', 'description', 'product', 'item', 'sku', 'product_id']
          const itemCol = ITEM_PRIORITY.find(p => headers.includes(p)) || 'item'

          const STORE_PRIORITY = ['store_name', 'store', 'store_id', 'store_number', 'branch']
          const storeCol = STORE_PRIORITY.find(p => headers.includes(p)) || 'store'

          const CATEGORY_PRIORITY = ['category', 'department', 'type', 'segment']
          const categoryCol = CATEGORY_PRIORITY.find(p => headers.includes(p)) || null

          const DATE_PRIORITY = ['date', 'order_date', 'transaction_date', 'invoice_date']
          const dateCol = DATE_PRIORITY.find(p => headers.includes(p)) || 'date'

          const SALES_PRIORITY = ['sales', 'revenue', 'amount', 'total', 'price']
          const salesCol = SALES_PRIORITY.find(p => headers.includes(p)) || 'sales'

          const REGION_PRIORITY = ['region', 'state', 'area', 'territory', 'zone', 'market']
          const regionCol = REGION_PRIORITY.find(p => headers.includes(p)) || null

          // Aggregate sales
          const productSales = {}
          const storeSales = {}
          const categorySales = {}
          const monthlyTotal = {}

          const rawRows = rows.map(row => {
            const sales = parseFloat(row[salesCol]) || 0
            const product = row[itemCol] || 'Unknown'
            const store = row[storeCol] || 'Unknown'
            const category = categoryCol ? (row[categoryCol] || 'Unknown') : null
            const date = row[dateCol] ? row[dateCol].slice(0, 7) : null
            const region = regionCol ? (row[regionCol] || null) : null

            productSales[product] = (productSales[product] || 0) + sales
            storeSales[store] = (storeSales[store] || 0) + sales
            if (category) categorySales[category] = (categorySales[category] || 0) + sales
            if (date) monthlyTotal[date] = (monthlyTotal[date] || 0) + sales

            return { sales, product, store, category, date, region }
          })

          const sortedProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .map(([product, total_sales]) => ({ product, total_sales }))

          const sortedStores = Object.entries(storeSales)
            .sort((a, b) => b[1] - a[1])
            .map(([store, total_sales]) => ({ store, total_sales }))

          const sortedCategories = Object.entries(categorySales)
            .sort((a, b) => b[1] - a[1])
            .map(([category, total_sales]) => ({ category, total_sales }))

          const monthlyChart = Object.entries(monthlyTotal)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, total_sales]) => ({ date, total_sales }))

          const uniqueStores = [...new Set(rows.map(r => r[storeCol]).filter(Boolean))].sort()
          const uniqueCategories = categoryCol
            ? [...new Set(rows.map(r => r[categoryCol]).filter(Boolean))].sort()
            : []
          const uniqueRegions = regionCol
            ? [...new Set(rows.map(r => r[regionCol]).filter(Boolean))].sort()
            : []

          resolve({
            topProducts: sortedProducts.slice(0, 10),
            bottomProducts: sortedProducts.slice(-5).reverse(),
            top10Products: sortedProducts.slice(0, 10),
            storeSales: sortedStores,
            categorySales: sortedCategories,
            monthlyChart,
            uniqueStores,
            uniqueCategories,
            uniqueRegions,
            rawRows,
          })
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  async function handleContinue() {
    if (!uploadedFile || loading) return
    setLoading(true)
    setError(null)

    try {
      setLoadingStep('Reading your data...')
      const csvData = await parseCSV(uploadedFile)

      setLoadingStep('Calculating KPIs...')
      const kpiResult = await getForecastKpis(uploadedFile, 30)

      setLoadingStep('Generating forecast chart...')
      const forecastResult = await getFutureForecast(uploadedFile, 90, { fast: true })

      setLoadingStep('Scanning for alerts...')
      const alertsResult = await runAlerts(uploadedFile)

      setLoadingStep('Almost there...')
      navigate('/dashboard', {
        state: {
          kpiData: kpiResult,
          forecastData: forecastResult,
          alertsData: alertsResult,
          fileName: uploadedFile.name,
          csvData: csvData,
          file: uploadedFile,
        }
      })

    } catch (err) {
      setError(parseApiError(err))
      setLoading(false)
      setLoadingStep('')
    }
  }

  return (
    <div className="upload-page">

      <nav className="upload-nav">
        <img
          src="/logo.webp"
          alt="InventoryIQ"
          className="upload-nav-logo"
          onClick={() => !loading && navigate('/')}
          style={{ cursor: loading ? 'default' : 'pointer' }}
        />
      </nav>

      <div className="upload-center">
        <div className="upload-card">

          {loading ? (
            <div className="upload-loading">
              <div className="upload-spinner" />
              <p className="upload-loading-title">Analyzing your data</p>
              <p className="upload-loading-step">{loadingStep}</p>
              <div className="upload-loading-steps">
                <div className={`upload-step-item ${loadingStep.includes('Reading') ? 'active' : ''} ${loadingStep.includes('KPI') || loadingStep.includes('chart') || loadingStep.includes('alert') || loadingStep.includes('Almost') ? 'done' : ''}`}>
                  <span className="upload-step-dot" />
                  <span>Reading your data</span>
                </div>
                <div className={`upload-step-item ${loadingStep.includes('KPI') ? 'active' : ''} ${loadingStep.includes('chart') || loadingStep.includes('alert') || loadingStep.includes('Almost') ? 'done' : ''}`}>
                  <span className="upload-step-dot" />
                  <span>Calculating KPIs</span>
                </div>
                <div className={`upload-step-item ${loadingStep.includes('chart') ? 'active' : ''} ${loadingStep.includes('alert') || loadingStep.includes('Almost') ? 'done' : ''}`}>
                  <span className="upload-step-dot" />
                  <span>Generating forecast chart</span>
                </div>
                <div className={`upload-step-item ${loadingStep.includes('alert') ? 'active' : ''} ${loadingStep.includes('Almost') ? 'done' : ''}`}>
                  <span className="upload-step-dot" />
                  <span>Scanning for alerts</span>
                </div>
                <div className={`upload-step-item ${loadingStep.includes('Almost') ? 'active' : ''}`}>
                  <span className="upload-step-dot" />
                  <span>Preparing dashboard</span>
                </div>
              </div>
            </div>

          ) : (
            <>
              <div className="upload-header">
                <h1>Upload Your Data</h1>
                <p>Drop your retail CSV or Excel file.<br />We handle the rest.</p>
              </div>

              <div
                className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${uploadedFile ? 'success' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleInputChange}
                  style={{ display: 'none' }}
                />

                {uploadedFile ? (
                  <div className="upload-success-state">
                    <div className="upload-success-icon">✓</div>
                    <p className="upload-success-name">{uploadedFile.name}</p>
                    <p className="upload-success-size">
                      {(uploadedFile.size / 1024).toFixed(1)} KB · Click to change
                    </p>
                  </div>
                ) : (
                  <div className="upload-idle-state">
                    <div className="upload-folder-icon">📂</div>
                    <p className="upload-main-text">
                      {isDragging ? 'Drop it here!' : 'Drag & drop your file here'}
                    </p>
                    <p className="upload-sub-text">or click to browse</p>
                    <span className="upload-formats">CSV · XLSX</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="upload-error">
                  ⚠️ {error}
                  <p className="upload-error-hint">
                    Make sure the backend is running at localhost:8000
                  </p>
                </div>
              )}

              <button
                className={`upload-btn ${uploadedFile ? 'active' : 'disabled'}`}
                onClick={handleContinue}
                disabled={!uploadedFile}
              >
                {uploadedFile ? 'Continue to Dashboard →' : 'Select a file to continue'}
              </button>

              <div className="upload-reassurance">
                <span>✓ Auto column detection</span>
                <span>✓ No formatting needed</span>
                <span>✓ CSV & Excel supported</span>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  )
}

export default UploadPage