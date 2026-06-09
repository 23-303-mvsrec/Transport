import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadGoogleMaps } from '../services/mapsService';

const MapContext = createContext();

export const useMap = () => useContext(MapContext);

export const MapProvider = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [provider, setProvider] = useState('leaflet'); // 'google' | 'leaflet'
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    // If no valid Google Maps key, use Leaflet directly
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      console.log('No Google Maps API key configured. Using Leaflet/OpenStreetMap.');
      setProvider('leaflet');
      setIsLoaded(true);
      return;
    }

    loadGoogleMaps()
      .then(() => {
        setProvider('google');
        setIsLoaded(true);
      })
      .catch((err) => {
        console.warn('Google Maps failed to load, using Leaflet fallback:', err.message);
        setProvider('leaflet');
        setIsLoaded(true);
        setLoadError(err);
      });
  }, []);

  return (
    <MapContext.Provider value={{ isLoaded, provider, loadError }}>
      {children}
    </MapContext.Provider>
  );
};
