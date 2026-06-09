import React, { useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, Compass, Navigation, MapPin, Bus, AlertCircle } from 'lucide-react';
import { useBuses } from '../../contexts/BusContext';

export const MapFallback = ({ activeRouteId, userLocation }) => {
  const { buses, routes, stops } = useBuses();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState(null); // { type: 'stop'|'bus', data }
  const [selectedItem, setSelectedItem] = useState(null);

  // Default coordinate center (Hyderabad)
  const defaultCenter = { lat: 17.3828, lng: 78.4831 };

  // Calculate coordinates bounds for scaling to SVG viewBox (600x600)
  const bounds = useMemo(() => {
    if (stops.length === 0) return { minLat: 17.3000, maxLat: 17.6500, minLng: 78.2500, maxLng: 78.6500 };
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    stops.forEach(s => {
      const lat = s.location?.lat || s.lat;
      const lng = s.location?.lng || s.lng;
      if (lat === undefined || lng === undefined) return;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    if (minLat === Infinity || minLng === Infinity) {
      return { minLat: 17.3000, maxLat: 17.6500, minLng: 78.2500, maxLng: 78.6500 };
    }

    // Add extra padding to bounds so stops are not on the edge
    const latPadding = Math.max(0.005, (maxLat - minLat) * 0.15);
    const lngPadding = Math.max(0.005, (maxLng - minLng) * 0.15);
    
    return {
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding
    };
  }, [stops]);

  // Convert Latitude/Longitude to SVG Coordinates (X: 0-600, Y: 0-600)
  const getSvgCoords = (lat, lng) => {
    const width = 600;
    const height = 600;
    const padding = 50;

    const latRange = bounds.maxLat - bounds.minLat;
    const lngRange = bounds.maxLng - bounds.minLng;

    const x = padding + ((lng - bounds.minLng) / lngRange) * (width - 2 * padding);
    // SVG Y increases downwards, so we invert Y conversion
    const y = height - padding - ((lat - bounds.minLat) / latRange) * (height - 2 * padding);

    return { x, y };
  };

  // Drag handlers for panning
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (factor) => {
    setZoom(prev => Math.max(0.5, Math.min(4, prev + factor)));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedItem(null);
  };

  // Draw active routes paths
  const routePaths = useMemo(() => {
    return routes.map(route => {
      const stopList = route.stops || (route.stopIds ? route.stopIds.map(sid => ({ id: sid })) : []);
      const points = stopList
        .map(stop => {
          const matchedStop = stops.find(s => s.id === stop.id);
          if (!matchedStop) return null;
          const stopLat = matchedStop.location?.lat || matchedStop.lat;
          const stopLng = matchedStop.location?.lng || matchedStop.lng;
          const coords = getSvgCoords(stopLat, stopLng);
          return `${coords.x},${coords.y}`;
        })
        .filter(Boolean)
        .join(' L ');

      return {
        id: route.id,
        color: route.color || '#0b57d0',
        points: points ? `M ${points}` : '',
        isActive: activeRouteId === route.id,
        number: route.number
      };
    });
  }, [routes, stops, activeRouteId, bounds]);

  return (
    <div className="w-full h-full relative bg-slate-950 flex flex-col select-none overflow-hidden rounded-2xl">
      {/* Simulation Info Banner */}
      <div className="absolute top-3 left-3 right-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2.5 z-10 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="font-semibold text-emerald-400">Live Simulator Map</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleZoom(0.25)} 
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded transition"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button 
            onClick={() => handleZoom(-0.25)} 
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded transition"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button 
            onClick={handleReset} 
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded transition"
            title="Reset Map View"
          >
            <Compass size={14} />
          </button>
        </div>
      </div>

      {/* Map Viewport Area */}
      <div 
        className={`flex-1 relative cursor-${isDragging ? 'grabbing' : 'grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg 
          className="w-full h-full"
          viewBox="0 0 600 600"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background Grid Lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Draggable & Zoomable Group */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} className="transition-transform duration-75">
            
            {/* Draw Routes Path Lines */}
            {routePaths.map(path => (
              <g key={path.id}>
                {/* Background thicker glow path */}
                {path.points && (
                  <path 
                    d={path.points} 
                    fill="none" 
                    stroke={path.color} 
                    strokeWidth={path.isActive ? 8 : 4} 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    opacity={path.isActive ? 0.25 : 0.08}
                  />
                )}
                {/* Main line */}
                {path.points && (
                  <path 
                    d={path.points} 
                    fill="none" 
                    stroke={path.color} 
                    strokeWidth={path.isActive ? 4 : 2} 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    opacity={path.isActive ? 0.95 : 0.4}
                  />
                )}
              </g>
            ))}

            {/* Draw Stops */}
            {stops.map(stop => {
              const stopLat = stop.location?.lat || stop.lat;
              const stopLng = stop.location?.lng || stop.lng;
              const { x, y } = getSvgCoords(stopLat, stopLng);
              const targetRoute = routes.find(r => r.id === activeRouteId);
              const isTargetRouteStop = targetRoute && (
                (targetRoute.stops && targetRoute.stops.some(s => s.id === stop.id)) ||
                (targetRoute.stopIds && targetRoute.stopIds.includes(stop.id))
              );
              
              return (
                <g 
                  key={stop.id} 
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem({ type: 'stop', data: stop });
                  }}
                  onMouseEnter={() => setHoveredItem({ type: 'stop', data: stop })}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <circle 
                    r={isTargetRouteStop ? 10 : 8} 
                    fill="#1e293b" 
                    stroke={isTargetRouteStop ? '#0b57d0' : '#475569'} 
                    strokeWidth="3" 
                    className="transition-all duration-300 group-hover:scale-125"
                  />
                  <circle 
                    r={isTargetRouteStop ? 4 : 3} 
                    fill={isTargetRouteStop ? '#ffffff' : '#94a3b8'} 
                  />
                </g>
              );
            })}

            {/* User Simulated Location */}
            {(() => {
              const loc = userLocation || defaultCenter;
              const { x, y } = getSvgCoords(loc.lat, loc.lng);
              return (
                <g transform={`translate(${x}, ${y})`}>
                  {/* Ping circle */}
                  <circle r="14" fill="#3b82f6" opacity="0.3" className="animate-ping" />
                  <circle r="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                  <path d="M 0,-4 L 3,3 L -3,3 Z" fill="#ffffff" />
                </g>
              );
            })()}

            {/* Draw Animated Buses */}
            {buses
              .filter(bus => bus.currentLocation || (bus.lat !== undefined && bus.lat !== null))
              .map(bus => {
                const busLat = bus.currentLocation?.lat || bus.lat;
                const busLng = bus.currentLocation?.lng || bus.lng;
                const { x, y } = getSvgCoords(busLat, busLng);
                const route = routes.find(r => r.id === bus.routeId);
                const isTargetRouteBus = bus.routeId === activeRouteId;

                return (
                  <g 
                    key={bus.id} 
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem({ type: 'bus', data: bus });
                    }}
                    onMouseEnter={() => setHoveredItem({ type: 'bus', data: bus })}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                  {/* Indicator Ring */}
                  <circle 
                    r="16" 
                    fill="none" 
                    stroke={route?.color || '#0b57d0'} 
                    strokeWidth="2" 
                    opacity={isTargetRouteBus ? 0.8 : 0.3} 
                    className={isTargetRouteBus ? 'animate-ping' : ''} 
                  />
                  {/* Bus Node */}
                  <circle 
                    r="12" 
                    fill={route?.color || '#0b57d0'} 
                    stroke="#ffffff" 
                    strokeWidth="2" 
                    className="shadow-lg"
                  />
                  {/* Text for Bus Number */}
                  <text 
                    y="4" 
                    textAnchor="middle" 
                    fill="#ffffff" 
                    fontSize="9px" 
                    fontWeight="bold"
                  >
                    {route?.number || 'B'}
                  </text>
                </g>
              );
            })}

          </g>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredItem && (
          <div 
            className="absolute bg-slate-900 border border-slate-800 text-white rounded-lg p-2 shadow-xl z-20 pointer-events-none text-xs"
            style={{
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {hoveredItem.type === 'stop' ? (
              <div>
                <p className="font-semibold flex items-center gap-1">
                  <MapPin size={12} className="text-secondary" /> {hoveredItem.data.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Amenities: {hoveredItem.data.amenities?.join(', ') || 'None'}</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold flex items-center gap-1">
                  <Bus size={12} className="text-primary" /> Bus {hoveredItem.data.id} (R-{routes.find(r => r.id === hoveredItem.data.routeId)?.number})
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Status: {hoveredItem.data.status} • {hoveredItem.data.passengers} pax</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Details Side Drawer */}
      {selectedItem && (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 rounded-t-2xl z-20 animate-slide-up text-white">
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-bold text-sm flex items-center gap-1.5 text-slate-100">
              {selectedItem.type === 'stop' ? (
                <>
                  <MapPin size={16} className="text-teal-400" />
                  {selectedItem.data.name}
                </>
              ) : (
                <>
                  <Bus size={16} className="text-primary-hover" />
                  Fleet Bus {selectedItem.data.id}
                </>
              )}
            </h4>
            <button 
              onClick={() => setSelectedItem(null)}
              className="text-xs text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-md"
            >
              Close
            </button>
          </div>

          {selectedItem.type === 'stop' ? (
            <div className="text-xs space-y-1.5 text-slate-300">
              <p>📍 Coordinates: {(selectedItem.data.location?.lat || selectedItem.data.lat).toFixed(5)}, {(selectedItem.data.location?.lng || selectedItem.data.lng).toFixed(5)}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedItem.data.amenities?.map((am, i) => (
                  <span key={i} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                    {am}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div>
                <p>📍 Route: <span className="font-semibold text-white">{routes.find(r => r.id === selectedItem.data.routeId)?.name || 'Transit Line'}</span></p>
                <p>👤 Driver: {selectedItem.data.driverName || 'Active Operator'}</p>
                <p>📞 Phone: {selectedItem.data.driverPhone || 'N/A'}</p>
              </div>
              <div>
                <p>⚡ Status: <span className="text-yellow-400 font-semibold">{selectedItem.data.status}</span></p>
                <p>👥 Load: {selectedItem.data.occupancy !== undefined ? selectedItem.data.occupancy : selectedItem.data.passengers} / {selectedItem.data.capacity} passengers</p>
                <p>🚀 Speed: {selectedItem.data.speed !== undefined ? selectedItem.data.speed : selectedItem.data.speedKmh} km/h</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapFallback;
