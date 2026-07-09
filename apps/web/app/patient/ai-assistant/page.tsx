'use client';

import { AIAssistantChat } from '../../../components/ai/AIAssistantChat';

export default function AIAssistantPage() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <AIAssistantChat containerHeight="h-[80vh]" showTitleCard={true} />
    </div>
  );
}
