import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, XCircle, Clock, Home, RotateCcw, GraduationCap } from 'lucide-react';
import { TIMED_LEVELS, getLevelConfig } from '@/components/study/TimerDisplay';
import TimerDisplay from '@/components/study/TimerDisplay';
import AskTheMaster from '@/components/study/AskTheMaster';
import MultipleChoiceCard from '@/components/study/MultipleChoiceCard';
import TrueFalseCard from '@/components/study/TrueFalseCard';
import FillInBlankCard from '@/components/study/FillInBlankCard';

const SRS_INTERVALS = [0, 1, 2, 3, 7, 14, 30];
const addDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString(); };

// Fuzzy match for Grand Master typed answers
const normalizeAns = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const fuzzyMatch = (userAns, correctAns) => {
  const u = normalizeAns(userAns);
  const c = normalizeAns(correctAns);
  if (u === c) return 'correct';
  if (u.length < 3) return 'wrong';
  const uWords = new Set(u.split(' ').filter(w => w.length > 2));
  const cWords = new Set(c.split(' ').filter(w => w.length > 2));
  const overlap = [...uWords].filter(w => cWords.has(w)).length;
  const ratio = overlap / Math.max(cWords.size, 1);
  if (ratio >= 0.7) return 'correct';
  if (ratio >= 0.4) return 'ambiguous';
  return 'wrong';
};

