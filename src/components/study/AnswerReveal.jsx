import React from 'react';
import { BookOpen, AlertCircle, Lightbulb, MapPin, Wrench, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Unified answer reveal panel for all question types.
 * Shows: correct answer, citation, jurisdiction note, manufacturer note, why it matters, memory tip.
 * Used by all three card types (MC, T/F, Fill-in-blank).
 */
export default function AnswerReveal({ question, isCorrect, userAnswer }) {
  const wrongBg = 'bg-red-50 border-red-200';
  const rightBg = 'bg-green-50 border-green-200';
  const containerClass = isCorrect ? rightBg : wrongBg;
  const titleColor = isCorrect ? 'text-green-900' : 'text-red-900';
  const textColor = isCorrect ? 'text-green-800' : 'text-red-800';

  // Parse structured explanation if it contains sections
  const explanation = question.explanation || '';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`mt-5 rounded-lg border-2 overflow-hidden ${containerClass}`}
    >
      {/* Header */}
      <div className={`px-5 py-3 flex items-center gap-2 border-b ${isCorrect ? 'border-green-200 bg-green-100' : 'border-red-200 bg-red-100'}`}>
        {isCorrect
          ? <CheckCircle2 className="h-5 w-5 text-green-700 shrink-0" />
          : <XCircle className="h-5 w-5 text-red-700 shrink-0" />
        }
        <span className={`font-bold text-base ${titleColor}`}>
          {isCorrect ? 'Correct!' : 'Incorrect'}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* 1. Correct answer (always shown, prominent on wrong) */}
        {!isCorrect && (
          <div className="p-3 bg-white rounded-lg border border-green-300">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Correct Answer</p>
            <p className="text-base font-bold text-green-900">{question.correct_answer}</p>
          </div>
        )}

        {/* 2. Citation */}
        {question.law_citation && (
          <div className="flex items-start gap-2">
            <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Source Citation</p>
              <p className="text-sm font-mono text-blue-900 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                {question.law_citation}
              </p>
            </div>
          </div>
        )}

        {/* 3. Explanation / Why it matters */}
        {explanation && (
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                {isCorrect ? 'Explanation' : 'Why It Matters'}
              </p>
              <p className={`text-sm leading-relaxed ${textColor}`}>{explanation}</p>
            </div>
          </div>
        )}

        {/* 4. Jurisdiction note */}
        {question.local_jurisdiction_note && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Jurisdiction Note</p>
              <p className="text-sm text-indigo-900 bg-indigo-50 px-3 py-2 rounded border border-indigo-200">
                {question.local_jurisdiction_note}
              </p>
            </div>
          </div>
        )}

        {/* 5. Manufacturer note */}
        {question.manufacturer_note && (
          <div className="flex items-start gap-2">
            <Wrench className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Manufacturer / Industry Standard</p>
              <p className="text-sm text-orange-900 bg-orange-50 px-3 py-2 rounded border border-orange-200">
                {question.manufacturer_note}
              </p>
            </div>
          </div>
        )}

        {/* 6. Memory tip */}
        {question.memory_tip && (
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Memory Tip</p>
              <p className="text-sm italic text-yellow-900 bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
                "{question.memory_tip}"
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}