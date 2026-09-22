import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import TradeSelector from '../components/setup/TradeSelector';
import JurisdictionSelector from '../components/setup/JurisdictionSelector';
import { Loader2, CheckCircle, XCircle, Clock, Home, RotateCcw, FileText, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

const EXAM_FORMATS = {
  trade: { label: 'Trade Exam', questionCount: 100, timeLimitMinutes: 240, passPercent: 73 },
  business_law: { label: 'Business & Law Exam', questionCount: 50, timeLimitMinutes: 140, passPercent: 73 },
};
// NOTE: These figures reflect Tennessee Board for Licensing Contractors /
// PSI-administered exam format as of 2026 and can vary by specific license
// classification (e.g. BC-b Small Commercial uses 70 questions / 52 to
// pass). Treat these as defaults, not guarantees — verify against the
// current PSI or Prov Candidate Information Bulletin for the specific
// classification before relying on the pass threshold.

const SRS_INTERVALS = [0, 1, 2, 3, 7, 14, 30];
const addDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString(); };

const normalizeAns = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const fuzzyMatch = (userAns, correctAns) => {
  const u = normalizeAns(userAns);
  const c = normalizeAns(correctAns);
  if (u === c) return true;
  if (u.length < 3) return false;
  const uWords = new Set(u.split(' ').filter(w => w.length > 2));
  const cWords = new Set(c.split(' ').filter(w => w.length > 2));
  const overlap = [...uWords].filter(w => cWords.has(w)).length;
  return overlap / Math.max(cWords.size, 1) >= 0.7;
};

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function ExamSimulation() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramTrades = urlParams.get('trades') ? urlParams.get('trades').split(',').filter(Boolean) : [];
  const paramJurisdiction = urlParams.get('jurisdiction') || '';

  const [phase, setPhase] = useState('setup'); // setup | loading | drilling | finished
  const [selectedFormat, setSelectedFormat] = useState('');
  const [selectedTrades, setSelectedTrades] = useState(paramTrades);
  const [jurisdiction, setJurisdiction] = useState(paramJurisdiction);
  const [user, setUser] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: { userAnswer, isCorrect } }
  const [timeLeft, setTimeLeft] = useState(0);
  const [partialBank, setPartialBank] = useState(false);
  const [results, setResults] = useState(null); // { score, passed, correctCount, wrongByDomain }
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);
  const loadingRef = useRef(false);
  const answersRef = useRef({});
  const queueRef = useRef([]);

  useEffect(() => { base44.auth.me().then(setUser); }, []);
  useEffect(() => { if (phase === 'loading' && user) loadExam(); }, [phase, user]);

  const loadExam = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const trades = selectedTrades.length > 0 ? selectedTrades : (user?.preferred_trades || []);
    const jur = jurisdiction || user?.preferred_jurisdiction || 'Federal';
    const format = EXAM_FORMATS[selectedFormat];

    let allQ = await base44.entities.LawQuestion.filter({ jurisdiction: jur }, null, 2000);
    if (trades.length > 0) {
      const ts = new Set(trades);
      allQ = allQ.filter(q => ts.has(q.trade));
    }
    const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const selected = shuffle(allQ).slice(0, format.questionCount);
    setPartialBank(selected.length < format.questionCount);

    queueRef.current = selected;
    setQueue(selected);
    setCurrentIndex(0);
    setAnswers({});
    answersRef.current = {};
    setTimeLeft(format.timeLimitMinutes * 60);
    setPhase('drilling');
    loadingRef.current = false;
  };

  // Overall countdown timer
  useEffect(() => {
    if (phase !== 'drilling') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleTimeUp(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const handleTimeUp = () => { submitExam(true); };

  const recordAnswer = (questionId, userAnswer, isCorrect) => {
    const updated = { ...answersRef.current, [questionId]: { userAnswer, isCorrect } };
    answersRef.current = updated;
    setAnswers(updated);
  };

  const handleSelect = (question, option) => {
    const isCorrect = option === question.correct_answer;
    recordAnswer(question.id, option, isCorrect);
  };

  const handleTyped = (question, value) => {
    const isCorrect = fuzzyMatch(value, question.correct_answer);
    recordAnswer(question.id, value, isCorrect);
  };

  const handleTrueFalse = (question, value) => {
    const isCorrect = value === question.correct_answer;
    recordAnswer(question.id, value, isCorrect);
  };

  const goNext = () => { if (currentIndex < queue.length - 1) setCurrentIndex(currentIndex + 1); };
  const goPrev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };

  const submitExam = async (autoSubmitted = false) => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    const format = EXAM_FORMATS[selectedFormat];
    const answered = answersRef.current;
    const answeredIds = Object.keys(answered);
    const correctCount = answeredIds.filter(id => answered[id].isCorrect).length;
    const score = Math.round((correctCount / format.questionCount) * 100);
    const passed = score >= format.passPercent;

    // Wrong answers breakdown by knowledge_domain
    const wrongByDomain = {};
    for (const id of answeredIds) {
      if (!answered[id].isCorrect) {
        const q = queueRef.current.find(x => x.id === id);
        if (q) {
          const domain = q.knowledge_domain || 'Uncategorized';
          wrongByDomain[domain] = (wrongByDomain[domain] || 0) + 1;
        }
      }
    }
    const wrongDomains = Object.entries(wrongByDomain).sort((a, b) => b[1] - a[1]);

    setResults({ score, passed, correctCount, totalAnswered: answeredIds.length, wrongDomains, autoSubmitted });

    // Batch SRS updates + QuestionAttempt records (after the fact)
    const trades = selectedTrades.length > 0 ? selectedTrades : (user?.preferred_trades || []);
    const jur = jurisdiction || user?.preferred_jurisdiction || 'Federal';

    const session = await base44.entities.StudySession.create({
      trades: trades.length > 0 ? trades : ['General'],
      jurisdiction: jur,
      total_questions: queueRef.current.length,
      correct_answers: correctCount,
      completed: true,
    });

    const updates = [];
    const attempts = [];
    for (const id of answeredIds) {
      const q = queueRef.current.find(x => x.id === id);
      if (!q) continue;
      const { userAnswer, isCorrect } = answered[id];
      const tier = q.confidence_tier ?? 0;
      const streak = q.consecutive_correct ?? 0;
      const newTier = isCorrect ? Math.min(5, tier + 1) : Math.max(1, tier - 1);
      const newStreak = isCorrect ? streak + 1 : 0;
      updates.push(base44.entities.LawQuestion.update(id, {
        confidence_tier: newTier,
        consecutive_correct: newStreak,
        next_review_date: addDays(SRS_INTERVALS[newTier] ?? 30),
      }));
      attempts.push(base44.entities.QuestionAttempt.create({
        question_id: id,
        user_answer: userAnswer,
        is_correct: isCorrect,
        session_id: session.id,
      }));
      if (!isCorrect) {
        updates.push(
          base44.entities.ReviewQueue.filter({ question_id: id }).then(ex => {
            if (ex.length > 0) base44.entities.ReviewQueue.update(ex[0].id, {
              times_incorrect: (ex[0].times_incorrect ?? 1) + 1,
              priority_score: (ex[0].priority_score ?? 1) + 1,
              last_attempt_date: new Date().toISOString(),
            });
            else base44.entities.ReviewQueue.create({
              question_id: id, times_incorrect: 1, priority_score: 1,
              last_attempt_date: new Date().toISOString(),
            });
          })
        );
      }
    }
    await Promise.all(updates);
    await Promise.all(attempts);
    setSubmitting(false);
    setPhase('finished');
  };

  // ── SETUP PHASE ──────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="sm">← Dashboard</Button>
            </Link>
          </div>
          <div className="text-center mb-8">
            <FileText className="h-12 w-12 text-indigo-600 mx-auto mb-3" />
            <h1 className="text-4xl font-bold text-navy-900 mb-2">EXAM SIMULATION</h1>
            <p className="text-gray-500 text-sm">Full mock exam. One timer. Free navigation between questions.</p>
          </div>

          <Card className="shadow-xl border-2">
            <CardHeader className="bg-gradient-to-r from-navy-100 to-indigo-100">
              <CardTitle className="text-xl text-navy-900">Select Exam Format</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                {Object.entries(EXAM_FORMATS).map(([key, fmt]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedFormat(key)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                      selectedFormat === key
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900">{fmt.label}</span>
                      {selectedFormat === key && <CheckCircle className="h-5 w-5 text-indigo-600" />}
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>{fmt.questionCount} questions</span>
                      <span>{fmt.timeLimitMinutes} min</span>
                      <span>{fmt.passPercent}% to pass</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t pt-4 space-y-4">
                <JurisdictionSelector
                  value={jurisdiction}
                  onChange={setJurisdiction}
                />
                <TradeSelector
                  selectedTrades={selectedTrades}
                  onSelectionChange={setSelectedTrades}
                />
              </div>

              <Button
                className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!selectedFormat || !jurisdiction}
                onClick={() => setPhase('loading')}
              >
                <FileText className="h-5 w-5 mr-2" />Begin Exam Simulation
              </Button>
              {!selectedFormat && (
                <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 text-center">
                  Select an exam format to continue
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── LOADING ──────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading exam questions...</p>
        </div>
      </div>
    );
  }

  // ── FINISHED PHASE ───────────────────────────────────────────────────
  if (phase === 'finished' && results) {
    const format = EXAM_FORMATS[selectedFormat];
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <Card className="max-w-2xl w-full shadow-2xl border-2">
          <CardHeader className={`text-center border-b ${results.passed ? 'bg-gradient-to-r from-green-100 to-emerald-100' : 'bg-gradient-to-r from-red-100 to-rose-100'}`}>
            <CardTitle className="text-3xl">
              <span className={results.passed ? 'text-green-700' : 'text-red-700'}>
                {results.passed ? '✓ PASSED' : '✗ FAILED'}
              </span>
            </CardTitle>
            <p className="text-gray-600 text-sm mt-1">{format.label}</p>
            {results.autoSubmitted && (
              <p className="text-orange-600 text-xs mt-1 font-medium">⏱ Time expired — auto-submitted</p>
            )}
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <div className={`text-7xl font-black ${results.passed ? 'text-green-600' : 'text-red-600'}`}>
                {results.score}%
              </div>
              <p className="text-gray-500 text-sm mt-2">
                {results.correctCount} correct of {format.questionCount} • Passing: {format.passPercent}%
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Answered {results.totalAnswered} of {queueRef.current.length} questions
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{results.correctCount}</p>
                <p className="text-sm text-green-600">Correct</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">{results.totalAnswered - results.correctCount}</p>
                <p className="text-sm text-red-600">Wrong</p>
              </div>
            </div>

            {results.wrongDomains.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-navy-900 mb-3">Wrong Answers by Domain — Restudy These</h3>
                <div className="space-y-2">
                  {results.wrongDomains.map(([domain, count]) => (
                    <div key={domain} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                      <span className="text-sm font-medium text-navy-900 flex-1">{domain}</span>
                      <span className="text-sm font-bold text-red-600 ml-2">{count} wrong</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button onClick={() => { setPhase('setup'); setSelectedFormat(''); setResults(null); }} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                <RotateCcw className="h-4 w-4 mr-2" />Simulate Again
              </Button>
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── DRILLING PHASE ───────────────────────────────────────────────────
  const currentQ = queue[currentIndex];
  if (!currentQ) return null;
  const format = EXAM_FORMATS[selectedFormat];
  const answeredCount = Object.keys(answers).length;
  const currentAnswer = answers[currentQ.id];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="sm">← Exit</Button>
            </Link>
            <Badge className="bg-indigo-100 text-indigo-800 text-xs">{format.label}</Badge>
          </div>
          <div className="text-sm text-gray-600">
            Answered: <span className="font-bold text-navy-900">{answeredCount}</span> / {queue.length}
          </div>
        </div>

        {/* Timer — prominent, overall */}
        <div className={`flex justify-center mb-4 rounded-xl border-2 p-4 ${timeLeft < 300 ? 'border-red-400 bg-red-50' : 'border-indigo-200 bg-indigo-50'}`}>
          <div className="text-center">
            <Clock className={`h-6 w-6 mx-auto mb-1 ${timeLeft < 300 ? 'text-red-500' : 'text-indigo-600'}`} />
            <div className={`text-4xl font-black tabular-nums ${timeLeft < 300 ? 'text-red-600' : 'text-indigo-700'}`}>
              {formatTime(timeLeft)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Time Remaining</p>
          </div>
        </div>

        {partialBank && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border-2 border-amber-400 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-bold">Partial-bank simulation:</span> Only {queue.length} questions available for this selection (a full exam uses {format.questionCount}). Results are still scored against {format.questionCount}.
            </p>
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <span className="font-medium text-navy-900">Question {currentIndex + 1} of {queue.length}</span>
          {currentAnswer && (
            <span className={`text-xs font-medium ${currentAnswer.isCorrect ? 'text-green-600' : 'text-gray-500'}`}>
              {currentAnswer.isCorrect ? '✓ Answered' : 'Answered'}
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }} />
        </div>

        {/* Question card */}
        <Card className="shadow-xl border-2">
          <CardContent className="p-6 space-y-4">
            <p className="text-lg font-semibold text-navy-900 leading-relaxed">{currentQ.question_text}</p>
            {currentQ.law_citation && <p className="text-xs text-gray-500">{currentQ.law_citation}</p>}

            {currentQ.question_type === 'multiple_choice' && (
              <div className="space-y-2">
                {currentQ.options?.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(currentQ, opt)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      currentAnswer?.userAnswer === opt
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <span className="text-sm text-navy-900">{opt}</span>
                  </button>
                ))}
              </div>
            )}

            {currentQ.question_type === 'true_false' && (
              <div className="flex gap-3">
                {['True', 'False'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleTrueFalse(currentQ, opt)}
                    className={`flex-1 p-4 rounded-lg border-2 font-semibold transition-all ${
                      currentAnswer?.userAnswer === opt
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {currentQ.question_type === 'fill_in_blank' && (
              <Input
                placeholder="Type your answer..."
                value={currentAnswer?.userAnswer || ''}
                onChange={e => handleTyped(currentQ, e.target.value)}
                className="text-base"
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 gap-3">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />Previous
          </Button>

          <div className="flex gap-2">
            {currentIndex < queue.length - 1 ? (
              <Button onClick={goNext} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => submitExam(false)}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Submit Exam
              </Button>
            )}
          </div>
        </div>

        {/* Quick submit from anywhere */}
        {currentIndex < queue.length - 1 && (
          <div className="text-center mt-4">
            <button
              onClick={() => submitExam(false)}
              disabled={submitting}
              className="text-sm text-gray-500 hover:text-red-600 underline"
            >
              {submitting ? 'Submitting...' : 'Submit exam early'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}