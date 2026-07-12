'use client';

import { UnifiedAIAssistant } from '../../../components/ai/UnifiedAIAssistant';

export default function AISymptomCheckerPage() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <UnifiedAIAssistant containerHeight="h-[80vh]" defaultMode="symptom-checker" />
    </div>
  );
}
