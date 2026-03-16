import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000
};

const wordToNumber = (str) => {
  const lower = str.trim().toLowerCase();
  if (NUMBER_WORDS[lower] !== undefined) return String(NUMBER_WORDS[lower]);
  return null;
};

const numberToWord = (str) => {
  const num = Number(str.trim());
  if (!isNaN(num) && Number.isInteger(num)) {
    const entry = Object.entries(NUMBER_WORDS).find(([, v]) => v === num);
    if (entry) return entry[0];
  }
  return null;
};

// Strip trailing units (days, feet, ft, inches, etc.) to get the core value
const stripUnits = (str) => str.trim().toLowerCase().replace(/\s*(days?|feet|foot|ft|inches?|in|meters?|m|hours?|hrs?|weeks?|months?|years?|gallons?|gal|pounds?|lbs?|percent|%)\s*$/i, '').trim();

// Strip currency symbols and formatting ($ , commas)
const stripCurrency = (str) => str.replace(/[$,]/g, '').trim();

const answersMatch = (userAns, correctAns) => {
  const u = stripCurrency(userAns.trim().toLowerCase());
  const c = stripCurrency(correctAns.trim().toLowerCase());
  if (u === c) return true;

  // Strip units and compare cores
  const uCore = stripUnits(u);
  const cCore = stripUnits(c);
  if (uCore === cCore) return true;

  // Try converting user word → number and compare
  const uAsNum = wordToNumber(uCore);
  if (uAsNum !== null && (uAsNum === cCore || uAsNum === c)) return true;
  // Try converting correct word → number and compare
  const cAsNum = wordToNumber(cCore);
  if (cAsNum !== null && (cAsNum === uCore || cAsNum === u)) return true;
  // Try converting user number → word and compare
  const uAsWord = numberToWord(uCore);
  if (uAsWord !== null && (uAsWord === cCore || uAsWord === c)) return true;
  // Try converting correct number → word and compare
  const cAsWord = numberToWord(cCore);
  if (cAsWord !== null && (cAsWord === uCore || cAsWord === u)) return true;

  // Filter out common stop words, then check meaningful word overlap
  const STOP_WORDS = new Set(['a','an','the','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','has','have','had','that','this','it','its','as','if','so','do','did','not','no','nor','yet','both','either','each','few','more','most','other','such','than','too','very','can','will','just','there','their','they','them','these','those','into','onto','upon','about','above','below','after','before','since','until','while','where','when','who','which','what','how','any','all','also','may','must','shall','should','would','could','said','then','than','whether']);
  
  const cWords = cCore.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
  const uWords = new Set(uCore.split(/\s+/).filter(Boolean));
  
  if (cWords.length === 0) return false;
  
  // Also expand user words with simple stem variants (notification↔notice, etc.)
  const expandWord = (w) => {
    const variants = [w];
    if (w.endsWith('ification')) variants.push(w.replace('ification','ice'), w.replace('ification','ify'));
    if (w.endsWith('ice')) variants.push(w.replace('ice','ification'));
    if (w.endsWith('ment')) variants.push(w.replace('ment',''));
    if (w.endsWith('tion')) variants.push(w.replace('tion','t'), w.replace('tion','te'));
    if (w.endsWith('ing')) variants.push(w.replace('ing',''), w.replace('ing','e'));
    if (w.endsWith('ed')) variants.push(w.replace('ed',''), w.replace('ed','e'));
    return variants;
  };
  
  const matchedCount = cWords.filter(cw => {
    if (uWords.has(cw)) return true;
    // partial match: user word starts with correct word stem (min 5 chars)
    if (cw.length >= 5 && [...uWords].some(uw => uw.startsWith(cw.slice(0,5)))) return true;
    // expanded variants
    return expandWord(cw).some(v => uWords.has(v));
  }).length;
  
  const matchRatio = matchedCount / cWords.length;
  if (matchRatio >= 0.93) return true;

  return false;
};

export default function FillInBlankCard({ question, onAnswer }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);

  const handleSubmit = () => {
    if (!userAnswer.trim()) return;
    setShowResult(true);
  };

  const handleNext = () => {
    const isCorrect = answersMatch(userAnswer, question.correct_answer);
    onAnswer(userAnswer, isCorrect);
  };

  const isCorrect = answersMatch(userAnswer, question.correct_answer);

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

      {showResult && (
        <CardFooter className="pt-4 pb-16">
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