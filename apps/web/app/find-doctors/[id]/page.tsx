'use client';



import Link from 'next/link';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { useEffect, useMemo, useState } from 'react';



import { useAuth } from '../../auth/auth-context';

import { useToast } from '../../auth/toast-provider';

import {

  createPaymentOrder,

  fetchDoctorAvailableSlots,

  fetchPatientProfile,

  type PatientAddress,

  verifyPayment

} from '../../patient/api';

import MapPicker from '@/components/map/MapPicker';



const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';



async function fetchDoctorById(id: string) {

  const response = await fetch(`${API_BASE}/doctors/${id}`);

  if (!response.ok) {

    throw new Error('Doctor not found');

  }

  const payload = await response.json();

  return payload.data ?? payload;

}



function loadRazorpayCheckoutScript(): Promise<void> {

  return new Promise((resolve, reject) => {

    if (typeof window === 'undefined') {

      reject(new Error('Razorpay checkout is only available in the browser.'));

      return;

    }



    if ((window as Window & { Razorpay?: unknown }).Razorpay) {

      resolve();

      return;

    }



    const script = document.createElement('script');

    script.src = 'https://checkout.razorpay.com/v1/checkout.js';

    script.async = true;

    script.onload = () => resolve();

    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout script.'));

    document.body.appendChild(script);

  });

}



function formatSlotLabel(iso: string): string {

  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

}



