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

  const urgencyConfig = {
    high: { color: 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50', textColor: '#e11d48', icon: '🚨', label: 'High Urgency' },
    medium: { color: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50', textColor: '#d97706', icon: '⚠️', label: 'Moderate Urgency' },
    low: { color: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50', textColor: '#059669', icon: '✅', label: 'Low Urgency' }
  };

  const urgency = result ? (urgencyConfig[result.urgencyLevel as keyof typeof urgencyConfig] ?? urgencyConfig.low) : null;

  return (
    <div className={`flex flex-col ${containerHeight} min-h-0`}>
      {/* Header with mode switcher */}
      <div className="dd-card shrink-0 p-4 mb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.4 7.2L21.6 12l-7.2 2.4L12 21.6l-2.4-7.2L2.4 12l7.2-2.4z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-600">24/7 Virtual health partner</p>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>AI Assistant</h2>
            </div>
          </div>
          {/* Mode Tabs */}
          <div className="flex rounded-full p-1 gap-1" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setMode('chat')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === 'chat'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              AI Chat
            </button>
            <button
              onClick={() => setMode('symptom-checker')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === 'symptom-checker'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              Symptom Check
            </button>
          </div>
        </div>
      </div>

      {/* Mode Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {mode === 'chat' ? (
          <AIAssistantChat containerHeight="flex-1 min-h-0" showTitleCard={false} />
        ) : (
          /* ── Symptom Checker: Clean vertical layout ── */
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-4">

            {/* Input form */}
            <div className="dd-card">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-base">🩺</span>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Describe Your Symptoms</h3>
              </div>
              <form onSubmit={handleSymptomSubmit} className="space-y-4">
                {/* Main symptoms */}
                <div>
                  <label className="dd-label">What symptoms are you experiencing? <span className="text-rose-500">*</span></label>
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={3}
                    className="dd-input resize-none"
                    placeholder="Describe in detail, e.g. Sharp chest pressure, dry cough, body aches, fatigue since morning..."
                    required
                  />
                </div>

                {/* Duration & Severity row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="dd-label">Duration <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="dd-input"
                      placeholder="e.g. 3 days, 2 hours"
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
                      <option value="mild">Mild – barely notice</option>
                      <option value="moderate">Moderate – affects activities</option>
                      <option value="severe">Severe – unbearable</option>
                    </select>
                  </div>
                </div>

                {/* Age & Gender row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="dd-label">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="dd-input"
                      placeholder="e.g. 29"
                      min={1}
                      max={120}
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
                      <option value="other">Other / Prefer not to say</option>
                    </select>
                  </div>
                </div>

                {/* Existing conditions */}
                <div>
                  <label className="dd-label">Existing conditions / Allergies</label>
                  <input
                    type="text"
                    value={existingDiseases}
                    onChange={(e) => setExistingDiseases(e.target.value)}
                    className="dd-input"
                    placeholder="e.g. Asthma, Penicillin allergy, Hypertension"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 rounded-xl font-bold text-sm shadow-emerald-sm disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Analyzing your symptoms...
                    </span>
                  ) : (
                    '✨ Analyze Symptoms'
                  )}
                </button>
              </form>
            </div>

            {/* Results */}
            {loading && (
              <div className="dd-card space-y-3 animate-pulse">
                <div className="h-5 rounded w-1/3" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                <div className="h-16 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                <div className="h-10 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                <div className="h-10 rounded w-2/3" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
              </div>
            )}

            {!loading && !result && (
              <div className="dd-card text-center py-10">
                <div className="text-5xl mb-3">🩺</div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>AI Triage Results will appear here</p>
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>Fill in the form above and click Analyze Symptoms.</p>
              </div>
            )}

            {!loading && result && urgency && (
              <div className="dd-card space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/40 text-base">📋</span>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>AI Triage Result</h3>
                </div>

                {/* Urgency banner */}
                <div className={`flex items-start gap-3 rounded-xl border p-4 ${urgency.color}`}>
                  <span className="text-xl mt-0.5 flex-shrink-0">{urgency.icon}</span>
                  <div>
                    <h4 className="font-bold text-sm" style={{ color: urgency.textColor }}>{urgency.label}</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {result.emergencyCareAdvised
                        ? 'Emergency medical attention is advised. Please seek help immediately.'
                        : 'General follow-up consultation is recommended.'}
                    </p>
                  </div>
                </div>

                {/* Possible conditions */}
                {result.possibleConditions?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Possible Conditions</p>
                    <div className="flex flex-wrap gap-2">
                      {result.possibleConditions.map((cond: string, idx: number) => (
                        <span
                          key={idx}
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                        >
                          {cond}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended specialist */}
                {result.recommendedSpecialist && (
                  <div className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Recommended Specialist</p>
                      <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{result.recommendedSpecialist}</p>
                    </div>
                    <a
                      href="/find-doctors"
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      Find Doctor →
                    </a>
                  </div>
                )}

                {/* Home care suggestions */}
                {result.homeCareSuggestions?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Home Care & Next Steps</p>
                    <ul className="space-y-2">
                      {result.homeCareSuggestions.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span className="flex-shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-[10px] rounded-lg p-3" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                  ⚕️ This is an AI-generated triage assessment for general guidance only and is not a medical diagnosis. Always consult a qualified doctor for accurate diagnosis and treatment.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
