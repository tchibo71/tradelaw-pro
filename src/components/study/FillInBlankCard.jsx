import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnswerReveal from './AnswerReveal';

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

// Parse common American date formats into a canonical MM-DD (optionally YYYY-MM-DD) string.
// Accepts: December 31, Dec 31, Dec. 31, 12/31, 12-31, 12/31/2025, Dec 31 2025, etc.
const MONTHS = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};

const normalizeDate = (str) => {
  const s = str.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  if (!s) return null;

  // Numeric formats: MM/DD, MM/DD/YYYY, MM-DD, MM-DD-YYYY
  const numericMatch = s.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (numericMatch) {
    const [, m, d, y] = numericMatch;
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const year = y ? (y.length === 2 ? `20${y}` : y) : null;
    return year ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Word month formats: "December 31", "Dec 31", "Dec 31 2025", "31 December", "31 Dec"
  const monthFirst = s.match(/^([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{2,4}))?$/);
  if (monthFirst) {
    const [, monthName, d, y] = monthFirst;
    const month = MONTHS[monthName];
    if (!month) return null;
    const day = parseInt(d, 10);
    if (day < 1 || day > 31) return null;
    const year = y ? (y.length === 2 ? `20${y}` : y) : null;
    return year ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const dayFirst = s.match(/^(\d{1,2})\s+([a-z]+)(?:,?\s+(\d{2,4}))?$/);
  if (dayFirst) {
    const [, d, monthName, y] = dayFirst;
    const month = MONTHS[monthName];
    if (!month) return null;
    const day = parseInt(d, 10);
    if (day < 1 || day > 31) return null;
    const year = y ? (y.length === 2 ? `20${y}` : y) : null;
    return year ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
};

const answersMatch = (userAns, correctAns) => {
  const u = stripCurrency(userAns.trim().toLowerCase());
  const c = stripCurrency(correctAns.trim().toLowerCase());
  if (u === c) return true;

  // Try date normalization — accept all American date formats
  const uDate = normalizeDate(u);
  const cDate = normalizeDate(c);
  if (uDate && cDate) {
    // Compare ignoring year if only one side has it
    const uKey = uDate.slice(-5); // MM-DD
    const cKey = cDate.slice(-5);
    if (uDate === cDate || uKey === cKey) return true;
  }

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
            <AnswerReveal question={question} isCorrect={isCorrect} userAnswer={userAnswer} />
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