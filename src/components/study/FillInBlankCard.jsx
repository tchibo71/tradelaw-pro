import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FillInBlankCard({ question, onAnswer }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);

  const handleSubmit = () => {
    if (!userAnswer.trim()) return;
    
    // Case-insensitive comparison, trim whitespace
    const isCorrect = userAnswer.trim().toLowerCase() === question.correct_answer.toLowerCase();
    setShowResult(true);
    
    setTimeout(() => {
      onAnswer(userAnswer, isCorrect);
    }, 2500);
  };

  const isCorrect = userAnswer.trim().toLowerCase() === question.correct_answer.toLowerCase();

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl border-2">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-xl md:text-2xl text-navy-900 leading-relaxed select-text">
            {question.question_text}
          </CardTitle>
          <Badge variant="outline" className="shrink-0">
            {question.law_type}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge className="bg-navy-600 text-navy-600 border-2 border-navy-600 bg-navy-100">{question.trade}</Badge>
          <Badge className="bg-gray-700 text-gray-700 border-2 border-gray-700 bg-gray-100">{question.jurisdiction}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 pb-2">
        <div className="space-y-4">
          <div className="relative">
            <Input
              value={userAnswer}
              onChange={(e) => !showResult && setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Type your answer..."
              disabled={showResult}
              className={`text-lg h-14 ${
                showResult
                  ? isCorrect
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
            {showResult && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isCorrect ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
            )}
          </div>

          {showResult && !isCorrect && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-green-50 border border-green-200"
            >
              <p className="text-sm text-green-900">
                <span className="font-semibold">Correct Answer:</span> {question.correct_answer}
              </p>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200"
            >
              <div className="flex items-start gap-2">
                <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="select-text">
                  <p className="font-semibold text-blue-900 mb-2">Explanation</p>
                  <p className="text-base text-blue-800 leading-relaxed">{question.explanation}</p>
                  {question.law_citation && (
                    <p className="text-sm text-blue-700 mt-3 font-mono bg-white px-2 py-1 rounded">
                      Citation: {question.law_citation}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      {!showResult && (
        <CardFooter className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!userAnswer.trim()}
            className="w-full bg-navy-600 hover:bg-navy-700 text-white h-12 text-base"
          >
            Submit Answer
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}