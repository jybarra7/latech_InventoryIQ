import { useNavigate } from 'react-router-dom'
import { useState, useRef } from 'react'
import './UploadPage.css'

function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [error, setError] = useState(null)

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
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  function handleInputChange(e) {
    const file = e.target.files[0]
    handleFile(file)
  }

  function handleContinue() {
    if (!uploadedFile) return
    // Mira's API call will go here — for now navigate to dashboard
    navigate('/dashboard')
  }

  return (
    <div className="upload-page">

      {/* Navbar */}
      <nav className="upload-nav">
        <img
          src="/logo.webp"
          alt="InventoryIQ"
          className="upload-logo"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        />
      </nav>

      {/* Robot illustration */}
      <div className="upload-robot">
        <img src="/robot.png" alt="" className="upload-robot-img" />
      </div>

      {/* Main content */}
      <div className="upload-content">
        <div className="upload-header">
          <h1>Upload Your Data</h1>
          <p>Drop your retail CSV or Excel file to get started. We handle the rest.</p>
        </div>

        {/* Drop zone */}
        <div
          className={`upload-dropzone ${isDragging ? 'upload-dropzone-active' : ''} ${uploadedFile ? 'upload-dropzone-success' : ''}`}
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
            <div className="upload-success">
              <div className="upload-success-icon">✓</div>
              <p className="upload-success-name">{uploadedFile.name}</p>
              <p className="upload-success-size">
                {(uploadedFile.size / 1024).toFixed(1)} KB · Click to change file
              </p>
            </div>
          ) : (
            <div className="upload-placeholder">
              <div className="upload-icon">📂</div>
              <p className="upload-main-text">
                {isDragging ? 'Drop it here!' : 'Drag & drop your file here'}
              </p>
              <p className="upload-sub-text">or click to browse</p>
              <span className="upload-formats">CSV · XLSX</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="upload-error">
            ⚠️ {error}
          </div>
        )}

        {/* Continue button */}
        <button
          className={`upload-btn ${uploadedFile ? 'upload-btn-active' : 'upload-btn-disabled'}`}
          onClick={handleContinue}
          disabled={!uploadedFile}
        >
          {uploadedFile ? 'Continue to Dashboard →' : 'Select a file to continue'}
        </button>

        {/* Reassurance */}
        <div className="upload-reassurance">
          <span>✓ Columns detected automatically</span>
          <span>✓ No formatting required</span>
          <span>✓ CSV and Excel supported</span>
        </div>

      </div>
    </div>
  )
}

export default UploadPage