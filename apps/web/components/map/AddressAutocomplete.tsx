import { useEffect, useMemo, useState, useRef } from 'react';
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
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammatic = useRef(false);

  // Sync with value prop (e.g. initial load or map drag selection)
  useEffect(() => {
    if (typeof value === 'string' && value !== input) {
      isProgrammatic.current = true;
      setInput(value);
    }
  }, [value]);

  // Fetch suggestions when user is typing
  useEffect(() => {
    if (isProgrammatic.current) {
      isProgrammatic.current = false;
      return;
    }

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
        setShowDropdown(true);
        setLoading(false);
      })();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [input]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (nextValue: string) => {
    isProgrammatic.current = false;
    setInput(nextValue);
    onChange?.(nextValue);
  };

  const containerClassName = useMemo(() => 'relative w-full', []);

  return (
    <div ref={containerRef} className={containerClassName}>
      <input
        value={input}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            if (suggestions[0]) {
              const suggestion = suggestions[0];
              isProgrammatic.current = true;
              setInput(suggestion.display_name);
              onChange?.(suggestion.display_name);
              onSelect?.(suggestion);
              setShowDropdown(false);
            }
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500"
      />
      
      {loading && input.trim().length >= 2 && (
        <div className="absolute z-[1000] mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500 shadow-lg w-full">
          Searching places...
        </div>
      )}

      {!loading && showDropdown && input.trim().length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-[1000] mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-lg w-full text-center">
          Nothing found
        </div>
      )}

      {!loading && showDropdown && suggestions.length > 0 && (
        <div className="absolute z-[1000] mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.display_name}-${suggestion.lat}-${suggestion.lon}`}
              type="button"
              className="block w-full px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                isProgrammatic.current = true;
                setInput(suggestion.display_name);
                onChange?.(suggestion.display_name);
                onSelect?.(suggestion);
                setShowDropdown(false);
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
