import { useState } from 'react';
import CameraView from './CameraView';
import PhotoUpload from './PhotoUpload';

const emptyKycData = {
  name: '',
  age: '',
  sex: '',
  address: '',
  document_number: '',
};

function KYCWizard() {
  const [step, setStep] = useState('capture');
  const [kycData, setKycData] = useState(emptyKycData);
  const [error, setError] = useState('');

  const handleDocumentImage = async (fileOrBlob, filename = 'document.jpg') => {
    setError('');
    setStep('analyzing');

    const formData = new FormData();
    formData.append('file', fileOrBlob, filename);

    try {
      const response = await fetch('http://localhost:8000/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Document extraction failed.');
      }

      const data = await response.json();
      setKycData({ ...emptyKycData, ...data });
      setStep('confirm');
    } catch (captureError) {
      setError(captureError.message);
      setStep('capture');
    }
  };

  const updateField = (field, value) => {
    setKycData((current) => ({ ...current, [field]: value }));
  };

  return (
    <main className="wizard-shell">
      <section className="hero-card">
        <p className="eyebrow">eSewa x WWF 2026 Challenge 4</p>
        <h1>Intelligent KYC Experience</h1>
        <p>
          Capture a clear document image, extract Nepalese KYC fields, then confirm or correct the
          auto-filled details before submission.
        </p>
      </section>

      <nav className="stepper" aria-label="KYC progress">
        <span className={step === 'capture' ? 'active' : ''}>1. Capture</span>
        <span className={step === 'analyzing' ? 'active' : ''}>2. Analyze</span>
        <span className={step === 'confirm' ? 'active' : ''}>3. Confirm</span>
      </nav>

      {error && <div className="error-banner">{error}</div>}

      {step === 'capture' && (
        <div className="capture-options">
          <CameraView onCapture={handleDocumentImage} />
          <PhotoUpload onUpload={handleDocumentImage} />
        </div>
      )}

      {step === 'analyzing' && (
        <section className="status-card" aria-live="polite">
          <div className="loader" />
          <h2>Reading document details</h2>
          <p>Running OCR with strict JSON validation. Please keep this page open.</p>
        </section>
      )}

      {step === 'confirm' && (
        <section className="form-card">
          <h2>Confirm extracted details</h2>
          <p className="muted-text">Review the OCR output and correct anything that looks wrong.</p>

          <div className="form-grid">
            <label>
              Full name
              <input
                value={kycData.name}
                onChange={(event) => updateField('name', event.target.value)}
              />
            </label>
            <label>
              Age
              <input
                type="number"
                value={kycData.age}
                onChange={(event) => updateField('age', event.target.value)}
              />
            </label>
            <label>
              Sex
              <input
                value={kycData.sex}
                onChange={(event) => updateField('sex', event.target.value)}
              />
            </label>
            <label>
              Document number
              <input
                value={kycData.document_number}
                onChange={(event) => updateField('document_number', event.target.value)}
              />
            </label>
            <label className="wide-field">
              Address
              <textarea
                rows="3"
                value={kycData.address}
                onChange={(event) => updateField('address', event.target.value)}
              />
            </label>
          </div>

          <div className="button-row">
            <button type="button" className="secondary-button" onClick={() => setStep('capture')}>
              Retake photo
            </button>
            <button type="button" className="primary-button">
              Confirm details
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default KYCWizard;
