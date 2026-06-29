import { AddressAutocomplete } from './AddressAutocomplete';
import type { GeocodeSuggestion } from './ReverseGeocoder';

export function LocationSearch({
  value,
  onSearchValueChange,
  onSelectSuggestion,
  onUseCurrentLocation,
  placeholder = 'Search address'
}: {
  value?: string;
  onSearchValueChange?: (value: string) => void;
  onSelectSuggestion?: (suggestion: GeocodeSuggestion) => void;
  onUseCurrentLocation?: () => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-start">
      <div className="flex-1">
        <AddressAutocomplete value={value} onChange={onSearchValueChange} onSelect={onSelectSuggestion} placeholder={placeholder} />
      </div>
      <button type="button" onClick={onUseCurrentLocation} className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
        Use current location
      </button>
    </div>
  );
}
