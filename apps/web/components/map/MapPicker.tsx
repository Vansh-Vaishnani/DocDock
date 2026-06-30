'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { LocationSearch } from './LocationSearch';
import { ReverseGeocoder, reverseGeocode, type GeocodeSuggestion, type LatLng } from './ReverseGeocoder';

export function createSvgIcon(color: string, size = 28) {
  if (typeof window === 'undefined') return undefined;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}"/>
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  `;
  const leaflet = require('leaflet');
  return leaflet.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [size / 2, size] });
}

interface LeafletModule {
  MapContainer: any;
  TileLayer: any;
  Marker: any;
  Popup: any;
  useMapEvents: any;
}

export default function MapPicker({
  value,
  onChange,
  minHeight = 480,
  showSearch = true,
  placeholder = 'Search address',
  children,
  initialCenter = [12.9716, 77.5946],
  initialZoom = 11
}: {
  value?: LatLng | null;
  onChange?: (lat: number, lng: number, label?: string) => void;
  minHeight?: number;
  showSearch?: boolean;
  placeholder?: string;
  children?: React.ReactNode;
  initialCenter?: [number, number];
  initialZoom?: number;
}) {
  const mapRef = useRef<any | null>(null);
  const [leaflet, setLeaflet] = useState<LeafletModule | null>(null);
  const [icon, setIcon] = useState<any>(undefined);
  const [searchText, setSearchText] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    void import('react-leaflet').then((module) => setLeaflet(module as LeafletModule));
    void import('leaflet').then((leafletModule: any) => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#0ea5e9"/>
          <circle cx="12" cy="9" r="2.5" fill="white" />
        </svg>
      `;
      setIcon(leafletModule.divIcon({ html: svg, className: '', iconSize: [28, 28], iconAnchor: [14, 28] }));
    }).catch(() => setIcon(undefined));
  }, []);

  const centerMap = (lat: number, lng: number, zoom = 16) => {
    if (!mapRef.current || !mapReady) return;
    try {
      mapRef.current.flyTo([lat, lng], zoom, { duration: 1.1, easeLinearity: 0.25 });
    } catch {
      try {
        mapRef.current.setView([lat, lng], zoom);
      } catch {}
    }
  };

  useEffect(() => {
    if (!mapRef.current || !mapReady || !value) return;
    centerMap(value.lat, value.lng, 16);
  }, [value?.lat, value?.lng, mapReady]);

  const handleSelection = async (lat: number, lng: number, label?: string) => {
    const resolvedLabel = label || (await reverseGeocode(lat, lng));
    setResolvedAddress(resolvedLabel);
    setSearchText(resolvedLabel);
    onChange?.(lat, lng, resolvedLabel);
    centerMap(lat, lng, 16);
  };

  const lastPanTime = useRef<number>(0);
  const handleMouseMove = (lat: number, lng: number) => {
    const now = Date.now();
    if (now - lastPanTime.current > 150) {
      lastPanTime.current = now;
      if (mapRef.current) {
        mapRef.current.panTo([lat, lng], { animate: true, duration: 0.6 });
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      void handleSelection(pos.coords.latitude, pos.coords.longitude);
    }, () => {}, { enableHighAccuracy: true });
  };

  const handleSelectSuggestion = async (suggestion: GeocodeSuggestion) => {
    const lat = Number(suggestion.lat);
    const lng = Number(suggestion.lon);
    await handleSelection(lat, lng, suggestion.display_name);
  };

  if (!leaflet) {
    return <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">Loading map...</div>;
  }

  const { MapContainer, TileLayer, Marker, Popup, useMapEvents } = leaflet;

  function MapEventsHandler(props: { onClick?: (lat: number, lng: number) => void; onMouseMove?: (lat: number, lng: number) => void }) {
    useMapEvents({
      click(e: any) {
        props.onClick?.(e.latlng.lat, e.latlng.lng);
      },
      mousemove(e: any) {
        props.onMouseMove?.(e.latlng.lat, e.latlng.lng);
      }
    });
    return null;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
      {showSearch && (
        <div className="border-b border-slate-200 p-4">
          <LocationSearch
            value={searchText}
            onSearchValueChange={(value) => setSearchText(value)}
            onSelectSuggestion={handleSelectSuggestion}
            onUseCurrentLocation={handleUseCurrentLocation}
            placeholder={placeholder}
          />
        </div>
      )}
      <ReverseGeocoder value={value} onResolved={(label) => setResolvedAddress(label)} />
      <MapContainer
        center={value ? [value.lat, value.lng] : initialCenter}
        zoom={value ? 16 : initialZoom}
        style={{ height: minHeight, width: '100%' }}
        whenCreated={(mapInstance: any) => {
          mapRef.current = mapInstance;
          setMapReady(true);
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <MapEventsHandler 
          onClick={(lat, lng) => { void handleSelection(lat, lng); }} 
          onMouseMove={handleMouseMove}
        />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={icon}
            draggable
            eventHandlers={{
              drag: (event: any) => {
                const lat = event.target.getLatLng().lat;
                const lng = event.target.getLatLng().lng;
                mapRef.current?.panTo([lat, lng], { animate: true, duration: 0.1 });
              },
              dragend: async (event: any) => {
                const lat = event.target.getLatLng().lat;
                const lng = event.target.getLatLng().lng;
                await handleSelection(lat, lng);
              }
            }}
          >
            <Popup>Selected location</Popup>
          </Marker>
        )}
        {children}
      </MapContainer>
    </div>
  );
}
