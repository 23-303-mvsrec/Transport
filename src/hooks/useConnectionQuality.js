import { useState, useEffect } from 'react';
import { db, isFirebaseEnabled } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const useConnectionQuality = () => {
  const [connState, setConnState] = useState({
    effectiveType: '4g',
    downlink: 10,
    isSlowFirebase: false
  });

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    const updateStatus = () => {
      if (conn) {
        setConnState(prev => ({
          ...prev,
          effectiveType: conn.effectiveType || '4g',
          downlink: conn.downlink || 10
        }));
      }
    };

    if (conn) {
      conn.addEventListener('change', updateStatus);
      updateStatus();
    }

    // Manual Network Latency check (Firebase initialization speed)
    if (isFirebaseEnabled) {
      const startTime = performance.now();
      const testTimeout = setTimeout(() => {
        // If query hasn't returned in 3 seconds, assume slow connection
        setConnState(prev => ({ ...prev, isSlowFirebase: true }));
      }, 3000);

      getDoc(doc(db, 'cities', 'hyderabad'))
        .then(() => {
          clearTimeout(testTimeout);
          const elapsed = performance.now() - startTime;
          if (elapsed > 3000) {
            setConnState(prev => ({ ...prev, isSlowFirebase: true }));
          }
        })
        .catch(() => {
          clearTimeout(testTimeout);
          // Network errors or timeout treat as slow
          setConnState(prev => ({ ...prev, isSlowFirebase: true }));
        });
    }

    return () => {
      if (conn) {
        conn.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  const isLowBandwidth = 
    connState.effectiveType === '2g' || 
    connState.effectiveType === 'slow-2g' || 
    connState.downlink < 0.5 || 
    connState.isSlowFirebase;

  let quality = 'good';
  if (isLowBandwidth) {
    quality = 'poor';
  } else if (connState.effectiveType === '3g' || connState.downlink < 1.5) {
    quality = 'moderate';
  }

  return { 
    quality, 
    isLowBandwidth, 
    effectiveType: connState.effectiveType, 
    downlink: connState.downlink 
  };
};

export default useConnectionQuality;
