import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, XCircle, Brain, Home, RotateCcw, Info, GraduationCap } from 'lucide-react';
import TimerDisplay, { getLevelConfig } from '@/components/study/TimerDisplay';
import AskTheMaster from '@/components/study/AskTheMaster';
import MultipleChoiceCard from '@/components/study/MultipleChoiceCard';
import TrueFalseCard from '@/components/study/TrueFalseCard';
import FillInBlankCard from '@/components/study/FillInBlankCard';

const NEURO_TIMER_LEVEL = 'intermediate_low'; // 35s minimum, cannot be disabled
const SESSION_LENGTH = 20;
// Positions (1-indexed) for special question types
const ELABORATIVE_POSITIONS = new Set([3, 7, 12, 17]);
const GENERATION_POSITIONS = new Set([5, 10, 15, 20]);

const SRS_INTERVALS = [0, 1, 2, 3, 7, 14, 30];
const addDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString(); };

const BRIEFING_TEXT = `Your brain builds durable knowledge through struggle, not comfort. When learning feels easy, it usually means you're recognizing something you've seen before — not actually retrieving it from memory. That distinction matters because on a job site, you won't have the familiar context around the question. You'll just need to know the answer.

Neuroplasticity Training Mode deliberately makes retrieval harder. It switches topics without warning. It asks you WHY before it asks you WHAT. It makes you write your answer before showing you choices. It asks you the same fact multiple different ways until the underlying knowledge — not just the surface wording — is locked in.

This will feel frustrating. That frustration is the sensation of your brain forming new connections. It is not a sign that you are failing. It is a sign that the training is working.

HOW TO MAXIMIZE THIS TRAINING:

Do not do Neuroplasticity Training when you are mentally exhausted. Do it when you are alert but not yet warmed up — the mild discomfort of early-session unfamiliarity compounds the training effect.

Space your sessions. Two to three focused Neuroplasticity sessions per week produce better results than daily sessions, because consolidation happens during rest, not during training.

After each session, spend two to five minutes writing down — in your own words, without looking — the three things that were hardest. This post-session retrieval practice doubles the retention effect of the session itself.

When you get something wrong, do not immediately re-read the correct answer and move on. Read it, close your eyes, and reconstruct the answer in your own words. Then read it again. That extra step is worth more than three additional practice questions on the same topic.`;

// Interleave questions so no two consecutive share the same knowledge_domain
function interleaveByDomain(questions) {
  const buckets = {};
  for (const q of questions) {
    const d = q.knowledge_domain || 'General';
    if (!buckets[d]) buckets[d] = [];
    buckets[d].push(q);
  }
  const sorted = Object.values(buckets).sort((a, b) => b.length - a.length);
  const result = [];
  let attempts = 0;
  while (result.length < questions.length && attempts < questions.length * 3) {
    attempts++;
    for (const bucket of sorted) {
      if (bucket.length > 0) {
        const last = result[result.length - 1];
        const candidate = bucket[0];
        if (!last || (last.knowledge_domain || 'General') !== (candidate.knowledge_domain || 'General')) {
          result.push(bucket.shift());
        }
      }
    }
  }
  // Fill remaining
  for (const bucket of Object.values(buckets)) result.push(...bucket);
  return result.slice(0, questions.length);
}

// Generate a WHY-framed question wrapper via AI
async function generateWhyFrame(question) {
  const resp = await base44.integrations.Core.InvokeLLM({
    prompt: `Reframe this contractor law exam question as an elaborative interrogation WHY question. Instead of asking WHAT the rule is, ask WHY the rule exists and what failure mode or safety/legal consequence it prevents. The correct answer must explain the engineering or safety rationale behind the requirement, not just state it.

Original question: "${question.question_text}"
Correct answer: "${question.correct_answer}"
Citation: "${question.law_citation || ''}"

Return JSON: { "why_question": "the reframed WHY question text", "why_answer": "rationale-inclusive answer explaining WHY + the original fact + citation" }`,
    response_json_schema: {
      type: 'object',
      properties: {
        why_question: { type: 'string' },
        why_answer: { type: 'string' }
      }
    }
  });
  return resp;
}

