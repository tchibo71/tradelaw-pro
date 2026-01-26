import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TrueFalseCard({ question, onAnswer }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
  };

  const handleNext = () => {
    const isCorrect = selectedAnswer === question.correct_answer;
    onAnswer(selectedAnswer, isCorrect);
  };

  const isCorrect = selectedAnswer === question.correct_answer;

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
        <div className="grid grid-cols-2 gap-4">
          {['True', 'False'].map((option) => {
            const isSelected = selectedAnswer === option;
            const isCorrectOption = option === question.correct_answer;
            
            let bgColor = 'bg-white hover:bg-gray-50';
            let borderColor = 'border-gray-200';
            
            if (showResult) {
              if (isCorrectOption) {
                bgColor = 'bg-green-50';
                borderColor = 'border-green-500';
              } else if (isSelected && !isCorrectOption) {
                bgColor = 'bg-red-50';
                borderColor = 'border-red-500';
              }
            } else if (isSelected) {
              bgColor = 'bg-indigo-50';
              borderColor = 'border-indigo-500';
            }

            return (
              <motion.button
                key={option}
                onClick={() => handleSelect(option)}
                disabled={showResult}
                whileHover={!showResult ? { scale: 1.02 } : {}}
                whileTap={!showResult ? { scale: 0.98 } : {}}
                className={`p-8 rounded-lg border-2 ${borderColor} ${bgColor} 
                  text-center transition-all duration-200 flex flex-col items-center justify-center gap-2
                  ${!showResult && 'cursor-pointer'}`}
              >
                <span className="text-2xl font-bold">{option}</span>
                {showResult && isCorrectOption && (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                )}
                {showResult && isSelected && !isCorrectOption && (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-5 rounded-lg bg-blue-100 border-2 border-blue-300"
            >
              <div className="flex items-start gap-3">
                <BookOpen className="h-6 w-6 text-blue-700 mt-0.5 shrink-0" />
                <div className="select-text flex-1">
                  <p className="font-bold text-blue-900 text-lg mb-2">Explanation</p>
                  <p className="text-base text-blue-900 leading-relaxed">{question.explanation}</p>
                  {question.law_citation && (
                    <p className="text-sm text-blue-800 mt-3 font-mono bg-blue-200 px-3 py-2 rounded">
                      Citation: {question.law_citation}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      {showResult && (
        <CardFooter className="pt-4">
          <Button
            onClick={handleNext}
            className="w-full bg-navy-600 hover:bg-navy-700 text-gray-900 h-14 text-lg font-semibold"
          >
            Next Question →
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}