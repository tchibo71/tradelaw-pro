import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BookOpen, CheckCircle, XCircle, RotateCcw, Home, GraduationCap } from 'lucide-react';
import MultipleChoiceCard from '@/components/study/MultipleChoiceCard';
import TrueFalseCard from '@/components/study/TrueFalseCard';
import FillInBlankCard from '@/components/study/FillInBlankCard';
import AskTheMaster from '@/components/study/AskTheMaster';

// SRS intervals by tier (days)
const SRS_INTERVALS = [0, 1, 2, 3, 7, 14, 30];

const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

export default function Study() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramTrades = urlParams.get('trades') ? urlParams.get('trades').split(',').filter(Boolean) : [];
  const paramJurisdiction = urlParams.get('jurisdiction') || '';

  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [lawTypeFilter, setLawTypeFilter] = useState('all');
  const [showMaster, setShowMaster] = useState(false);
  const [assistedThisQ, setAssistedThisQ] = useState(false);
  const wrongAnswersRef = useRef([]);
  const answeredSinceShuffleRef = useRef(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  useEffect(() => {
    if (user) loadQuestions();
  }, [user, lawTypeFilter]);

  const loadQuestions = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setFinished(false);
    wrongAnswersRef.current = [];
    setSessionStats({ correct: 0, incorrect: 0, total: 0 });

    const trades = paramTrades.length > 0 ? paramTrades : (user?.preferred_trades || []);
    const jurisdiction = paramJurisdiction || user?.preferred_jurisdiction || 'Federal';

    // Fetch all questions for this jurisdiction in one call, then filter client-side
    const filter = { jurisdiction };
    if (lawTypeFilter !== 'all') filter.law_type = lawTypeFilter;
    let allQ = await base44.entities.LawQuestion.filter(filter, null, 2000);
    if (trades.length > 0) {
      const tradeSet = new Set(trades);
      allQ = allQ.filter(q => tradeSet.has(q.trade));
    }

    // Deduplicate
    const seen = new Set();
    allQ = allQ.filter(q => { if (seen.has(q.id)) return false; seen.add(q.id); return true; });

    // Shuffle all questions randomly (Fisher-Yates)
    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const selected = shuffle(allQ);

    // Create study session
    const session = await base44.entities.StudySession.create({
      trades: trades.length > 0 ? trades : ['General'],
      jurisdiction,
      total_questions: selected.length,
      correct_answers: 0,
      completed: false,
    });

    answeredSinceShuffleRef.current = 0;
    setSessionId(session.id);
    setQuestions(selected);
    setQueue([...selected]);
    setCurrentIndex(0);
    setLoading(false);
    loadingRef.current = false;
  };

  const handleAnswer = async (userAnswer, isCorrect) => {
    const current = queue[currentIndex];
    if (!current) return;

    // Update session stats
    const newStats = {
      correct: sessionStats.correct + (isCorrect ? 1 : 0),
      incorrect: sessionStats.incorrect + (isCorrect ? 0 : 1),
      total: sessionStats.total + 1,
    };
    setSessionStats(newStats);

    // Record attempt (fire-and-forget)
    base44.entities.QuestionAttempt.create({
      question_id: current.id,
      user_answer: userAnswer,
      is_correct: isCorrect,
      session_id: sessionId,
    });

    // Update SRS on question
    const currentTier = current.confidence_tier ?? 0;
    const currentStreak = current.consecutive_correct ?? 0;
    let newTier, newStreak;
    if (isCorrect) {
      newStreak = currentStreak + 1;
      newTier = Math.min(5, currentTier + 1);
    } else {
      newStreak = 0;
      newTier = Math.max(1, currentTier - 1);
      // Track wrong answer for review
      wrongAnswersRef.current.push(current);
      // Re-queue 3-5 positions later
      const insertAt = Math.min(currentIndex + 3 + Math.floor(Math.random() * 3), queue.length);
      setQueue(prev => {
        const newQueue = [...prev];
        newQueue.splice(insertAt, 0, { ...current, _requeued: true });
        return newQueue;
      });
    }

    const interval = SRS_INTERVALS[newTier] ?? 30;
    // Fire-and-forget — don't await, no need to block UI
    base44.entities.LawQuestion.update(current.id, {
      confidence_tier: newTier,
      consecutive_correct: newStreak,
      next_review_date: addDays(interval),
    });

    // Update review queue (fire-and-forget)
    if (!isCorrect) {
      base44.entities.ReviewQueue.filter({ question_id: current.id }).then(existing => {
        if (existing.length > 0) {
          base44.entities.ReviewQueue.update(existing[0].id, {
            times_incorrect: (existing[0].times_incorrect ?? 1) + 1,
            priority_score: (existing[0].priority_score ?? 1) + 1,
            last_attempt_date: new Date().toISOString(),
          });
        } else {
          base44.entities.ReviewQueue.create({
            question_id: current.id,
            times_incorrect: 1,
            priority_score: 1,
            last_attempt_date: new Date().toISOString(),
          });
        }
      });
    } else if (newTier >= 4) {
      base44.entities.ReviewQueue.filter({ question_id: current.id }).then(existing => {
        for (const r of existing) base44.entities.ReviewQueue.delete(r.id);
      });
    }

    // Reshuffle every 50 answered questions
    answeredSinceShuffleRef.current += 1;
    let reshuffledQueue = null;
    if (answeredSinceShuffleRef.current >= 50) {
      answeredSinceShuffleRef.current = 0;
      setQueue(prev => {
        const remaining = prev.slice(currentIndex + 1);
        const shuffled = [...remaining].sort(() => Math.random() - 0.5);
        reshuffledQueue = shuffled;
        return shuffled;
      });
    }

    // Move to next
    const nextIndex = reshuffledQueue ? 0 : currentIndex + 1;
    if (!reshuffledQueue && nextIndex >= queue.length) {
      // Session complete
      await base44.entities.StudySession.update(sessionId, {
        correct_answers: newStats.correct,
        total_questions: newStats.total,
        completed: true,
      });
      setFinished(true);
    } else {
      if (!reshuffledQueue) setCurrentIndex(nextIndex);
      else setCurrentIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <Card className="max-w-md w-full shadow-xl text-center p-8">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Questions Found</h2>
          <p className="text-gray-500 mb-6">Generate questions first to start studying.</p>
          <Link to={createPageUrl('GenerateQuestions')}>
            <Button className="w-full">Generate Questions</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (finished) {
    const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <CardTitle className="text-3xl text-gray-800">Session Complete!</CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center space-y-6">
            <div className="text-6xl font-bold text-indigo-600">{accuracy}%</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{sessionStats.correct}</p>
                <p className="text-sm text-green-600">Correct</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">{sessionStats.incorrect}</p>
                <p className="text-sm text-red-600">Incorrect</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={loadQuestions} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />Study Again
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

  const currentQuestion = queue[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="sm">← Dashboard</Button>
          </Link>
          <div className="flex items-center gap-3">
            {/* Law Type Filter */}
            <Select value={lawTypeFilter} onValueChange={(v) => setLawTypeFilter(v)}>
              <SelectTrigger className="w-44 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Law Types</SelectItem>
                <SelectItem value="statute">Statutes Only</SelectItem>
                <SelectItem value="regulation">Regulations Only</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {currentIndex + 1} / {queue.length}
            </Badge>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex) / queue.length) * 100}%` }}
          />
        </div>

        {/* Session stats */}
        <div className="flex gap-4 mb-6 text-sm">
          <span className="flex items-center gap-1 text-green-700 font-medium">
            <CheckCircle className="h-4 w-4" />{sessionStats.correct}
          </span>
          <span className="flex items-center gap-1 text-red-700 font-medium">
            <XCircle className="h-4 w-4" />{sessionStats.incorrect}
          </span>
          {currentQuestion?.confidence_tier !== undefined && (
            <Badge variant="outline" className="text-xs">
              Tier {currentQuestion.confidence_tier ?? 0}
            </Badge>
          )}
        </div>

        {/* Question card */}
        {currentQuestion?.question_type === 'multiple_choice' && (
          <MultipleChoiceCard key={currentQuestion.id + currentIndex} question={currentQuestion} onAnswer={handleAnswer} />
        )}
        {currentQuestion?.question_type === 'true_false' && (
          <TrueFalseCard key={currentQuestion.id + currentIndex} question={currentQuestion} onAnswer={handleAnswer} />
        )}
        {currentQuestion?.question_type === 'fill_in_blank' && (
          <FillInBlankCard key={currentQuestion.id + currentIndex} question={currentQuestion} onAnswer={handleAnswer} />
        )}

        {/* Ask The Master — always visible, visually distinct from answer choices */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowMaster(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-50 border-2 border-amber-400 text-amber-800 hover:bg-amber-100 transition-all text-sm font-semibold shadow"
          >
            <GraduationCap className="h-4 w-4" />
            ASK THE MASTER
          </button>
        </div>
      </div>

      {showMaster && (
        <AskTheMaster
          currentQuestion={currentQuestion}
          onClose={() => setShowMaster(false)}
          onAsked={() => setAssistedThisQ(true)}
        />
      )}
    </div>
  );
}