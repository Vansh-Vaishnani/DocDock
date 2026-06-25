'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    try {
      await axios.post('/api/v1/auth/login', values);
      router.push('/');
    } catch (err) {
      setError('Login failed. Please check credentials.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold">Login</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input {...register('email')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input type="password" {...register('password')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-700">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
