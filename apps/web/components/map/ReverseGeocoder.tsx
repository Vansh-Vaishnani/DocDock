import { useEffect } from 'react';



export type LatLng = { lat: number; lng: number };



export type GeocodeSuggestion = {

  display_name: string;

  lat: string;

  lon: string;

};



export async function reverseGeocode(lat: number, lng: number): Promise<string> {

  try {

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);

    const data = await response.json();

    return data?.display_name || '';

  } catch {

    return '';

  }

}



export async function searchGeocode(query: string): Promise<GeocodeSuggestion[]> {

  if (!query.trim()) return [];

  try {

    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`);

    const data = await response.json();

    return Array.isArray(data) ? data : [];

  } catch {

    return [];

  }

}



export function ReverseGeocoder({ value, onResolved }: { value?: LatLng | null; onResolved?: (label: string) => void }) {

  useEffect(() => {

    if (!value) return;

    void reverseGeocode(value.lat, value.lng).then((label) => onResolved?.(label));

  }, [value?.lat, value?.lng, onResolved]);



  return null;

}

