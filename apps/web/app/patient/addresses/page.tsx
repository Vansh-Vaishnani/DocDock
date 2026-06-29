"use client";

import { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import MapPicker from '@/components/map/MapPicker';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useToast } from '../../auth/toast-provider';
import {
  addAddress,
  deletePatientAddress,
  listPatientAddresses,
  setDefaultPatientAddress,
  updatePatientAddress,
  type PatientAddress
} from '../api';

const schema = z.object({
  label: z.string().trim().min(3, 'Address name is required'),
  isDefault: z.boolean().optional().default(false)
});

type FormValues = z.infer<typeof schema>;

export default function PatientAddressesPage() {
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState<PatientAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddressLabel, setSelectedAddressLabel] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isDefault: false }
  });

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const result = await listPatientAddresses();
      setAddresses(result);
      const def = result.find((a) => a.isDefault) || result[0];
      if (def?.location?.coordinates) {
        const [lng, lat] = def.location.coordinates;
        setSelectedLocation({ lat, lng });
      }
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load addresses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAddresses();
  }, []);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      if (!selectedLocation) {
        showToast('Please choose a location on the map.', 'error');
        return;
      }
      const payload = {
        label: values.label.trim(),
        location: {
          type: 'Point' as const,
          coordinates: [selectedLocation.lng, selectedLocation.lat] as [number, number]
        },
        isDefault: values.isDefault || false
      };
      const response = await addAddress(payload);
      setAddresses(response.data.addresses);
      reset({ label: '', isDefault: false });
      setSelectedLocation(null);
      setSelectedAddressLabel('');
      showToast('Address added successfully.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to add address.';
      setError(message);
      showToast(message, 'error');
    }
  };

  const handleDelete = async (addressId: string) => {
    setActionId(addressId);
    try {
      const profile = await deletePatientAddress(addressId);
      setAddresses(profile.addresses);
      showToast('Address deleted.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to delete address.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    setActionId(addressId);
    try {
      const profile = await setDefaultPatientAddress(addressId);
      setAddresses(profile.addresses);
      showToast('Default address updated.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to set default address.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const startEdit = (address: PatientAddress) => {
    if (!address._id) return;
    setEditingId(address._id);
    setEditLabel(address.label);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
  };

  const saveEdit = async (addressId: string) => {
    if (!editLabel.trim()) {
      showToast('Address name is required.', 'error');
      return;
    }
    setActionId(addressId);
    try {
      const profile = await updatePatientAddress(addressId, { label: editLabel.trim() });
      setAddresses(profile.addresses);
      cancelEdit();
      showToast('Address updated.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to update address.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const defaultAddress = useMemo(() => addresses.find((address) => address.isDefault), [addresses]);

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Saved delivery locations</h2>
            <p className="mt-2 text-slate-600">Search a place, use your current location, or tap the map to save a home visit address.</p>
          </div>
          {defaultAddress && <div className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">Default: {defaultAddress.label}</div>}
        </div>

        {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Address name</label>
              <input {...register('label')} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" placeholder="Home / Work / Other" />
              {errors.label && <p className="mt-2 text-sm text-rose-600">{errors.label.message}</p>}
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" {...register('isDefault')} className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
              Set as default
            </label>
          </div>

          <div className="space-y-3">
            <MapPicker
              value={selectedLocation ?? null}
              onChange={(lat: number, lng: number, label?: string) => {
                setSelectedLocation({ lat, lng });
                setSelectedAddressLabel(label || '');
              }}
              minHeight={500}
              placeholder="Search for an address"
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Selected address</p>
              <p className="mt-1">{selectedAddressLabel || 'Search or tap the map to choose a location.'}</p>
            </div>
          </div>

          <button type="submit" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            Save address
          </button>
        </form>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold">Saved addresses</h3>
        <p className="mt-2 text-sm text-slate-600">Edit labels, set defaults, or remove addresses you no longer need.</p>

        {loading && <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">Loading addresses...</div>}

        {!loading && addresses.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
            No saved addresses yet.
          </div>
        )}

        {!loading && addresses.length > 0 && (
          <div className="mt-5 space-y-3">
            {addresses.map((address) => (
              <div key={address._id || address.label} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {editingId === address._id ? (
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">{address.label}</p>
                    )}
                    <p className="mt-1 text-sm text-slate-600">{selectedAddressLabel || 'Saved location'}</p>
                  </div>
                  {address.isDefault && <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Default</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {editingId === address._id ? (
                    <>
                      <button type="button" onClick={() => address._id && saveEdit(address._id)} disabled={actionId === address._id} className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">Save</button>
                      <button type="button" onClick={cancelEdit} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEdit(address)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Edit</button>
                      {!address.isDefault && address._id && (
                        <button type="button" onClick={() => { if (address._id) { void handleSetDefault(address._id); } }} disabled={actionId === address._id} className="rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60">Set default</button>
                      )}
                      {address._id && (
                        <button type="button" onClick={() => { if (address._id) { void handleDelete(address._id); } }} disabled={actionId === address._id} className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60">Delete</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
