'use client';

import { useState } from 'react';
import { AIAssistantChat } from './AIAssistantChat';
import { useToast } from '../../app/auth/toast-provider';

interface UnifiedAIAssistantProps {
  containerHeight?: string;
  defaultMode?: 'chat' | 'symptom-checker';
}

export function UnifiedAIAssistant({
  containerHeight = 'h-[75vh]',
  defaultMode = 'chat'
}: UnifiedAIAssistantProps) {
  const [mode, setMode] = useState<'chat' | 'symptom-checker'>(defaultMode);

  // Symptom Checker State
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

  const handleSymptomSubmit = async (e: React.FormEvent) => {
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
    <div className={`flex flex-col ${containerHeight} space-y-4 min-h-0`}>
      {/* Unified AI Assistant Header */}
      <div className="dd-card shrink-0 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-600">24/7 Virtual health partner</p>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">AI Assistant</h2>
          </div>
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-full bg-slate-100 dark:bg-slate-800 p-1 border dark:border-slate-700">
            <button
              onClick={() => setMode('chat')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                mode === 'chat'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              AI Chat
            </button>
            <button
              onClick={() => setMode('symptom-checker')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                mode === 'symptom-checker'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Symptom Checker
            </button>
          </div>
        </div>
      </div>

      {/* Mode Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {mode === 'chat' ? (
          <AIAssistantChat containerHeight="flex-1 min-h-0" showTitleCard={false} />
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 h-full pr-1">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Form */}
              <div className="dd-card">
                <h3 className="text-sm font-semibold mb-3 text-slate-800 dark:text-slate-200">Describe Symptoms</h3>
                <form onSubmit={handleSymptomSubmit} className="space-y-3.5">
                  <div>
                    <label className="dd-label !text-[11px]">What symptoms are you experiencing? <span className="text-rose-500">*</span></label>
                    <textarea
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      rows={3}
                      className="dd-input resize-none text-xs"
                      placeholder="e.g. Sharp chest pressure, dry cough, body aches..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="dd-label !text-[11px]">Age</label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="dd-input text-xs"
                        placeholder="e.g. 29"
                      />
                    </div>
                    <div>
                      <label className="dd-label !text-[11px]">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="dd-input text-xs"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="dd-label !text-[11px]">Duration <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="dd-input text-xs"
                        placeholder="e.g. 3 days"
                        required
                      />
                    </div>
                    <div>
                      <label className="dd-label !text-[11px]">Severity</label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="dd-input text-xs"
                      >
                        <option value="mild">Mild (barely notice)</option>
                        <option value="moderate">Moderate (affects activities)</option>
                        <option value="severe">Severe (unbearable)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="dd-label !text-[11px]">Existing Illnesses / Allergies</label>
                    <input
                      type="text"
                      value={existingDiseases}
                      onChange={(e) => setExistingDiseases(e.target.value)}
                      className="dd-input text-xs"
                      placeholder="e.g. Asthma, Penicillin allergy"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-2.5 rounded-xl font-semibold text-xs shadow-md"
                  >
                    {loading ? 'Analyzing Symptoms...' : 'Analyze Symptoms'}
                  </button>
                </form>
              </div>

              {/* Triage Output */}
              <div className="dd-card flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-slate-800 dark:text-slate-200">AI Triage Result</h3>
                  
                  {!loading && !result && (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      <span className="text-3xl block mb-2">🩺</span>
                      Submit the form on the left to see triage assessment.
                    </div>
                  )}

                  {loading && (
                    <div className="space-y-3.5 animate-pulse">
                      <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                      <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded" />
                      <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded" />
                      <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
                    </div>
                  )}

                  {!loading && result && (
                    <div className="space-y-4 text-xs">
                      {/* Urgency */}
                      <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                        result.urgencyLevel === 'high'
                          ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50'
                          : result.urgencyLevel === 'medium'
                          ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50'
                          : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                      }`}>
                        <span className="text-base">
                          {result.urgencyLevel === 'high' ? '🚨' : result.urgencyLevel === 'medium' ? '⚠️' : '✅'}
                        </span>
                        <div>
                          <h4 className="font-bold capitalize" style={{ color: result.urgencyLevel === 'high' ? '#e11d48' : result.urgencyLevel === 'medium' ? '#d97706' : '#059669' }}>
                            Urgency Level: {result.urgencyLevel}
                          </h4>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                            {result.emergencyCareAdvised
                              ? 'Emergency medical attention is advised. Do not delay.'
                              : 'General follow-up consultation is advised.'}
                          </p>
                        </div>
                      </div>

                      {/* Conditions */}
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-300">Possible Conditions</h4>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {result.possibleConditions?.map((cond: string, idx: number) => (
                            <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
                              {cond}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Specialist */}
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-300">Recommended Specialist</h4>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{result.recommendedSpecialist || 'General Physician'}</p>
                      </div>

                      {/* Home Care */}
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-300">Home Care & Next Steps</h4>
                        <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600 dark:text-slate-400">
                          {result.homeCareSuggestions?.map((item: string, idx: number) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
