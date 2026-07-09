'use client';

import { useState } from 'react';
import { useToast } from '../../auth/toast-provider';
import Link from 'next/link';

export default function AISymptomCheckerPage() {
  const { showToast } = useToast();
  const [symptoms, setSymptoms] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('mild');
  const [existingDiseases, setExistingDiseases] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const getStoredAccessToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
      if (!raw) return null;
      return (JSON.parse(raw) as { accessToken?: string }).accessToken || null;
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim() || !duration.trim()) {
      showToast('Symptoms and duration are required.', 'error');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const token = getStoredAccessToken();
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const res = await fetch(`${API_BASE}/ai/symptom-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symptoms,
          age: age ? Number(age) : undefined,
          gender,
          duration,
          severity,
          existingDiseases: existingDiseases.trim() || undefined
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Symptom analysis failed.');
      }

      const data = await res.json();
      setResult(data.data);
      showToast('Symptom analysis completed.', 'success');
    } catch (err: any) {
      showToast(err.message || 'An error occurred during analysis.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="dd-card">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-600">Advanced diagnostic tools</p>
        <h2 className="mt-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Symptom Checker</h2>
        <p className="mt-1 text-sm text-slate-500">Provide details about what you are experiencing. Our clinical AI will analyze potential urgency and recommend action paths.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Form panel */}
        <div className="dd-card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Describe Symptoms</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="dd-label">What symptoms are you experiencing? <span className="text-rose-500">*</span></label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={3}
                className="dd-input resize-none"
                placeholder="e.g. Sharp chest pressure, dry cough, body aches..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="dd-label">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="dd-input"
                  placeholder="e.g. 29"
                />
              </div>
              <div>
                <label className="dd-label">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="dd-input"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="dd-label">Duration <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="dd-input"
                  placeholder="e.g. 3 days, 1 week"
                  required
                />
              </div>
              <div>
                <label className="dd-label">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="dd-input"
                >
                  <option value="mild">Mild (barely notice)</option>
                  <option value="moderate">Moderate (affects daily activities)</option>
                  <option value="severe">Severe (unbearable/emergency)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="dd-label">Existing Illnesses / Allergies</label>
              <input
                type="text"
                value={existingDiseases}
                onChange={(e) => setExistingDiseases(e.target.value)}
                className="dd-input"
                placeholder="e.g. Asthma, Hypertension, Penicillin allergy"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl font-semibold"
            >
              {loading ? 'Analyzing Symptoms...' : 'Analyze Symptoms'}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div className="dd-card flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>AI Triage Result</h3>
            
            {!loading && !result && (
              <div className="text-center py-12 text-slate-400">
                <span className="text-4xl block mb-2">🩺</span>
                Submit the form on the left to see triage assessment.
              </div>
            )}

            {loading && (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
              </div>
            )}

            {!loading && result && (
              <div className="space-y-4">
                {/* Urgency and Emergency advice */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  result.urgencyLevel === 'high'
                    ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50'
                    : result.urgencyLevel === 'medium'
                    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50'
                    : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                }`}>
                  <span className="text-xl">
                    {result.urgencyLevel === 'high' ? '🚨' : result.urgencyLevel === 'medium' ? '⚠️' : '✅'}
                  </span>
                  <div>
                    <h4 className="font-bold capitalize" style={{ color: result.urgencyLevel === 'high' ? '#e11d48' : result.urgencyLevel === 'medium' ? '#d97706' : '#059669' }}>
                      Urgency Level: {result.urgencyLevel}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {result.emergencyCareAdvised
                        ? 'Emergency medical attention is advised. Do not delay.'
                        : 'General follow-up consultation is advised. Home care tips below.'}
                    </p>
                  </div>
                </div>

                {/* Possible Conditions */}
                <div>
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-300">Possible Conditions</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {result.possibleConditions?.map((cond: string, idx: number) => (
                      <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-medium">
                        {cond}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Specialist */}
                <div>
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-300">Recommended Specialist</h4>
                  <p className="text-sm mt-1 font-semibold text-emerald-600 dark:text-emerald-400">{result.recommendedSpecialist || 'General Practitioner'}</p>
                </div>

                {/* Home Care */}
                <div>
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-300">Home Care & Next Steps</h4>
                  <ul className="list-disc pl-5 text-xs space-y-1.5 mt-2 text-slate-600 dark:text-slate-400">
                    {result.homeCareSuggestions?.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {!loading && result && (
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              {/* Disclaimer */}
              <p className="text-[10px] text-rose-500 font-semibold mb-4 leading-normal italic">
                ⚠️ Disclaimer: {result.disclaimer}
              </p>

              <div className="flex gap-2">
                <Link
                  href={`/find-doctors?specialization=${encodeURIComponent(result.recommendedSpecialist || '')}`}
                  className="w-full btn-primary text-xs py-2.5 rounded-xl font-bold text-center"
                >
                  Book Recommended Doctor
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
