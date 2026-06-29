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
  const [consultationType, setConsultationType] = useState<'home' | 'clinic' | 'both'>('clinic');

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
        setConsultationType(((result as any).consultationType as any) || 'clinic');
      })
      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Unable to load profile.', 'error'))
      .finally(() => setLoading(false));
  }, [reset, showToast]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...values,
        languages: values.languages.split(',').map((l) => l.trim()).filter(Boolean),
        qualification: values.qualification
      };
      if (clinicLatLng) {
        payload.location = { type: 'Point', coordinates: [clinicLatLng.lng, clinicLatLng.lat] };
        payload.clinicAddress = clinicAddress;
        payload.serviceRadius = serviceRadius;
        payload.consultationType = consultationType;
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
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">Loading profile...</div>;
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Professional profile</h2>
      <p className="mt-2 text-slate-600">Edit your credentials and practice details.</p>

      {profile?.profilePhotoUrl && (
        <img src={profile.profilePhotoUrl} alt="Profile" className="mt-4 h-20 w-20 rounded-full object-cover" />
      )}

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-2 block text-sm font-medium">Full name</label>
          <input {...register('fullName')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          {errors.fullName && <p className="mt-1 text-sm text-rose-600">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Email</label>
          <input {...register('email')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          {errors.email && <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Phone</label>
          <input {...register('phone')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Gender</label>
          <select {...register('gender')} className="w-full rounded-2xl border border-slate-300 px-4 py-3">
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Date of birth</label>
          <input type="date" {...register('dateOfBirth')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Specialization</label>
          <input {...register('specialization')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Qualification</label>
          <input {...register('qualification')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Medical degree</label>
          <input {...register('medicalDegree')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Council registration number</label>
          <input {...register('licenseNumber')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Years of experience</label>
          <input type="number" {...register('experience')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Consultation fee (₹)</label>
          <input type="number" {...register('consultationFee')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Languages (comma-separated)</label>
          <input {...register('languages')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Clinic / hospital name</label>
          <input {...register('clinicName')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div className="md:col-span-2">
          <h3 className="text-lg font-semibold">Clinic location</h3>
          <p className="mt-1 text-sm text-slate-600">Search a place, use your current location, or tap anywhere on the map to set the clinic address.</p>
          <div className="mt-3 space-y-3">
            <MapPicker
              key={mapKey}
              value={clinicLatLng ?? null}
              onChange={(lat: number, lng: number, label?: string) => {
                setClinicLatLng({ lat, lng });
                if (label) setClinicAddress(label);
                setMapKey((prev) => prev + 1);
              }}
              minHeight={420}
              placeholder="Search clinic address"
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Selected clinic address</p>
              <p className="mt-1">{clinicAddress || 'Search or use current location to populate the address.'}</p>
            </div>
            {clinicLatLng && clinicAddress && (
              <button
                type="button"
                onClick={() => {
                  // Location is already selected via onChange, this button just confirms
                }}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Location Selected
              </button>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Consultation type</label>
                <select value={consultationType} onChange={(e) => setConsultationType(e.target.value as any)} className="w-full rounded-2xl border border-slate-300 px-4 py-3">
                  <option value="clinic">Clinic</option>
                  <option value="home">Home visit</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Service radius (km)</label>
                <input type="number" value={serviceRadius} onChange={(e) => setServiceRadius(Number(e.target.value))} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">About doctor</label>
          <textarea {...register('bio')} rows={4} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Profile photo</label>
            {profile?.profilePhotoUrl ? (
              <div className="flex items-center gap-4">
                <img src={profile.profilePhotoUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
                <div className="flex gap-2">
                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'profilePhoto')} className="text-sm" disabled={uploadingDoc === 'profilePhoto'} />
                  <button type="button" onClick={() => void handleDocumentRemove('profilePhoto')} disabled={uploadingDoc === 'profilePhoto'} className="rounded-full border border-rose-300 px-3 py-1 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50">Remove</button>
                </div>
              </div>
            ) : (
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'profilePhoto')} className="w-full text-sm" disabled={uploadingDoc === 'profilePhoto'} />
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Government ID</label>
            {profile?.governmentIdUrl ? (
              <div className="flex items-center gap-4">
                <a href={profile.governmentIdUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 underline">View document</a>
                <div className="flex gap-2">
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'governmentId')} className="text-sm" disabled={uploadingDoc === 'governmentId'} />
                  <button type="button" onClick={() => void handleDocumentRemove('governmentId')} disabled={uploadingDoc === 'governmentId'} className="rounded-full border border-rose-300 px-3 py-1 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50">Remove</button>
                </div>
              </div>
            ) : (
              <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'governmentId')} className="w-full text-sm" disabled={uploadingDoc === 'governmentId'} />
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Medical Registration Certificate</label>
            {profile?.medicalLicenseUrl ? (
              <div className="flex items-center gap-4">
                <a href={profile.medicalLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 underline">View document</a>
                <div className="flex gap-2">
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'medicalLicense')} className="text-sm" disabled={uploadingDoc === 'medicalLicense'} />
                  <button type="button" onClick={() => void handleDocumentRemove('medicalLicense')} disabled={uploadingDoc === 'medicalLicense'} className="rounded-full border border-rose-300 px-3 py-1 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50">Remove</button>
                </div>
              </div>
            ) : (
              <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'medicalLicense')} className="w-full text-sm" disabled={uploadingDoc === 'medicalLicense'} />
            )}
          </div>
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={saving} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70">
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  );
}
