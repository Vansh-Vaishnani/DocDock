'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

type LatLng = { lat: number; lng: number };

export function createSvgIcon(color: string, size = 28) {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}"/>
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  `;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const leaflet = require('leaflet');
  return leaflet.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size]
  });
}

interface LeafletModule {
  MapContainer: any;
  TileLayer: any;
  Marker: any;
  Popup: any;
  useMapEvents: any;
}

export default function LeafletMap({
  value,
  onChange,
  minHeight = 480,
  showSearch = true,
  placeholder = 'Search address',
  children
}: {
  value?: LatLng | null;
  onChange?: (lat: number, lng: number, label?: string) => void;
  minHeight?: number;
  showSearch?: boolean;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  const mapRef = useRef<any | null>(null);
  const [q, setQ] = useState('');
  const [leaflet, setLeaflet] = useState<LeafletModule | null>(null);
  const [icon, setIcon] = useState<any>(undefined);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('react-leaflet').then((module) => setLeaflet(module as LeafletModule));
    import('leaflet').then((leafletModule: any) => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#0ea5e9"/>
          <circle cx="12" cy="9" r="2.5" fill="white" />
        </svg>
      `;
      setIcon(leafletModule.divIcon({ html: svg, className: '', iconSize: [28, 28], iconAnchor: [14, 28] }));
    }).catch(() => setIcon(undefined));
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapReady || !value) return;
    try { mapRef.current.flyTo([value.lat, value.lng], 16); } catch (e) {}
  }, [value, mapReady]);

  const doReverse = async (lat: number, lng: number) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await r.json();
      return data?.display_name || '';
    } catch (e) { return ''; }
  };

  const handleSearch = async () => {
    if (!q) return;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}`);
      const data = await r.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = Number(item.lat); const lng = Number(item.lon);
        if (mapRef.current && mapReady) {
          try { mapRef.current.flyTo([lat, lng], 16); } catch (e) {}
        }
        const label = item.display_name || '';
        onChange?.(lat, lng, label);
      }
    } catch (e) { /* ignore */ }
  };

  const handleUseCurrent = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude; const lng = pos.coords.longitude;
      if (mapRef.current && mapReady) {
        try { mapRef.current.flyTo([lat, lng], 16); } catch (e) {}
      }
      const label = await doReverse(lat, lng);
      onChange?.(lat, lng, label);
    }, () => {} , { enableHighAccuracy: true });
  };

  if (!leaflet) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
        Loading map...
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMapEvents } = leaflet;

  function MapEventsHandler(props: { onClick?: (lat: number, lng: number) => void }) {
    useMapEvents({
      click(e: any) {
        props.onClick?.(e.latlng.lat, e.latlng.lng);
      }
    });
    return null;
  }

  return (
    <div>
      <div className="mb-2 flex gap-2">
        {showSearch && (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }} placeholder={placeholder} className="w-full rounded-2xl border border-slate-300 px-4 py-2" />
            <button type="button" onClick={() => void handleSearch()} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Search</button>
          </>
        )}
        <button type="button" onClick={handleUseCurrent} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Use Current Location</button>
      </div>

      <MapContainer
        center={value ? [value.lat, value.lng] : [12.9716, 77.5946]}
        zoom={value ? 16 : 11}
        style={{ height: minHeight, width: '100%', borderRadius: 12 }}
        whenCreated={(m: any) => {
          mapRef.current = m;
          setMapReady(true);
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <MapEventsHandler onClick={async (lat, lng) => {
          const label = await doReverse(lat, lng);
          onChange?.(lat, lng, label);
        }} />

        {value && (
          <Marker position={[value.lat, value.lng]} icon={icon} draggable eventHandlers={{
            dragend: async (e: any) => {
              const lat = e.target.getLatLng().lat; const lng = e.target.getLatLng().lng;
              const label = await doReverse(lat, lng);
              onChange?.(lat, lng, label);
              if (mapRef.current && mapReady) {
                try { mapRef.current.flyTo([lat, lng], 16); } catch (e) {}
              }
            }
          }}>
            <Popup>Selected location</Popup>
          </Marker>
        )}

        {children}
      </MapContainer>
    </div>
  );
}
