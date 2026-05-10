import { useEffect, useRef, useState } from 'react';
import { useOpenCv } from '../utils/cv';

function PhotoUpload({ onUpload, disabled = false }) {
  const canvasRef = useRef(null);
  const objectUrlRef = useRef('');
  const { ready: cvReady, error: cvError } = useOpenCv();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [variance, setVariance] = useState(0);
  const [threshold, setThreshold] = useState(100);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedFile || !previewUrl || !cvReady) {
      return undefined;
    }

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) {
        return;
      }

      const canvas = canvasRef.current;
      const cv = window.cv;

      if (!canvas || !cv) {
        return;
      }

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const source = cv.imread(canvas);
      const gray = new cv.Mat();
      const laplacian = new cv.Mat();
      const mean = new cv.Mat();
      const stddev = new cv.Mat();

      try {
        cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
        cv.Laplacian(gray, laplacian, cv.CV_64F);
        cv.meanStdDev(laplacian, mean, stddev);
        const score = stddev.doubleAt(0, 0) ** 2;
        setVariance(score);
        setUploadError('');
      } catch (error) {
        setVariance(0);
        setUploadError('Could not analyze this photo. Choose another image.');
      } finally {
        source.delete();
        gray.delete();
        laplacian.delete();
        mean.delete();
        stddev.delete();
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setVariance(0);
        setUploadError('Selected photo could not be loaded. Choose another image.');
      }
    };

    image.src = previewUrl;

    return () => {
      cancelled = true;
    };
  }, [cvReady, previewUrl, selectedFile]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setUploadError('');
    setVariance(0);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSelectedFile(null);
      setPreviewUrl('');
      setUploadError('Upload must be an image file.');
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextPreviewUrl;
    setSelectedFile(file);
    setPreviewUrl(nextPreviewUrl);
  };

  const handleUpload = () => {
    if (!selectedFile || variance <= threshold) {
      return;
    }

    onUpload(selectedFile, selectedFile.name || 'document-upload.jpg');
  };

  const isSharp = variance > threshold;
  const canUpload = cvReady && selectedFile && isSharp && !disabled && !uploadError;

  return (
    <section className="camera-card upload-card" aria-label="Existing document photo">
      <div>
        <h2>Upload an existing photo</h2>
        <p className="muted-text">
          Already took a document photo? Upload it here and the same blur check runs before OCR.
        </p>
      </div>

      <label className="file-picker">
        Choose document photo
        <input type="file" accept="image/*" onChange={handleFileChange} disabled={disabled} />
      </label>

      {previewUrl ? (
        <div className="upload-preview">
          <img src={previewUrl} alt="Selected document preview" />
          <div className={`quality-badge ${isSharp ? 'good' : 'warn'}`}>
            {isSharp ? 'Document sharp' : 'Upload is too blurry'}
          </div>
        </div>
      ) : (
        <div className="upload-placeholder">Choose an image to preview sharpness.</div>
      )}

      <canvas ref={canvasRef} className="hidden-canvas" />

      <div className="quality-panel">
        <div>
          <strong>Sharpness score:</strong> {Math.round(variance)}
        </div>
        <label htmlFor="upload-threshold">
          Blur threshold: {threshold}
          <input
            id="upload-threshold"
            type="range"
            min="20"
            max="400"
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
          />
        </label>
      </div>

      {(cvError || uploadError) && <p className="error-text">{cvError || uploadError}</p>}
      {!cvReady && !cvError && <p className="muted-text">Loading OpenCV edge validation...</p>}

      <button type="button" className="primary-button" onClick={handleUpload} disabled={!canUpload}>
        Use uploaded photo
      </button>
    </section>
  );
}

export default PhotoUpload;
