import { useEffect, useMemo, useState } from 'react';
import { searchGeocode, type GeocodeSuggestion } from './ReverseGeocoder';

export function AddressAutocomplete({
  value,
  onSelect,
  onChange,
  placeholder = 'Search address'
}: {
  value?: string;
  onSelect?: (suggestion: GeocodeSuggestion) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof value === 'string' && value.trim()) {
      setInput(value);
    }
  }, [value]);

  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const results = await searchGeocode(trimmed);
        setSuggestions(results);
        setLoading(false);
      })();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [input]);

  const handleChange = (nextValue: string) => {
    setInput(nextValue);
    onChange?.(nextValue);
  };

  const containerClassName = useMemo(() => 'relative w-full', []);

  return (
    <div className={containerClassName}>
      <input
        value={input}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            if (suggestions[0]) {
              const suggestion = suggestions[0];
              setInput(suggestion.display_name);
              onChange?.(suggestion.display_name);
              onSelect?.(suggestion);
            }
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-500"
      />
      {loading && input.trim() && <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">Searching places...</div>}
      {!loading && suggestions.length > 0 && (
        <div className="absolute z-[1000] mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.display_name}-${suggestion.lat}-${suggestion.lon}`}
              type="button"
              className="block w-full px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setInput(suggestion.display_name);
                onChange?.(suggestion.display_name);
                onSelect?.(suggestion);
              }}
            >
              {suggestion.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
