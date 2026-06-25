interface DoctorFiltersProps {
  values: {
    search: string;
    specialization: string;
    sortBy: string;
    radius: string;
    minExperience: string;
    maxFee: string;
  };
  onChange: (updates: Record<string, string>) => void;
  onApply: () => void;
  onReset: () => void;
}

export function DoctorFilters({ values, onChange, onApply, onReset }: DoctorFiltersProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium text-slate-700">
          <span className="mb-2 block">Search</span>
          <input
            value={values.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Doctor or specialty"
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 outline-none ring-0 focus:border-slate-500"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          <span className="mb-2 block">Specialty</span>
          <select
            value={values.specialization}
            onChange={(event) => onChange({ specialization: event.target.value })}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-slate-500"
          >
            <option value="">All specialties</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Dermatology">Dermatology</option>
            <option value="General Medicine">General Medicine</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Neurology">Neurology</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          <span className="mb-2 block">Sort by</span>
          <select
            value={values.sortBy}
            onChange={(event) => onChange({ sortBy: event.target.value })}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-slate-500"
          >
            <option value="distance">Nearest</option>
            <option value="rating">Highest rating</option>
            <option value="fee">Lowest fee</option>
            <option value="experience">Most experience</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          <span className="mb-2 block">Radius</span>
          <select
            value={values.radius}
            onChange={(event) => onChange({ radius: event.target.value })}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-slate-500"
          >
            <option value="5000">5 km</option>
            <option value="10000">10 km</option>
            <option value="20000">20 km</option>
            <option value="50000">50 km</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          <span className="mb-2 block">Minimum experience</span>
          <input
            type="number"
            min="0"
            value={values.minExperience}
            onChange={(event) => onChange({ minExperience: event.target.value })}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-slate-500"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          <span className="mb-2 block">Maximum fee</span>
          <input
            type="number"
            min="0"
            value={values.maxFee}
            onChange={(event) => onChange({ maxFee: event.target.value })}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-slate-500"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onApply}
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Apply filters
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