export default function TimedDrill() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramTrades = urlParams.get('trades') ? urlParams.get('trades').split(',').filter(Boolean) : [];
  const paramJurisdiction = urlParams.get('jurisdiction') || '';
  const paramLevel = urlParams.get('level') || '';

  const [phase, setPhase] = useState(paramLevel ? 'loading' : 'setup'); // setup | loading | drilling | finished
  const [selectedLevel, setSelectedLevel] = useState(paramLevel || '');
  const [user, setUser] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, timeout: 0, total: 0, gmScore: 0, assisted: 0 });
  const [showMaster, setShowMaster] = useState(false);
  const [assistedThisQ, setAssistedThisQ] = useState(false);
  const [gmInput, setGmInput] = useState('');
  const [gmResult, setGmResult] = useState(null); // null | 'correct' | 'wrong' | 'ambiguous' | 'timeout'
  const [gmChecking, setGmChecking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [timeoutReveal, setTimeoutReveal] = useState(false);
  const timerRef = useRef(null);
  const loadingRef = useRef(false);
  const pausedTimeRef = useRef(0);

  const levelConfig = getLevelConfig(selectedLevel);
  const isGrandMaster = selectedLevel === 'grand_master';

  useEffect(() => { base44.auth.me().then(setUser); }, []);
  useEffect(() => { if (phase === 'loading' && user) loadSession(); }, [phase, user]);

  const loadSession = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const trades = paramTrades.length > 0 ? paramTrades : (user?.preferred_trades || []);
    const jurisdiction = paramJurisdiction || user?.preferred_jurisdiction || 'Federal';

    let allQ = await base44.entities.LawQuestion.filter({ jurisdiction }, null, 2000);
    if (trades.length > 0) {
      const ts = new Set(trades);
      allQ = allQ.filter(q => ts.has(q.trade));
    }
    // Grand Master: typed recall / complex questions preferred — filter to fill_in_blank
    if (isGrandMaster) {
      const gmQ = allQ.filter(q => q.question_type === 'fill_in_blank');
      if (gmQ.length > 0) allQ = gmQ;
    }
    const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const selected = shuffle(allQ).slice(0, 30);

    const session = await base44.entities.StudySession.create({
      trades: trades.length > 0 ? trades : ['General'],
      jurisdiction,
      total_questions: selected.length,
      correct_answers: 0,
      completed: false,
    });

    setSessionId(session.id);
    setQueue(selected);
    setCurrentIndex(0);
    setSessionStats({ correct: 0, wrong: 0, timeout: 0, total: 0, gmScore: 0, assisted: 0 });
    setPhase('drilling');
    loadingRef.current = false;
  };

  // Timer
  useEffect(() => {
    if (phase !== 'drilling' || isPaused || showMaster || gmResult !== null || timeoutReveal) return;
    const t = levelConfig.seconds;
    setTimeLeft(t);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIndex, phase, isPaused, showMaster]);

  const pauseTimer = () => {
    clearInterval(timerRef.current);
    pausedTimeRef.current = timeLeft;
    setIsPaused(true);
  };
  const resumeTimer = () => {
    setIsPaused(false);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = () => {
    clearInterval(timerRef.current);
    setTimeoutReveal(true);
    const current = queue[currentIndex];
    if (!current) return;
    setSessionStats(prev => ({
      ...prev,
      timeout: prev.timeout + 1,
      total: prev.total + 1,
      gmScore: isGrandMaster ? prev.gmScore - 0 : prev.gmScore, // timeout = 0pts GM
    }));
    // Requeue within 2 questions
    setQueue(prev => {
      const newQ = [...prev];
      const insertAt = Math.min(currentIndex + 2, newQ.length);
      newQ.splice(insertAt, 0, { ...current, _requeued: true });
      return newQ;
    });
    // SRS fire-and-forget
    base44.entities.LawQuestion.update(current.id, {
      confidence_tier: Math.max(1, (current.confidence_tier ?? 0) - 1),
      consecutive_correct: 0,
      next_review_date: addDays(1),
    });
    base44.entities.QuestionAttempt.create({ question_id: current.id, user_answer: '__TIMEOUT__', is_correct: false, session_id: sessionId });
  };

  const advanceFromTimeout = () => {
    setTimeoutReveal(false);
    setGmResult(null);
    setGmInput('');
    setAssistedThisQ(false);
    const next = currentIndex + 1;
    if (next >= queue.length) finishSession();
    else setCurrentIndex(next);
  };

  const handleAnswer = (userAnswer, isCorrect) => {
    clearInterval(timerRef.current);
    const current = queue[currentIndex];
    if (!current) return;

    const gmPoints = isGrandMaster ? (isCorrect ? 3 : -1) : 0;
    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
      total: prev.total + 1,
      gmScore: prev.gmScore + gmPoints,
      assisted: prev.assisted + (assistedThisQ ? 1 : 0),
    }));

    const tier = current.confidence_tier ?? 0;
    const streak = current.consecutive_correct ?? 0;
    const newTier = isCorrect ? Math.min(5, tier + 1) : Math.max(1, tier - 1);
    const newStreak = isCorrect ? streak + 1 : 0;
    base44.entities.LawQuestion.update(current.id, {
      confidence_tier: newTier,
      consecutive_correct: newStreak,
      next_review_date: addDays(SRS_INTERVALS[newTier] ?? 30),
    });
    base44.entities.QuestionAttempt.create({ question_id: current.id, user_answer: userAnswer, is_correct: isCorrect, session_id: sessionId });
    if (!isCorrect) {
      base44.entities.ReviewQueue.filter({ question_id: current.id }).then(ex => {
        if (ex.length > 0) base44.entities.ReviewQueue.update(ex[0].id, { times_incorrect: (ex[0].times_incorrect ?? 1) + 1, priority_score: (ex[0].priority_score ?? 1) + 1, last_attempt_date: new Date().toISOString() });
        else base44.entities.ReviewQueue.create({ question_id: current.id, times_incorrect: 1, priority_score: 1, last_attempt_date: new Date().toISOString() });
      });
    }

    setAssistedThisQ(false);
    const next = currentIndex + 1;
    if (next >= queue.length) finishSession();
    else setCurrentIndex(next);
  };

  const handleGmSubmit = async () => {
    if (!gmInput.trim()) return;
    clearInterval(timerRef.current);
    const current = queue[currentIndex];
    setGmChecking(true);
    const match = fuzzyMatch(gmInput, current.correct_answer);
    let finalResult = match;
    if (match === 'ambiguous') {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: `Is this answer correct for the question? Question: "${current.question_text}" Correct answer: "${current.correct_answer}" User's answer: "${gmInput}"\nReply with JSON {"correct": true/false}`,
        response_json_schema: { type: 'object', properties: { correct: { type: 'boolean' } } }
      });
      finalResult = resp?.correct ? 'correct' : 'wrong';
    }
    setGmResult(finalResult);
    setGmChecking(false);
    handleAnswer(gmInput, finalResult === 'correct');
  };

  const finishSession = () => {
    if (sessionId) {
      base44.entities.StudySession.update(sessionId, {
        correct_answers: sessionStats.correct,
        total_questions: sessionStats.total,
        completed: true,
      });
    }
    setPhase('finished');
  };

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">← Dashboard</Button>
            </Link>
          </div>
          <div className="text-center mb-8">
            <Clock className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <h1 className="text-4xl font-black text-white mb-2">TIMED DRILL</h1>
            <p className="text-red-200 text-sm">Seven pressure levels. Select one and begin.</p>
          </div>
          <div className="space-y-3">
            {TIMED_LEVELS.map(level => (
              <button
                key={level.id}
                onClick={() => setSelectedLevel(level.id)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                  selectedLevel === level.id
                    ? 'border-red-400 bg-red-900/40'
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold text-sm">{level.label}</span>
                    <span className="text-red-300 text-xs ml-2">— {level.seconds}s</span>
                  </div>
                  {level.id === 'grand_master' && (
                    <Badge className="bg-red-600 text-white text-xs">TYPED RECALL</Badge>
                  )}
                </div>
                <p className="text-gray-400 text-xs mt-1">{level.description}</p>
              </button>
            ))}
          </div>
          <Button
            className="w-full mt-6 h-14 bg-red-600 hover:bg-red-700 text-white font-bold text-lg"
            disabled={!selectedLevel}
            onClick={() => setPhase('loading')}
          >
            <Clock className="h-5 w-5 mr-2" />Start Timed Drill — {getLevelConfig(selectedLevel)?.label || ''}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-950 to-slate-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-red-400 mx-auto mb-4" />
          <p className="text-red-200 text-lg">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    const acc = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 p-4">
        <Card className="max-w-md w-full bg-slate-800 border-red-700 shadow-2xl">
          <CardHeader className="text-center border-b border-red-800">
            <CardTitle className="text-3xl text-white">Drill Complete</CardTitle>
            <p className="text-red-300 text-sm">{levelConfig.label} — {levelConfig.seconds}s/question</p>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="text-6xl font-black text-center text-red-400">{acc}%</div>
            {isGrandMaster && (
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Grand Master Score</p>
                <p className="text-3xl font-black text-yellow-400">{sessionStats.gmScore > 0 ? '+' : ''}{sessionStats.gmScore} pts</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-900/40 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-400">{sessionStats.correct}</p>
                <p className="text-xs text-green-300">Correct</p>
              </div>
              <div className="bg-red-900/40 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-red-400">{sessionStats.wrong}</p>
                <p className="text-xs text-red-300">Wrong</p>
              </div>
              <div className="bg-orange-900/40 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-orange-400">{sessionStats.timeout}</p>
                <p className="text-xs text-orange-300">Timeouts</p>
              </div>
            </div>
            {sessionStats.assisted > 0 && (
              <p className="text-center text-xs text-amber-400">Used "Ask The Master" on {sessionStats.assisted} question{sessionStats.assisted !== 1 ? 's' : ''}</p>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={() => { setPhase('setup'); setSelectedLevel(''); }} className="w-full bg-red-600 hover:bg-red-700 text-white">
                <RotateCcw className="h-4 w-4 mr-2" />Drill Again
              </Button>
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                  <Home className="h-4 w-4 mr-2" />Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = queue[currentIndex];
  if (!currentQ) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 p-4 md:p-8">
      {showMaster && (
        <AskTheMaster
          currentQuestion={currentQ}
          onClose={() => { setShowMaster(false); resumeTimer(); }}
          onAsked={() => setAssistedThisQ(true)}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">← Exit</Button>
            </Link>
            <Badge className="bg-red-800 text-red-200 text-xs">{levelConfig.label}</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-400 font-semibold flex items-center gap-1"><CheckCircle className="h-4 w-4" />{sessionStats.correct}</span>
            <span className="text-red-400 font-semibold flex items-center gap-1"><XCircle className="h-4 w-4" />{sessionStats.wrong}</span>
            <span className="text-orange-400 font-semibold flex items-center gap-1"><Clock className="h-4 w-4" />{sessionStats.timeout}</span>
            <span className="text-gray-400 text-xs">{currentIndex + 1}/{queue.length}</span>
          </div>
        </div>

        {/* Timer — large and central */}
        <div className="flex justify-center mb-6">
          <TimerDisplay levelConfig={levelConfig} timeLeft={timeLeft} isPaused={isPaused} />
        </div>

        {/* Question */}
        {timeoutReveal ? (
          <Card className="bg-slate-800 border-red-700 shadow-xl">
            <CardContent className="p-6 text-center space-y-4">
              <div className="text-red-400 font-black text-xl">⏱ TIME'S UP</div>
              <p className="text-gray-300 text-sm">{currentQ.question_text}</p>
              <div className="bg-green-900/40 border border-green-700 rounded-lg p-3">
                <p className="text-xs text-green-300 font-semibold mb-1">Correct Answer:</p>
                <p className="text-green-200 font-bold">{currentQ.correct_answer}</p>
              </div>
              {currentQ.law_citation && <p className="text-xs text-gray-400">{currentQ.law_citation}</p>}
              <Button onClick={advanceFromTimeout} className="w-full bg-orange-700 hover:bg-orange-800 text-white">Next Question →</Button>
            </CardContent>
          </Card>
        ) : isGrandMaster ? (
          <Card className="bg-slate-800 border-red-700 shadow-xl">
            <CardContent className="p-6 space-y-4">
              <p className="text-white font-semibold text-base leading-relaxed">{currentQ.question_text}</p>
              <p className="text-xs text-red-300 uppercase tracking-wide font-bold">Type your full answer — include the code citation</p>
              {gmResult ? (
                <div className={`rounded-lg p-3 ${gmResult === 'correct' ? 'bg-green-900/40 border border-green-700' : 'bg-red-900/40 border border-red-700'}`}>
                  <p className={`font-bold ${gmResult === 'correct' ? 'text-green-300' : 'text-red-300'}`}>
                    {gmResult === 'correct' ? '✓ Correct (+3 pts)' : '✗ Wrong (−1 pt)'}
                  </p>
                  <p className="text-sm text-gray-300 mt-1">Correct: {currentQ.correct_answer}</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    className="bg-slate-700 border-slate-600 text-white placeholder-gray-500 flex-1"
                    placeholder="Your answer..."
                    value={gmInput}
                    onChange={e => setGmInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGmSubmit()}
                    autoFocus
                    disabled={gmChecking}
                  />
                  <Button onClick={handleGmSubmit} disabled={!gmInput.trim() || gmChecking} className="bg-red-600 hover:bg-red-700 text-white">
                    {gmChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="[&_.bg-white]:bg-slate-800 [&_.text-gray-800]:text-white [&_.text-gray-700]:text-gray-200 [&_.text-gray-600]:text-gray-300">
            {currentQ.question_type === 'multiple_choice' && (
              <MultipleChoiceCard key={currentQ.id + currentIndex} question={currentQ} onAnswer={handleAnswer} />
            )}
            {currentQ.question_type === 'true_false' && (
              <TrueFalseCard key={currentQ.id + currentIndex} question={currentQ} onAnswer={handleAnswer} />
            )}
            {currentQ.question_type === 'fill_in_blank' && (
              <FillInBlankCard key={currentQ.id + currentIndex} question={currentQ} onAnswer={handleAnswer} />
            )}
          </div>
        )}

        {/* Ask The Master — always visible, visually distinct */}
        {!timeoutReveal && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => { pauseTimer(); setShowMaster(true); setAssistedThisQ(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-700/30 border border-amber-600/50 text-amber-300 hover:bg-amber-700/50 transition-all text-sm font-semibold"
            >
              <GraduationCap className="h-4 w-4" />
              ASK THE MASTER
            </button>
          </div>
        )}
      </div>
    </div>
  );
}