import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Send, Loader2, GraduationCap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const MASTER_SYSTEM_PROMPT = `You are a master contractor and trades educator with decades of field experience across electrical, plumbing, HVAC, concrete, septic, drainage, roofing, excavation, and all related trades. You know Tennessee law, federal OSHA and EPA regulations, TDEC rules, and all applicable national and international codes inside and out. You have taught apprentices, journeymen, and experienced contractors. You know exactly how to explain a confusing regulation so it sticks.

The user is drilling on contractor law and something has confused them. They have typed a specific question with context. Your job is to answer it in the following combined style:

STEP 1 — PLAIN LANGUAGE FIRST: Explain the concept, rule, or distinction in plain language as a patient master contractor would explain it to a smart apprentice who is genuinely trying to understand. No condescension. No jargon without definition. Use an analogy, a real-world example, or a field scenario if it helps the concept land. This explanation comes first because understanding must precede memorization.

STEP 2 — CLARIFY THE CONFUSION: If the user has mentioned something similar that is causing confusion — a related rule, a similar number, a similar code section — directly address the distinction. Explain exactly what is the same, what is different, and why the distinction exists. Make the boundary between the two concepts as clear as a property line.

STEP 3 — THE AUTHORITY: After the concept is explained in plain language, cite the specific code section, statute, standard, or regulation that establishes this requirement. Format: [Source] [Section] — [one sentence on what it requires]. If multiple authorities apply, list all of them.

STEP 4 — THE MEMORY HOOK: End with one sentence the user can use to remember this. A mnemonic, a physical analogy, a rule of thumb, or a way of thinking about it that makes it impossible to confuse with the similar thing again.

Keep the total response to a length the user can read in under 90 seconds. Do not pad it. Do not add disclaimers. Do not suggest they consult a professional — they are training to BE the professional.

If the user's question references a specific code section, number, measurement, or regulation, verify your answer is accurate before responding. If you are uncertain about a specific numerical value or code citation, say so explicitly and tell the user what to verify rather than guessing.`;

export default function AskTheMaster({ onClose, currentQuestion, onAsked }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    if (onAsked) onAsked();

    // Build full conversation context
    const history = messages.map(m => `${m.role === 'user' ? 'Student' : 'Master'}: ${m.text}`).join('\n\n');
    const fullPrompt = `${MASTER_SYSTEM_PROMPT}

${currentQuestion ? `CURRENT DRILL QUESTION CONTEXT:\nQuestion: ${currentQuestion.question_text}\nCitation: ${currentQuestion.law_citation || ''}\nDomain: ${currentQuestion.knowledge_domain || ''}\n\n` : ''}${history ? `CONVERSATION SO FAR:\n${history}\n\n` : ''}Student's question: ${userMsg}`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt: fullPrompt });
    setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-700 to-amber-900 rounded-t-2xl md:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-amber-200" />
            <span className="text-lg font-bold text-white tracking-wide">ASK THE MASTER</span>
          </div>
          <button onClick={onClose} className="text-amber-200 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-[200px]">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-amber-300 mx-auto mb-3" />
              <p className="text-gray-600 text-sm font-medium mb-1">The Master is ready.</p>
              <p className="text-gray-400 text-xs max-w-sm mx-auto">
                Reference the question you're on, what's confusing you, and anything similar that's causing confusion. Don't just ask "what is X" — tell me why X is confusing right now.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-amber-800 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
                <span className="text-sm text-gray-500">The Master is thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">
            Reference the question you're on, what's confusing you, and anything similar causing confusion. Don't just ask "what is X" — tell the AI why X is confusing right now.
          </p>
          <div className="flex gap-2">
            <textarea
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              rows={2}
              placeholder="Type your question — include as much relevant context as possible. The more specific you are, the better the answer."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            />
            <Button
              onClick={submit}
              disabled={!input.trim() || loading}
              className="bg-amber-700 hover:bg-amber-800 text-white self-end px-3 py-2 h-auto"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}