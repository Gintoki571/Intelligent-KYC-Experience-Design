import { useCallback, useEffect, useRef, useState } from 'react';
import { useOpenCv } from '../utils/cv';

function CameraView({ onCapture, disabled = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const { ready: cvReady, error: cvError } = useOpenCv();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [variance, setVariance] = useState(0);
  const [threshold, setThreshold] = useState(100);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        if (!cancelled) {
          setCameraError('Camera access failed. Allow camera permission and reload.');
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const checkBlur = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const cv = window.cv;

    if (!cvReady || !video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      return 0;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

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
      return score;
    } finally {
      source.delete();
      gray.delete();
      laplacian.delete();
      mean.delete();
      stddev.delete();
    }
  }, [cvReady]);

  useEffect(() => {
    if (!cvReady || !cameraReady) {
      return undefined;
    }

    const interval = window.setInterval(checkBlur, 500);
    return () => window.clearInterval(interval);
  }, [cameraReady, checkBlur, cvReady]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || variance <= threshold) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
      }
    }, 'image/jpeg', 0.92);
  };

  const isSharp = variance > threshold;
  const canCapture = cvReady && cameraReady && isSharp && !disabled;

  return (
    <section className="camera-card" aria-label="Document camera">
      <div className="video-frame">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onCanPlay={() => setCameraReady(true)}
        />
        <div className={`quality-badge ${isSharp ? 'good' : 'warn'}`}>
          {isSharp ? 'Document sharp' : 'Hold still / move to better light'}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden-canvas" />

      <div className="quality-panel">
        <div>
          <strong>Sharpness score:</strong> {Math.round(variance)}
        </div>
        <label htmlFor="threshold">
          Blur threshold: {threshold}
          <input
            id="threshold"
            type="range"
            min="20"
            max="400"
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
          />
        </label>
      </div>

      {(cvError || cameraError) && <p className="error-text">{cvError || cameraError}</p>}
      {!cvReady && !cvError && <p className="muted-text">Loading OpenCV edge validation...</p>}

      <button type="button" className="primary-button" onClick={handleCapture} disabled={!canCapture}>
        Capture document
      </button>
    </section>
  );
}

export default CameraView;
