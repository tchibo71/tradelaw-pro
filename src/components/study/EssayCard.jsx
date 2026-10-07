import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, PenLine, ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnswerReveal from './AnswerReveal';

export default function EssayCard({ question, onAnswer }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [selfAssessed, setSelfAssessed] = useState(false);

  const handleSubmit = () => {
    if (!userAnswer.trim()) return;
    setShowResult(true);
  };

  const handleSelfAssess = (isCorrect) => {
    if (selfAssessed) return;
    setSelfAssessed(true);
    onAnswer(userAnswer, isCorrect);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl border-2">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-xl md:text-2xl text-navy-900 leading-relaxed select-text">
            {question.question_text}
          </CardTitle>
          <Badge variant="outline" className="shrink-0">
            <PenLine className="h-3 w-3 mr-1" />Essay
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {question.trade?.split(',').map(t => (
            <Badge key={t} className="bg-navy-100 text-navy-600 border-2 border-navy-600">{t}</Badge>
          ))}
          <Badge className="bg-gray-700 text-gray-700 border-2 border-gray-700 bg-gray-100">{question.jurisdiction}</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 pb-2">
        <div className="space-y-4">
          <Textarea
            value={userAnswer}
            onChange={(e) => !showResult && setUserAnswer(e.target.value)}
            placeholder="Write your answer in detail..."
            disabled={showResult}
            className={`text-base min-h-[160px] ${
              showResult
                ? selfAssessed
                  ? 'border-green-500 bg-green-50'
                  : 'border-amber-400 bg-amber-50'
                : 'border-gray-300'
            }`}
          />

          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-1">Model Answer:</p>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{question.correct_answer}</p>
              </div>
              <AnswerReveal question={question} isCorrect={selfAssessed} userAnswer={userAnswer} />
            </motion.div>
          )}
        </div>
      </CardContent>

      {!showResult && (
        <CardFooter className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!userAnswer.trim()}
            className="w-full bg-navy-600 hover:bg-navy-700 text-gray-900 h-12 text-base"
          >
            Submit Answer
          </Button>
        </CardFooter>
      )}

      {showResult && !selfAssessed && (
        <CardFooter className="pt-4 pb-16">
          <div className="w-full space-y-3">
            <p className="text-center text-sm text-gray-600">
              Compare your answer to the model answer above, then self-assess:
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleSelfAssess(true)}
                className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
              >
                <ThumbsUp className="h-5 w-5 mr-2" />I Got It Right
              </Button>
              <Button
                onClick={() => handleSelfAssess(false)}
                className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white"
              >
                <ThumbsDown className="h-5 w-5 mr-2" />Need More Practice
              </Button>
            </div>
          </div>
        </CardFooter>
      )}

      {showResult && selfAssessed && (
        <CardFooter className="pt-4 pb-16">
          <Button
            onClick={() => onAnswer(userAnswer, selfAssessed)}
            className="w-full bg-navy-600 hover:bg-navy-700 text-gray-900 h-14 text-lg font-semibold"
          >
            Next Question →
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}