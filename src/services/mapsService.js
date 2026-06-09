let googleMapsPromise = null;

export const loadGoogleMaps = () => {
  if (googleMapsPromise) return googleMapsPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    googleMapsPromise = Promise.reject(new Error('Google Maps API key not configured'));
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve(window.google.maps);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps SDK loaded but maps namespace not found'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps SDK script'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

// MapAdapter class wrapping Google/Leaflet operations
export class MapAdapter {
  constructor(mapInstance, provider, containerElement) {
    this.map = mapInstance;
    this.provider = provider; // 'google' | 'leaflet'
    this.container = containerElement;
    this.markers = {};
    this.polylines = {};
  }

  createMarker(id, position, options = {}) {
    const { lat, lng } = position;
    if (this.provider === 'google') {
      const google = window.google;
      const markerOptions = {
        position: { lat, lng },
        map: this.map,
        title: options.title || '',
        zIndex: options.zIndex || 1
      };
      
      if (options.icon) {
        markerOptions.icon = options.icon;
      } else if (options.isStop) {
        markerOptions.icon = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: options.isPassed ? '#0b57d0' : '#ffffff',
          fillOpacity: 1,
          strokeColor: '#0b57d0',
          strokeWeight: 2
        };
      }
      
      const marker = new google.maps.Marker(markerOptions);
      
      if (options.popupContent) {
        const infoWindow = new google.maps.InfoWindow({
          content: options.popupContent
        });
        marker.addListener('click', () => {
          infoWindow.open(this.map, marker);
        });
        this.markers[id] = { marker, infoWindow };
      } else {
        this.markers[id] = { marker };
      }
    } else {
      // Leaflet
      const L = window.L;
      let marker;
      
      if (options.iconHtml) {
        const leafletIcon = L.divIcon({
          html: options.iconHtml,
          className: ''
        });
        marker = L.marker([lat, lng], { icon: leafletIcon }).addTo(this.map);
      } else if (options.isStop) {
        marker = L.circleMarker([lat, lng], {
          radius: 6,
          fillColor: options.isPassed ? '#0b57d0' : '#ffffff',
          color: '#0b57d0',
          weight: 2,
          fillOpacity: 1
        }).addTo(this.map);
      } else {
        // Standard user marker
        marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: '#3b82f6',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1
        }).addTo(this.map);
      }
      
      if (options.popupContent) {
        marker.bindPopup(options.popupContent);
      }
      
      this.markers[id] = marker;
    }
  }

  updateMarker(id, position, options = {}) {
    const { lat, lng } = position;
    if (this.provider === 'google') {
      const markerObj = this.markers[id];
      if (markerObj) {
        const marker = markerObj.marker;
        const fromLoc = marker.getPosition();
        const toLoc = new window.google.maps.LatLng(lat, lng);
        
        if (options.animate && fromLoc) {
          let step = 0;
          const animate = () => {
            step += 0.05;
            if (step <= 1) {
              const latInterp = fromLoc.lat() + (toLoc.lat() - fromLoc.lat()) * step;
              const lngInterp = fromLoc.lng() + (toLoc.lng() - fromLoc.lng()) * step;
              marker.setPosition({ lat: latInterp, lng: lngInterp });
              requestAnimationFrame(animate);
            } else {
              marker.setPosition(toLoc);
            }
          };
          animate();
        } else {
          marker.setPosition(toLoc);
        }
        
        if (options.icon) {
          marker.setIcon(options.icon);
        }
        if (options.opacity !== undefined) {
          marker.setOpacity(options.opacity);
        }
      }
    } else {
      // Leaflet
      const marker = this.markers[id];
      if (marker) {
        const fromLatLng = marker.getLatLng();
        const toLatLng = window.L.latLng(lat, lng);
        
        if (options.animate && fromLatLng) {
          let step = 0;
          const animate = () => {
            step += 0.05;
            if (step <= 1) {
              const latInterp = fromLatLng.lat + (toLatLng.lat - fromLatLng.lat) * step;
              const lngInterp = fromLatLng.lng + (toLatLng.lng - fromLatLng.lng) * step;
              marker.setLatLng([latInterp, lngInterp]);
              requestAnimationFrame(animate);
            } else {
              marker.setLatLng(toLatLng);
            }
          };
          animate();
        } else {
          marker.setLatLng(toLatLng);
        }
        
        if (options.iconHtml) {
          const customIcon = window.L.divIcon({
            html: options.iconHtml,
            className: ''
          });
          marker.setIcon(customIcon);
        }
      }
    }
  }

  removeMarker(id) {
    if (this.provider === 'google') {
      if (this.markers[id]) {
        this.markers[id].marker.setMap(null);
        delete this.markers[id];
      }
    } else {
      if (this.markers[id]) {
        this.map.removeLayer(this.markers[id]);
        delete this.markers[id];
      }
    }
  }

  createPolyline(id, coords, options = {}) {
    if (this.provider === 'google') {
      if (this.polylines[id]) {
        this.polylines[id].setMap(null);
      }
      const poly = new window.google.maps.Polyline({
        path: coords,
        geodesic: true,
        strokeColor: options.color || '#0b57d0',
        strokeOpacity: options.opacity || 0.7,
        strokeWeight: options.weight || 4,
        map: this.map
      });
      this.polylines[id] = poly;
    } else {
      // Leaflet
      if (this.polylines[id]) {
        this.map.removeLayer(this.polylines[id]);
      }
      const poly = window.L.polyline(coords.map(c => [c.lat, c.lng]), {
        color: options.color || '#0b57d0',
        weight: options.weight || 4,
        opacity: options.opacity || 0.7
      }).addTo(this.map);
      this.polylines[id] = poly;
    }
  }

  removePolyline(id) {
    if (this.polylines[id]) {
      if (this.provider === 'google') {
        this.polylines[id].setMap(null);
      } else {
        this.map.removeLayer(this.polylines[id]);
      }
      delete this.polylines[id];
    }
  }

  fitBounds(coords) {
    if (coords.length === 0) return;
    if (this.provider === 'google') {
      const bounds = new window.google.maps.LatLngBounds();
      coords.forEach(c => bounds.extend(c));
      this.map.fitBounds(bounds);
    } else {
      const leafletCoords = coords.map(c => [c.lat, c.lng]);
      this.map.fitBounds(window.L.polyline(leafletCoords).getBounds());
    }
  }

  panTo(lat, lng) {
    if (this.provider === 'google') {
      this.map.panTo({ lat, lng });
    } else {
      this.map.panTo([lat, lng]);
    }
  }

  destroy() {
    Object.keys(this.markers).forEach(id => this.removeMarker(id));
    Object.keys(this.polylines).forEach(id => this.removePolyline(id));
    
    if (this.provider === 'leaflet') {
      this.map.remove();
    }
  }
}

// Unified map initialization function
export const initMap = async (containerElement, options = {}, provider = 'google') => {
  if (provider === 'leaflet') {
    if (!window.L) {
      await new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    const L = window.L;
    const center = options.center || { lat: 17.3850, lng: 78.4867 };
    const map = L.map(containerElement, {
      zoomControl: options.zoomControl !== undefined ? options.zoomControl : true,
      attributionControl: false
    }).setView([center.lat, center.lng], options.zoom || 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    return new MapAdapter(map, 'leaflet', containerElement);
  } else {
    await loadGoogleMaps();
    const google = window.google;
    const center = options.center || { lat: 17.3850, lng: 78.4867 };
    const map = new google.maps.Map(containerElement, {
      center,
      zoom: options.zoom || 14,
      disableDefaultUI: options.disableDefaultUI !== undefined ? options.disableDefaultUI : true,
      zoomControl: options.zoomControl !== undefined ? options.zoomControl : false,
      styles: [{ featureType: 'all', elementType: 'geometry.fill', stylers: [{ color: '#f8fafc' }] }]
    });

    return new MapAdapter(map, 'google', containerElement);
  }
};
