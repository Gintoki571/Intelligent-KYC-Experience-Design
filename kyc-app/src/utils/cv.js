import { useEffect, useState } from 'react';

export function useOpenCv() {
  const [ready, setReady] = useState(() => Boolean(window.cv?.Mat));
  const [error, setError] = useState('');

  useEffect(() => {
    if (window.cv?.Mat) {
      setReady(true);
      return undefined;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 80;

    const markReady = () => {
      if (!cancelled) {
        setReady(true);
      }
    };

    const waitForOpenCv = window.setInterval(() => {
      attempts += 1;

      if (window.cv?.Mat) {
        window.clearInterval(waitForOpenCv);
        markReady();
        return;
      }

      if (window.cv) {
        window.cv.onRuntimeInitialized = markReady;
      }

      if (attempts >= maxAttempts) {
        window.clearInterval(waitForOpenCv);
        if (!cancelled) {
          setError('OpenCV.js did not finish loading. Check your network connection.');
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(waitForOpenCv);
    };
  }, []);

  return { ready, error };
}
