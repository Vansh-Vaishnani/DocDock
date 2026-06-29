import { calculateDistanceKm, formatDistanceKm } from '@/lib/locationUtils';

export type DistancePoint = { lat: number; lng: number } | null | undefined;

export function DistanceCalculator({ from, to }: { from?: DistancePoint; to?: DistancePoint }) {
  if (!from || !to) return <span className="text-slate-500">—</span>;
  const distanceMeters = calculateDistanceKm(from.lat, from.lng, to.lat, to.lng) * 1000;
  return <span>{formatDistanceKm(distanceMeters)}</span>;
}