export default function NeuroDrill() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramTrades = urlParams.get('trades') ? urlParams.get('trades').split(',').filter(Boolean) : [];
  const paramJurisdiction = urlParams.get('jurisdiction') || '';

  const [phase, setPhase] = useState('briefing'); // briefing | loading | drilling | retrieval_prompt | finished
  const [showBriefing, setShowBriefing] = useState(false);
  const [user, setUser] = useState(null);
  const [sessionQueue, setSessionQueue] = useState([]); // 20 question slots
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(35);
  const [isPaused, setIsPaused] = useState(false);
  const [showMaster, setShowMaster] = useState(false);
  const [assistedThisQ, setAssistedThisQ] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionStats, setSessionStats] = useState({
    correct: 0, wrong: 0, total: 0,
    selfGeneratedCorrect: 0, selfGeneratedTotal: 0,
    elaborativeCorrect: 0, elaborativeTotal: 0,
    assisted: 0,
  });
  // Generation effect state
  const [genInput, setGenInput] = useState('');
  const [genRevealed, setGenRevealed] = useState(false);
  const [genSelfCorrect, setGenSelfCorrect] = useState(false);
  // Timeout
  const [timeoutReveal, setTimeoutReveal] = useState(false);
  const timerRef = useRef(null);
  const loadingRef = useRef(false);

  const levelConfig = getLevelConfig(NEURO_TIMER_LEVEL);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

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

    // Shuffle and interleave by domain
    const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const shuffled = interleaveByDomain(shuffle(allQ));

    // Build 20-slot session
    const base = shuffled.slice(0, SESSION_LENGTH);

    // Pre-generate WHY frames for elaborative positions
    const whyPositions = [3, 7, 12, 17];
    const slots = [];
    let whyIdx = 0;
    for (let i = 0; i < base.length; i++) {
      const pos = i + 1; // 1-indexed
      const q = base[i];
      if (ELABORATIVE_POSITIONS.has(pos)) {
        slots.push({ ...q, _neuroType: 'elaborative', _whyLoading: true });
      } else if (GENERATION_POSITIONS.has(pos)) {
        slots.push({ ...q, _neuroType: 'generation' });
      } else {
        slots.push({ ...q, _neuroType: 'standard' });
      }
    }

    const session = await base44.entities.StudySession.create({
      trades: trades.length > 0 ? trades : ['General'],
      jurisdiction,
      total_questions: slots.length,
      correct_answers: 0,
      completed: false,
    });

    setSessionId(session.id);
    setSessionQueue(slots);
    setCurrentIndex(0);
    setPhase('drilling');
    loadingRef.current = false;

    // Async generate WHY frames
    for (let i = 0; i < slots.length; i++) {
      if (slots[i]._neuroType === 'elaborative') {
        generateWhyFrame(slots[i]).then(resp => {
          if (resp?.why_question) {
            setSessionQueue(prev => {
              const updated = [...prev];
              updated[i] = { ...updated[i], _whyQuestion: resp.why_question, _whyAnswer: resp.why_answer, _whyLoading: false };
              return updated;
            });
          } else {
            setSessionQueue(prev => { const u = [...prev]; u[i] = { ...u[i], _whyLoading: false }; return u; });
          }
        });
      }
    }
  };

  // Timer
  useEffect(() => {
    if (phase !== 'drilling' || isPaused || showMaster || timeoutReveal) return;
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

  const pauseTimer = () => { clearInterval(timerRef.current); setIsPaused(true); };
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
    const current = sessionQueue[currentIndex];
    if (!current) return;
    setSessionStats(prev => ({ ...prev, wrong: prev.wrong + 1, total: prev.total + 1 }));
    base44.entities.LawQuestion.update(current.id, { confidence_tier: Math.max(1, (current.confidence_tier ?? 0) - 1), consecutive_correct: 0, next_review_date: addDays(1) });
    base44.entities.QuestionAttempt.create({ question_id: current.id, user_answer: '__TIMEOUT__', is_correct: false, session_id: sessionId });
  };

  const handleAnswer = (userAnswer, isCorrect, extra = {}) => {
    clearInterval(timerRef.current);
    const current = sessionQueue[currentIndex];
    if (!current) return;

    const isElaborative = current._neuroType === 'elaborative';
    const isGeneration = current._neuroType === 'generation';
    const selfGenCorrect = extra.selfGenCorrect || false;

    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
      total: prev.total + 1,
      selfGeneratedCorrect: prev.selfGeneratedCorrect + (isGeneration && selfGenCorrect ? 1 : 0),
      selfGeneratedTotal: prev.selfGeneratedTotal + (isGeneration ? 1 : 0),
      elaborativeCorrect: prev.elaborativeCorrect + (isElaborative && isCorrect ? 1 : 0),
      elaborativeTotal: prev.elaborativeTotal + (isElaborative ? 1 : 0),
      assisted: prev.assisted + (assistedThisQ ? 1 : 0),
    }));

    const tier = current.confidence_tier ?? 0;
    const newTier = isCorrect ? Math.min(5, tier + 1) : Math.max(1, tier - 1);
    base44.entities.LawQuestion.update(current.id, { confidence_tier: newTier, consecutive_correct: isCorrect ? (current.consecutive_correct ?? 0) + 1 : 0, next_review_date: addDays(SRS_INTERVALS[newTier] ?? 30) });
    base44.entities.QuestionAttempt.create({ question_id: current.id, user_answer: userAnswer, is_correct: isCorrect, session_id: sessionId });

    setGenInput('');
    setGenRevealed(false);
    setGenSelfCorrect(false);
    setAssistedThisQ(false);
    setTimeoutReveal(false);

    const next = currentIndex + 1;
    if (next >= sessionQueue.length) {
      base44.entities.StudySession.update(sessionId, { correct_answers: sessionStats.correct + (isCorrect ? 1 : 0), total_questions: sessionStats.total + 1, completed: true });
      setPhase('retrieval_prompt');
    } else {
      setCurrentIndex(next);
    }
  };

  const normalizeAns = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const checkGenSelfCorrect = (input, correct) => {
    const u = normalizeAns(input);
    const c = normalizeAns(correct);
    if (!u || u.length < 2) return false;
    const uW = new Set(u.split(' ').filter(w => w.length > 2));
    const cW = new Set(c.split(' ').filter(w => w.length > 2));
    return [...uW].filter(w => cW.has(w)).length / Math.max(cW.size, 1) >= 0.5;
  };

  if (phase === 'briefing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-slate-900 to-indigo-950 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">← Dashboard</Button>
            </Link>
          </div>
          <div className="text-center mb-6">
            <Brain className="h-14 w-14 text-violet-400 mx-auto mb-3" />
            <h1 className="text-4xl font-black text-white mb-2">NEUROPLASTICITY TRAINING</h1>
            <p className="text-violet-300 text-sm">The hardest thing in this app. By design.</p>
          </div>
          <Card className="bg-violet-900/30 border-violet-700 shadow-2xl mb-6">
            <CardContent className="p-6">
              <h2 className="text-white font-bold text-lg mb-3">NEUROPLASTICITY TRAINING — WHAT THIS IS AND WHY IT WORKS</h2>
              <div className="text-violet-200 text-sm space-y-3 whitespace-pre-line leading-relaxed">
                {BRIEFING_TEXT}
              </div>
            </CardContent>
          </Card>
          <Button
            className="w-full h-14 bg-violet-700 hover:bg-violet-600 text-white font-bold text-lg"
            onClick={() => { setPhase('loading'); if (user) loadSession(); }}
          >
            <Brain className="h-5 w-5 mr-2" />Begin Neuroplasticity Session
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-950 via-slate-900 to-indigo-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-violet-400 mx-auto mb-4" />
          <p className="text-violet-200 text-lg">Building your session...</p>
          <p className="text-violet-400 text-xs mt-2">Preparing interleaved questions and WHY frames</p>
        </div>
      </div>
    );
  }

  if (phase === 'retrieval_prompt') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-950 via-slate-900 to-indigo-950 p-4">
        <Card className="max-w-lg w-full bg-violet-900/40 border-violet-700 shadow-2xl">
          <CardContent className="p-8 space-y-5">
            <div className="text-center">
              <Brain className="h-10 w-10 text-violet-400 mx-auto mb-3" />
              <h2 className="text-xl font-black text-white">SESSION COMPLETE — DO THIS NOW FOR DOUBLE THE RETENTION:</h2>
            </div>
            <div className="bg-violet-800/40 rounded-xl p-5 text-violet-100 text-sm space-y-2">
              <p>Before you look at your score, take 2 minutes and write down — from memory, without scrolling back — the three things that were hardest in this session. Write them in your own words. Don't look them up yet.</p>
              <p>After you've written them down, check your score. Then find the hardest item on your list and read the correct answer and citation one more time.</p>
              <p className="font-bold text-violet-200">That's it. Two minutes. It doubles what you keep.</p>
            </div>
            <Button onClick={() => setPhase('finished')} className="w-full bg-violet-700 hover:bg-violet-600 text-white font-bold">
              I've done it — show my score
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'finished') {
    const acc = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
    const sgRate = sessionStats.selfGeneratedTotal > 0 ? Math.round((sessionStats.selfGeneratedCorrect / sessionStats.selfGeneratedTotal) * 100) : 0;
    const elabRate = sessionStats.elaborativeTotal > 0 ? Math.round((sessionStats.elaborativeCorrect / sessionStats.elaborativeTotal) * 100) : 0;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-950 via-slate-900 to-indigo-950 p-4">
        <Card className="max-w-md w-full bg-slate-800 border-violet-700 shadow-2xl">
          <CardHeader className="text-center border-b border-violet-800">
            <CardTitle className="text-3xl text-white">Neuro Session Done</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-5">
            <div className="text-5xl font-black text-center text-violet-400">{acc}%</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-900/40 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-green-400">{sessionStats.correct}</p>
                <p className="text-xs text-green-300">Correct</p>
              </div>
              <div className="bg-red-900/40 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-red-400">{sessionStats.wrong}</p>
                <p className="text-xs text-red-300">Wrong</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-violet-300">Self-Generated Correct Rate</span>
                <span className="text-white font-bold">{sgRate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-violet-300">WHY Question Score</span>
                <span className="text-white font-bold">{elabRate}%</span>
              </div>
              {sessionStats.assisted > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-300">Used Ask The Master</span>
                  <span className="text-white font-bold">{sessionStats.assisted}x</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { setPhase('loading'); if (user) loadSession(); }} className="w-full bg-violet-700 hover:bg-violet-600 text-white">
                <RotateCcw className="h-4 w-4 mr-2" />Another Session
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

  // Drilling phase
  const currentQ = sessionQueue[currentIndex];
  if (!currentQ) return null;
  const posLabel = currentIndex + 1;
  const isElaborative = currentQ._neuroType === 'elaborative';
  const isGeneration = currentQ._neuroType === 'generation';
  const displayQuestion = isElaborative && currentQ._whyQuestion ? { ...currentQ, question_text: currentQ._whyQuestion } : currentQ;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-slate-900 to-indigo-950 p-4 md:p-8">
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
            <Badge className="bg-violet-800 text-violet-200 text-xs">NEURO</Badge>
            {isElaborative && <Badge className="bg-indigo-700 text-indigo-100 text-xs">WHY FRAME</Badge>}
            {isGeneration && <Badge className="bg-emerald-800 text-emerald-100 text-xs">GENERATION</Badge>}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-400 font-semibold flex items-center gap-1"><CheckCircle className="h-4 w-4" />{sessionStats.correct}</span>
            <span className="text-red-400 font-semibold flex items-center gap-1"><XCircle className="h-4 w-4" />{sessionStats.wrong}</span>
            <span className="text-gray-400 text-xs">{posLabel}/{SESSION_LENGTH}</span>
          </div>
        </div>

        {/* Timer */}
        <div className="flex justify-center mb-6">
          <TimerDisplay levelConfig={levelConfig} timeLeft={timeLeft} isPaused={isPaused} />
        </div>

        {/* Loading WHY frame */}
        {isElaborative && currentQ._whyLoading && (
          <div className="bg-indigo-900/40 border border-indigo-700 rounded-xl p-4 mb-4 flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            <span className="text-indigo-200 text-sm">Preparing WHY frame...</span>
          </div>
        )}

        {/* Timeout reveal */}
        {timeoutReveal ? (
          <Card className="bg-slate-800 border-red-700 shadow-xl">
            <CardContent className="p-6 text-center space-y-4">
              <div className="text-red-400 font-black text-xl">⏱ TIME'S UP</div>
              <p className="text-gray-300 text-sm">{currentQ.question_text}</p>
              <div className="bg-green-900/40 border border-green-700 rounded-lg p-3">
                <p className="text-xs text-green-300 font-semibold mb-1">Correct Answer:</p>
                <p className="text-green-200 font-bold">{currentQ._whyAnswer || currentQ.correct_answer}</p>
              </div>
              <Button onClick={() => { setTimeoutReveal(false); handleAnswer('__TIMEOUT__', false); }} className="w-full bg-orange-700 hover:bg-orange-800 text-white">Next →</Button>
            </CardContent>
          </Card>
        ) : isGeneration && !genRevealed ? (
          /* Generation Effect — type first, then reveal choices */
          <Card className="bg-slate-800 border-emerald-700 shadow-xl">
            <CardContent className="p-6 space-y-4">
              <p className="text-white font-semibold text-base leading-relaxed">{displayQuestion.question_text}</p>
              <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-3">
                <p className="text-emerald-300 text-xs font-bold uppercase tracking-wide mb-2">WRITE YOUR ANSWER BEFORE CHOICES APPEAR</p>
                <Input
                  className="bg-slate-700 border-slate-600 text-white placeholder-gray-500"
                  placeholder="Type your answer..."
                  value={genInput}
                  onChange={e => setGenInput(e.target.value)}
                />
              </div>
              <Button
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white"
                disabled={genInput.trim().length < 3}
                onClick={() => {
                  const selfCorrect = checkGenSelfCorrect(genInput, currentQ.correct_answer);
                  setGenSelfCorrect(selfCorrect);
                  setGenRevealed(true);
                }}
              >
                REVEAL CHOICES
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Standard / elaborative / generation (after reveal) */
          <div>
            {isGeneration && genRevealed && genSelfCorrect && (
              <div className="bg-emerald-900/40 border border-emerald-600 rounded-xl p-3 mb-3">
                <p className="text-emerald-300 text-xs font-bold">⭐ SELF-GENERATED CORRECT — You knew it before the choices appeared.</p>
              </div>
            )}
            {displayQuestion.question_type === 'multiple_choice' && (
              <MultipleChoiceCard
                key={displayQuestion.id + currentIndex}
                question={{ ...displayQuestion, explanation: isElaborative && currentQ._whyAnswer ? `WHY: ${currentQ._whyAnswer}\n\n${displayQuestion.explanation || ''}` : displayQuestion.explanation }}
                onAnswer={(ans, correct) => handleAnswer(ans, correct, { selfGenCorrect: genSelfCorrect })}
              />
            )}
            {displayQuestion.question_type === 'true_false' && (
              <TrueFalseCard key={displayQuestion.id + currentIndex} question={displayQuestion} onAnswer={(ans, correct) => handleAnswer(ans, correct, { selfGenCorrect: genSelfCorrect })} />
            )}
            {displayQuestion.question_type === 'fill_in_blank' && (
              <FillInBlankCard key={displayQuestion.id + currentIndex} question={displayQuestion} onAnswer={(ans, correct) => handleAnswer(ans, correct, { selfGenCorrect: genSelfCorrect })} />
            )}
          </div>
        )}

        {/* Ask The Master */}
        {!timeoutReveal && !(isGeneration && !genRevealed) && (
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