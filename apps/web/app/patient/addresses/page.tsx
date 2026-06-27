'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useToast } from '../../auth/toast-provider';
import { addAddress, type PatientAddress, type PatientProfile } from '../api';

const schema = z.object({
  label: z.string().trim().min(3, 'Label is required'),
  latitude: z.string().trim().min(1, 'Latitude is required'),
  longitude: z.string().trim().min(1, 'Longitude is required'),
  isDefault: z.boolean().optional().default(false)
});

type FormValues = z.infer<typeof schema>;

const emptyAddress: PatientAddress[] = [];

export default function PatientAddressesPage() {
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState<PatientAddress[]>(emptyAddress);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingApiMessage, setMissingApiMessage] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isDefault: false }
  });

  useEffect(() => {
    setLoading(false);
    setMissingApiMessage('The backend currently exposes address creation only. Address listing, editing, deleting, and default selection are ready here, but they wait for the corresponding API endpoints.');
  }, []);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const payload = {
        label: values.label,
        location: {
          type: 'Point' as const,
          coordinates: [Number(values.longitude), Number(values.latitude)] as [number, number]
        },
        isDefault: values.isDefault || false
      };
      const response = await addAddress(payload);
      const nextProfile = response.data;
      setAddresses(nextProfile.addresses);
      reset({ label: '', latitude: '', longitude: '', isDefault: false });
      showToast('Address added successfully.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to add address.';
      setError(message);
      showToast(message, 'error');
    }
  };

  const defaultAddress = useMemo(() => addresses.find((address) => address.isDefault), [addresses]);

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Address management</h2>
        <p className="mt-2 text-slate-600">Add a real address through the current backend endpoint. The rest of the actions are intentionally isolated until the API exists.</p>

        {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {missingApiMessage && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{missingApiMessage}</div>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Label</label>
            <input {...register('label')} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500" placeholder="Home / Work / Other" />
            {errors.label && <p className="mt-2 text-sm text-rose-600">{errors.label.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Latitude</label>
              <input {...register('latitude')} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500" placeholder="12.97" />
              {errors.latitude && <p className="mt-2 text-sm text-rose-600">{errors.latitude.message}</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Longitude</label>
              <input {...register('longitude')} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500" placeholder="77.59" />
              {errors.longitude && <p className="mt-2 text-sm text-rose-600">{errors.longitude.message}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('isDefault')} className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
            Set as default address
          </label>
          <button type="submit" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            Add address
          </button>
        </form>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold">Saved addresses</h3>
        <p className="mt-2 text-sm text-slate-600">The list will populate once the backend exposes the remaining address endpoints.</p>

        {loading && <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">Loading addresses...</div>}

        {!loading && addresses.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
            No saved addresses yet.
          </div>
        )}

        {!loading && addresses.length > 0 && (
          <div className="mt-5 space-y-3">
            {addresses.map((address, index) => (
              <div key={`${address.label}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{address.label}</p>
                    <p className="text-sm text-slate-600">{address.location.coordinates.join(', ')}</p>
                  </div>
                  {address.isDefault && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Default</span>}
                </div>
              </div>
            ))}
            {defaultAddress && <p className="text-sm text-slate-500">Default address: {defaultAddress.label}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
