'use client';

import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import MapPicker from '@/components/map/MapPicker';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useToast } from '../../auth/toast-provider';
import { fetchDoctorProfile, updateDoctorProfile, uploadDoctorDocument, removeDoctorDocument, type DoctorProfile } from '../api';

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  specialization: z.string().min(2),
  qualification: z.string().min(2),
  medicalDegree: z.string().min(2),
  licenseNumber: z.string().min(3),
  experience: z.coerce.number().min(0),
  consultationFee: z.coerce.number().min(0),
  languages: z.string().min(2),
  clinicName: z.string().min(2),
  bio: z.string().min(10),
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export default function DoctorProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [governmentIdFile, setGovernmentIdFile] = useState<File | null>(null);
  const [medicalLicenseFile, setMedicalLicenseFile] = useState<File | null>(null);
  const [clinicAddress, setClinicAddress] = useState<string>('');
  const [clinicLatLng, setClinicLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [serviceRadius, setServiceRadius] = useState<number>(10);
  const [consultationModes, setConsultationModes] = useState<string[]>(['clinic']);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    void fetchDoctorProfile()
      .then((result) => {
        setProfile(result);
        reset({
          fullName: result.fullName,
          email: result.email,
          phone: result.phone,
          specialization: result.specialization,
          qualification: result.qualifications[0] || '',
          medicalDegree: result.medicalDegree || '',
          licenseNumber: result.licenseNumber,
          experience: result.experience,
          consultationFee: result.consultationFee,
          languages: result.languages.join(', '),
          clinicName: result.clinicName || '',
          bio: result.bio,
          gender: (result.gender as FormValues['gender']) || 'other',
          dateOfBirth: result.dateOfBirth || ''
        });
        if (result.location?.coordinates && result.location.coordinates.length >= 2) {
          const [lng, lat] = result.location.coordinates;
          setClinicLatLng({ lat, lng });
        }
        setClinicAddress((result as any).clinicAddress || '');
        setServiceRadius((result as any).serviceRadius ?? 10);
        setConsultationModes((result as any).consultationModes || ['clinic']);
      })
      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Unable to load profile.', 'error'))
      .finally(() => setLoading(false));
  }, [reset, showToast]);

  const onSubmit = async (values: FormValues) => {
    if (consultationModes.length === 0) {
      showToast('Select at least one consultation mode.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...values,
        languages: values.languages.split(',').map((l) => l.trim()).filter(Boolean),
        qualification: values.qualification,
        consultationModes
      };
      if (clinicLatLng) {
        payload.location = { type: 'Point', coordinates: [clinicLatLng.lng, clinicLatLng.lat] };
        payload.clinicAddress = clinicAddress;
        payload.serviceRadius = serviceRadius;
      }
      const updated = await updateDoctorProfile(payload);
      setProfile(updated);
      showToast('Profile updated successfully.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (file: File, documentType: 'profilePhoto' | 'governmentId' | 'medicalLicense') => {
    setUploadingDoc(documentType);
    try {
      const result = await uploadDoctorDocument(file, documentType);
      setProfile((prev) => prev ? { ...prev, [documentType === 'profilePhoto' ? 'profilePhotoUrl' : documentType === 'governmentId' ? 'governmentIdUrl' : 'medicalLicenseUrl']: result.url } : null);
      showToast(`${documentType === 'profilePhoto' ? 'Profile photo' : documentType === 'governmentId' ? 'Government ID' : 'Medical license'} uploaded successfully.`, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDocumentRemove = async (documentType: 'profilePhoto' | 'governmentId' | 'medicalLicense') => {
    try {
      await removeDoctorDocument(documentType);
      setProfile((prev) => prev ? { ...prev, [documentType === 'profilePhoto' ? 'profilePhotoUrl' : documentType === 'governmentId' ? 'governmentIdUrl' : 'medicalLicenseUrl']: undefined } : null);
      showToast('Document removed successfully.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Removal failed.', 'error');
    }
  };

  if (loading) {
    return <div className="dd-card text-center p-8">Loading profile...</div>;
  }

  return (
    <div className="dd-card">
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Professional Profile</h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Edit your credentials and practice details.</p>

      {profile?.profilePhotoUrl && (
        <img src={profile.profilePhotoUrl} alt="Profile" className="mt-4 h-20 w-20 rounded-full object-cover border-2 border-emerald-500" />
      )}

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="dd-label">Full name</label>
          <input {...register('fullName')} className="dd-input" />
          {errors.fullName && <p className="mt-1 text-sm text-rose-600">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className="dd-label">Email</label>
          <input {...register('email')} className="dd-input" />
          {errors.email && <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="dd-label">Phone</label>
          <input {...register('phone')} className="dd-input" />
        </div>
        <div>
          <label className="dd-label">Gender</label>
          <select {...register('gender')} className="dd-input">
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="dd-label">Date of birth</label>
          <input type="date" {...register('dateOfBirth')} className="dd-input" />
        </div>
        <div>
          <label className="dd-label">Specialization</label>
          <input {...register('specialization')} className="dd-input" />
        </div>
        <div>
          <label className="dd-label">Qualification</label>
          <input {...register('qualification')} className="dd-input" />
        </div>
        <div>
          <label className="dd-label">Medical degree</label>
          <input {...register('medicalDegree')} className="dd-input" />
        </div>
        <div>
          <label className="dd-label">Council registration number</label>
          <input {...register('licenseNumber')} className="dd-input" />
        </div>
        <div>
          <label className="dd-label">Years of experience</label>
          <input type="number" {...register('experience')} className="dd-input" />
        </div>
        <div>
          <label className="dd-label">Consultation fee (₹)</label>
          <input type="number" {...register('consultationFee')} className="dd-input" />
        </div>
        <div>
          <label className="dd-label">Languages (comma-separated)</label>
          <input {...register('languages')} className="dd-input" />
        </div>
        <div>
          <label className="dd-label">Clinic / hospital name</label>
          <input {...register('clinicName')} className="dd-input" />
        </div>
        <div className="md:col-span-2">
          <h3 className="text-lg font-bold mt-2" style={{ color: 'var(--text-primary)' }}>Clinic Location</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Search a place, use your current location, or tap anywhere on the map to set the clinic address.</p>
          <div className="mt-3 space-y-3">
            <MapPicker
              value={clinicLatLng ?? null}
              onChange={(lat: number, lng: number, label?: string) => {
                setClinicLatLng({ lat, lng });
                if (label) setClinicAddress(label);
              }}
              minHeight={320}
              placeholder="Search clinic address"
            />
            <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Selected clinic address</p>
              <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{clinicAddress || 'Search or use current location to populate the address.'}</p>
            </div>
            {clinicLatLng && clinicAddress && (
              <button
                type="button"
                onClick={() => {}}
                className="btn-primary text-xs"
              >
                Location Selected
              </button>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="dd-label">Consultation modes</label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {[
                    { value: 'clinic', label: 'Clinic Consultation' },
                    { value: 'home', label: 'Home Visit' },
                    { value: 'online', label: 'Online Video Consultation' }
                  ].map((mode) => {
                    const checked = consultationModes.includes(mode.value);
                    return (
                      <label key={mode.value} className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40" style={{ backgroundColor: 'var(--input-bg)', borderColor: checked ? '#10b981' : 'var(--input-border)', color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConsultationModes([...consultationModes, mode.value]);
                            } else {
                              setConsultationModes(consultationModes.filter((m) => m !== mode.value));
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                        />
                        {mode.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="dd-label">Service radius (km) — for home visits</label>
                <input type="number" value={serviceRadius} onChange={(e) => setServiceRadius(Number(e.target.value))} className="dd-input" />
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="dd-label">About doctor</label>
          <textarea {...register('bio')} rows={4} className="dd-input resize-none" />
        </div>
        <div className="md:col-span-2 space-y-4 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <label className="dd-label">Profile photo</label>
            {profile?.profilePhotoUrl ? (
              <div className="flex items-center gap-4">
                <img src={profile.profilePhotoUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover border" />
                <div className="flex gap-2">
                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'profilePhoto')} className="text-xs" disabled={uploadingDoc === 'profilePhoto'} />
                  <button type="button" onClick={() => void handleDocumentRemove('profilePhoto')} disabled={uploadingDoc === 'profilePhoto'} className="btn-secondary text-xs px-3 py-1 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20">Remove</button>
                </div>
              </div>
            ) : (
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'profilePhoto')} className="w-full text-xs" disabled={uploadingDoc === 'profilePhoto'} />
            )}
          </div>
          <div>
            <label className="dd-label">Government ID</label>
            {profile?.governmentIdUrl ? (
              <div className="flex items-center gap-4">
                <a href={profile.governmentIdUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">View document</a>
                <div className="flex gap-2">
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'governmentId')} className="text-xs" disabled={uploadingDoc === 'governmentId'} />
                  <button type="button" onClick={() => void handleDocumentRemove('governmentId')} disabled={uploadingDoc === 'governmentId'} className="btn-secondary text-xs px-3 py-1 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20">Remove</button>
                </div>
              </div>
            ) : (
              <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'governmentId')} className="w-full text-xs" disabled={uploadingDoc === 'governmentId'} />
            )}
          </div>
          <div>
            <label className="dd-label">Medical Registration Certificate</label>
            {profile?.medicalLicenseUrl ? (
              <div className="flex items-center gap-4">
                <a href={profile.medicalLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">View document</a>
                <div className="flex gap-2">
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'medicalLicense')} className="text-xs" disabled={uploadingDoc === 'medicalLicense'} />
                  <button type="button" onClick={() => void handleDocumentRemove('medicalLicense')} disabled={uploadingDoc === 'medicalLicense'} className="btn-secondary text-xs px-3 py-1 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20">Remove</button>
                </div>
              </div>
            ) : (
              <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'medicalLicense')} className="w-full text-xs" disabled={uploadingDoc === 'medicalLicense'} />
            )}
          </div>
        </div>
        <div className="md:col-span-2 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
          <button type="submit" disabled={saving} className="btn-primary py-3 px-6 text-sm font-semibold">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
