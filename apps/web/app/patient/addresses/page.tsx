"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import LeafletMap from '@/components/map/LeafletMap';
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
  label: z.string().trim().min(3, 'Label is required'),
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
  

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isDefault: false }
  });

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const result = await listPatientAddresses();
      setAddresses(result);
      // if there's a default address, set it as the selected location so map centers
      const def = result.find((a) => a.isDefault) || result[0];
      if (def && def.location?.coordinates) {
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
        label: values.label,
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
      showToast('Label is required.', 'error');
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
    <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Address management</h2>
        <p className="mt-2 text-slate-600">Add and manage locations for home doctor visits.</p>

        {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Label</label>
            <input {...register('label')} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500" placeholder="Home / Work / Other" />
            {errors.label && <p className="mt-2 text-sm text-rose-600">{errors.label.message}</p>}
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-[1fr_320px]">
            <div>
              <LeafletMap
                value={selectedLocation ?? null}
                onChange={(lat: number, lng: number, label?: string) => {
                  setSelectedLocation({ lat, lng });
                  if (label && !document.activeElement) {
                    // avoid clobbering manual typing
                    // no-op: label may be used when saving
                  }
                }}
                minHeight={500}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Map controls</label>
              <div className="flex flex-col gap-2">
                <div className="text-sm text-slate-600">Click on the map or drag the marker to choose the exact location.</div>
              </div>
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
        <p className="mt-2 text-sm text-slate-600">Edit labels, set a default, or remove addresses you no longer need.</p>

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
                    <p className="mt-1 text-sm text-slate-600">
                      {address.location.coordinates[1]}, {address.location.coordinates[0]}
                    </p>
                  </div>
                  {address.isDefault && <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Default</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {editingId === address._id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => address._id && saveEdit(address._id)}
                        disabled={actionId === address._id}
                        className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button type="button" onClick={cancelEdit} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEdit(address)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        Edit
                      </button>
                      {!address.isDefault && address._id && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(address._id!)}
                          disabled={actionId === address._id}
                          className="rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                        >
                          Set default
                        </button>
                      )}
                      {address._id && (
                        <button
                          type="button"
                          onClick={() => handleDelete(address._id!)}
                          disabled={actionId === address._id}
                          className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
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