function DoctorDetailsPageContent() {

  const params = useParams();

  const router = useRouter();

  const searchParams = useSearchParams();

  const { user, isHydrated } = useAuth();

  const { showToast } = useToast();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;



  const [selectedDate, setSelectedDate] = useState('');

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [notes, setNotes] = useState('');

  const [addresses, setAddresses] = useState<PatientAddress[]>([]);

  const [booking, setBooking] = useState(false);

  const [paymentStep, setPaymentStep] = useState<'booking' | 'paying' | 'paid' | 'failed'>('booking');

  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);

  const [selectedLocationLabel, setSelectedLocationLabel] = useState('');
  const [latParam, setLatParam] = useState<number | null>(null);
  const [lngParam, setLngParam] = useState<number | null>(null);



  const query = useQuery({

    queryKey: ['doctor', id],

    queryFn: () => fetchDoctorById(String(id)),

    enabled: Boolean(id),

    staleTime: 60_000

  });



  const slotsQuery = useQuery({

    queryKey: ['doctor-slots', id, selectedDate],

    queryFn: () => fetchDoctorAvailableSlots(String(id), selectedDate),

    enabled: Boolean(id && selectedDate),

    staleTime: 30_000

  });



  useEffect(() => {

    if (!isHydrated || user?.role !== 'patient') return;

    void fetchPatientProfile()

      .then((profile) => {

        setAddresses(profile.addresses);

        const defaultAddress = profile.addresses.find((a) => a.isDefault) ?? profile.addresses[0];

        if (defaultAddress?._id) {

          setSelectedAddressId(defaultAddress._id);

        }

      })

      .catch(() => setAddresses([]));

  }, [isHydrated, user?.role]);



  useEffect(() => {
    const labelParam = searchParams?.get('label');
    if (labelParam) {
      setSelectedLocationLabel(labelParam);
    }
    const lat = searchParams?.get('lat');
    const lng = searchParams?.get('lng');
    if (lat && lng) {
      setLatParam(Number(lat));
      setLngParam(Number(lng));
    }
  }, [searchParams]);



  const minDate = useMemo(() => {

    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  }, []);



  const selectedAddress = addresses.find((a) => a._id === selectedAddressId);



  const handleBook = async () => {

    if (!user || user.role !== 'patient') {

      router.push('/auth/login');

      return;

    }

    const hasLocation = latParam !== null && lngParam !== null;
    if (!selectedSlot || (!selectedAddress && !hasLocation)) {
      showToast('Please select a date, time slot, and an address or location.', 'error');
      return;
    }

    setBooking(true);

    try {

      const amount = Number(doctor.consultationFee || 0);

      const order = await createPaymentOrder({

        amount,

        doctorId: String(id),

        appointmentDate: selectedDate,

        appointmentTime: new Date(selectedSlot).toTimeString().slice(0, 5),

        addressId: selectedAddress?._id,

        location: hasLocation ? {
          label: selectedLocationLabel || 'Selected Location',
          location: {
            type: 'Point',
            coordinates: [lngParam!, latParam!]
          }
        } : undefined,

        notes: notes.trim() || undefined

      });

      setAppointmentId(null);

      setPaymentAmount(amount);

      setPaymentStep('paying');

      showToast('Payment is being prepared for your appointment.', 'success');



      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKey) {

        throw new Error('Razorpay is not configured. Missing NEXT_PUBLIC_RAZORPAY_KEY_ID.');

      }



      await loadRazorpayCheckoutScript();

      const Razorpay = (window as Window & { Razorpay?: any }).Razorpay;

      if (!Razorpay) {

        throw new Error('Razorpay checkout script could not be loaded.');

      }



      const options = {

        key: razorpayKey,

        amount: order.amount,

        currency: order.currency,

        name: 'DocDock',

        description: `Consultation booking for ${doctor.fullName || 'doctor'}`,

        order_id: order.orderId,

        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {

          try {

            const verification = await verifyPayment({

              razorpayOrderId: response.razorpay_order_id,

              razorpayPaymentId: response.razorpay_payment_id,

              razorpaySignature: response.razorpay_signature

            });

            setAppointmentId(verification.appointmentId ?? null);

            setPaymentStep('paid');

            if (verification.appointmentId) {

              router.push(`/patient/appointments/${verification.appointmentId}`);

            } else {

              router.push('/patient/appointments');

            }

          } catch (err: unknown) {

            setPaymentStep('failed');

            showToast(err instanceof Error ? err.message : 'Payment could not be verified.', 'error');

          }

        },

        modal: {

          ondismiss: () => {

            setPaymentStep('failed');

            showToast('Payment was cancelled. Your appointment is not confirmed.', 'error');

          }

        },

        prefill: {

          name: user.fullName || '',

          email: user.email || ''

        },

        theme: { color: '#059669' }

      };

      const rzp = new Razorpay(options);

      rzp.open();

    } catch (err: unknown) {

      showToast(err instanceof Error ? err.message : 'Unable to book appointment.', 'error');

    } finally {

      setBooking(false);

    }

  };



  if (!id) {

    return null;

  }



  if (query.isLoading) {

    return <div className="mx-auto max-w-5xl px-6 py-10 text-slate-600">Loading doctor profile...</div>;

  }



  if (query.isError || !query.data) {

    return <div className="mx-auto max-w-5xl px-6 py-10 text-slate-600">We could not load this doctor profile.</div>;

  }



  const doctor = query.data;



  return (

    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">

      <div className="mx-auto flex max-w-5xl flex-col gap-6">

        <Link href="/find-doctors" className="text-sm font-semibold text-emerald-600">

          ← Back to discovery

        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

            <div>

              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">{doctor.specialization}</p>

              <h1 className="mt-3 text-3xl font-semibold">{doctor.fullName || doctor.userId?.fullName || 'Doctor profile'}</h1>

              <p className="mt-3 max-w-2xl text-lg text-slate-600">

                {doctor.bio || 'Dedicated clinician offering compassionate care and modern treatment guidance.'}

              </p>

            </div>

            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">

              <p className="font-semibold text-slate-900">Consultation fee</p>

              <p className="mt-1 text-xl font-semibold text-slate-900">₹{doctor.consultationFee}</p>

              <p className="mt-2">

                {doctor.averageRating?.toFixed?.(1) ?? 0} rating • {doctor.reviewCount || 0} reviews

              </p>

            </div>

          </div>



          <div className="mt-8 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl border border-slate-200 p-4">

              <p className="text-sm font-semibold text-slate-900">Experience</p>

              <p className="mt-2 text-sm text-slate-600">{doctor.experience} years</p>

            </div>

            <div className="rounded-2xl border border-slate-200 p-4">

              <p className="text-sm font-semibold text-slate-900">Languages</p>

              <p className="mt-2 text-sm text-slate-600">{doctor.languages?.join(', ') || 'English'}</p>

            </div>

            <div className="rounded-2xl border border-slate-200 p-4">

              <p className="text-sm font-semibold text-slate-900">Availability</p>

              <p className="mt-2 text-sm text-slate-600">{doctor.availability?.isAvailable ? 'Available now' : 'Available on request'}</p>

            </div>

          </div>

        </section>



        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

          <h2 className="text-xl font-semibold text-slate-900">Book an appointment</h2>

          <p className="mt-2 text-sm text-slate-600">Select a date, choose an available slot, and confirm your visit address.</p>



          {!isHydrated ? (

            <p className="mt-6 text-sm text-slate-500">Loading...</p>

          ) : user?.role !== 'patient' ? (

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">

              <p>Please sign in as a patient to book an appointment.</p>

              <Link href="/auth/login" className="mt-2 inline-block font-semibold text-emerald-700">

                Sign in →

              </Link>

            </div>

          ) : (

            <div className="mt-6 space-y-6">

              <div>

                <label htmlFor="appointment-date" className="block text-sm font-medium text-slate-700">

                  Appointment date

                </label>

                <input

                  id="appointment-date"

                  type="date"

                  min={minDate}

                  value={selectedDate}

                  onChange={(e) => {

                    setSelectedDate(e.target.value);

                    setSelectedSlot(null);

                  }}

                  className="mt-2 rounded-xl border border-slate-300 px-4 py-2 text-sm"

                />

              </div>



              {selectedDate && (

                <div>

                  <p className="text-sm font-medium text-slate-700">Available slots</p>

                  {slotsQuery.isLoading && <p className="mt-2 text-sm text-slate-500">Loading slots...</p>}

                  {!slotsQuery.isLoading && (slotsQuery.data?.length ?? 0) === 0 && (

                    <p className="mt-2 text-sm text-slate-500">No slots available for this date.</p>

                  )}

                  <div className="mt-3 flex flex-wrap gap-2">

                    {(slotsQuery.data ?? []).map((slot) => (

                      <button

                        key={slot}

                        type="button"

                        onClick={() => setSelectedSlot(slot)}

                        className={`rounded-full px-4 py-2 text-sm font-medium ${

                          selectedSlot === slot

                            ? 'bg-emerald-600 text-white'

                            : 'border border-slate-300 text-slate-700 hover:bg-slate-50'

                        }`}

                      >

                        {formatSlotLabel(slot)}

                      </button>

                    ))}

                  </div>

                </div>

              )}



              <div>

                <p className="text-sm font-medium text-slate-700">Visit address</p>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="font-semibold text-slate-900">Booking location</p>

                      <p className="mt-1">{selectedLocationLabel || 'No location selected'}</p>

                    </div>

                    <Link

                      href="/find-doctors"

                      className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"

                    >

                      Change Location

                    </Link>

                  </div>

                </div>

              </div>



              <div>

                <label htmlFor="appointment-notes" className="block text-sm font-medium text-slate-700">

                  Notes (optional)

                </label>

                <textarea

                  id="appointment-notes"

                  value={notes}

                  onChange={(e) => setNotes(e.target.value)}

                  rows={3}

                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm"

                  placeholder="Describe symptoms or special instructions..."

                />

              </div>



              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">

                <p className="font-semibold text-slate-900">Booking flow</p>

                <p className="mt-1">You will complete the appointment booking and pay securely through Razorpay before the booking is confirmed.</p>

              </div>



              <button

                type="button"

                disabled={booking || !selectedSlot || (!selectedAddress && (latParam === null || lngParam === null))}

                onClick={() => void handleBook()}

                className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"

              >

                {booking ? 'Preparing payment...' : paymentStep === 'paying' ? 'Complete payment' : 'Book appointment'}

              </button>



              {paymentStep === 'paid' && appointmentId && (

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">

                  Payment successful. Your appointment has been confirmed. <Link href={`/patient/appointments/${appointmentId}`} className="font-semibold">View details</Link>

                </div>

              )}



              {paymentStep === 'paying' && paymentAmount && (

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">

                  Complete the Razorpay checkout to confirm this appointment. Amount due: ₹{paymentAmount}.

                </div>

              )}



              {paymentStep === 'failed' && (

                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">

                  Payment was not completed, so the appointment remains unconfirmed. Please try again when you are ready.

                </div>

              )}

            </div>

          )}

        </section>

      </div>

    </main>

  );

}



export default function DoctorDetailsPage() {

  return <DoctorDetailsPageContent />;

}

