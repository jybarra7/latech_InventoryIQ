import { useNavigate } from 'react-router-dom'
import { useState, useRef } from 'react'
import { getFutureForecast, getForecastKpis, runAlerts, parseApiError } from '../api/client'
import './UploadPage.css'

const MIN_LOADING_MS = 900

const wait = (milliseconds) =>
  new Promise(resolve => setTimeout(resolve, milliseconds))

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

  async function handleContinue() {
    if (!uploadedFile || loading) return
    setLoading(true)
    setError(null)

    try {
      const startedAt = Date.now()

      setLoadingStep('Running forecast model...')
      await wait(180)

      setLoadingStep('Calculating KPIs...')
      const dashboardRequest = Promise.all([
        getForecastKpis(uploadedFile, 30),
        getFutureForecast(uploadedFile, 90, { fast: true }),
        runAlerts(uploadedFile),
      ])

      await wait(180)
      setLoadingStep('Generating forecast chart...')
      await wait(180)
      setLoadingStep('Scanning for alerts...')

      const [kpiResult, forecastResult, alertsResult] = await dashboardRequest

      const remainingAnimationTime = MIN_LOADING_MS - (Date.now() - startedAt)
      if (remainingAnimationTime > 0) {
        await wait(remainingAnimationTime)
      }

      setLoadingStep('Almost there...')
      await wait(120)
      navigate('/dashboard', {
        state: {
          kpiData: kpiResult,
          forecastData: forecastResult,
          alertsData: alertsResult,
          fileName: uploadedFile.name,
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

      {/* Navbar */}
      <nav className="upload-nav">
        <img
          src="/logo.webp"
          alt="InventoryIQ"
          className="upload-nav-logo"
          onClick={() => !loading && navigate('/')}
          style={{ cursor: loading ? 'default' : 'pointer' }}
        />
      </nav>

      {/* Centered card */}
      <div className="upload-center">
        <div className="upload-card">

          {loading ? (
            <div className="upload-loading">
              <div className="upload-spinner" />
              <p className="upload-loading-title">Analyzing your data</p>
              <p className="upload-loading-step">{loadingStep}</p>
              <div className="upload-loading-steps">
                <div className={`upload-step-item ${loadingStep.includes('forecast model') ? 'active' : ''} ${loadingStep.includes('KPI') || loadingStep.includes('chart') || loadingStep.includes('alert') || loadingStep.includes('Almost') ? 'done' : ''}`}>
                  <span className="upload-step-dot" />
                  <span>Running forecast model</span>
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
