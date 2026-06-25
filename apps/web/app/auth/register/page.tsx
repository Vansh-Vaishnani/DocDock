'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  role: z.enum(['patient', 'doctor'])
});

type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: RegisterForm) => {
    setError(null);
    try {
      await axios.post('/api/v1/auth/register', values);
      router.push('/auth/login');
    } catch (err) {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold">Register</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="block text-sm font-medium text-slate-700">Full name</label>
          <input {...register('fullName')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input {...register('email')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <label className="block text-sm font-medium text-slate-700">Phone</label>
          <input {...register('phone')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input type="password" {...register('password')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <label className="block text-sm font-medium text-slate-700">Role</label>
          <select {...register('role')} className="w-full rounded-2xl border border-slate-300 px-4 py-3">
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
          </select>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-700">
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}
