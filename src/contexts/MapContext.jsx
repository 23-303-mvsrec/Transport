import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadGoogleMaps } from '../services/mapsService';

const MapContext = createContext();

export const useMap = () => useContext(MapContext);

export const MapProvider = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((err) => {
        console.warn('Map Context failed to load Google Maps SDK, falling back to vector map:', err.message);
        setLoadError(err);
      });
  }, []);

  return (
    <MapContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </MapContext.Provider>
  );
};
