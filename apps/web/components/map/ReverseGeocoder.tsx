import { useEffect } from 'react';



export type LatLng = { lat: number; lng: number };



export type GeocodeSuggestion = {

  display_name: string;

  lat: string;

  lon: string;

};



const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/maps/reverse?lat=${lat}&lng=${lng}`);
    const data = await response.json();
    return data?.display_name || '';
  } catch {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      return data?.display_name || '';
    } catch {
      return '';
    }
  }
}

export async function searchGeocode(query: string): Promise<GeocodeSuggestion[]> {
  if (!query.trim()) return [];
  try {
    const response = await fetch(`${API_BASE}/maps/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
}



export function ReverseGeocoder({ value, onResolved }: { value?: LatLng | null; onResolved?: (label: string) => void }) {

  useEffect(() => {

    if (!value) return;

    void reverseGeocode(value.lat, value.lng).then((label) => onResolved?.(label));

  }, [value?.lat, value?.lng, onResolved]);



  return null;

}

