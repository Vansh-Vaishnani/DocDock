'use client';

import { UnifiedAIAssistant } from '../../../components/ai/UnifiedAIAssistant';

export default function AIAssistantPage() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <UnifiedAIAssistant containerHeight="h-[80vh]" defaultMode="chat" />
    </div>
  );
}
