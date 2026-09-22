import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatsCard from '../components/dashboard/StatsCard';
import PreferencesPanel from '../components/dashboard/PreferencesPanel';
import {
  BookOpen,
  Target,
  Trophy,
  TrendingUp,
  Play,
  RotateCcw,
  History,
  Sparkles,
  Trash2,
  Clock,
  Brain
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  const deleteInBatches = async (entity, ids) => {
    for (let i = 0; i < ids.length; i += 3) {
      await Promise.all(ids.slice(i, i + 3).map(id => entity.delete(id).catch(() => {})));
      if (i + 3 < ids.length) await new Promise(r => setTimeout(r, 400));
    }
  };

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', user?.email],
    queryFn: () => base44.entities.StudySession.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['attempts', user?.email],
    queryFn: () => base44.entities.QuestionAttempt.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  const { data: reviewQueue = [] } = useQuery({
    queryKey: ['reviewQueue', user?.email],
    queryFn: () => base44.entities.ReviewQueue.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['lawQuestions', user?.email],
    queryFn: () => base44.entities.LawQuestion.filter({ created_by: user.email }, null, 2000),
    enabled: !!user?.email,
  });

  useEffect(() => {
    base44.auth.me().then(currentUser => {
      setUser(currentUser);
    });
  }, []);

  // Calculate stats
  const totalQuestions = attempts.length;
  const correctAnswers = attempts.filter(a => a.is_correct).length;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const totalSessions = sessions.length;
  const questionsToReview = reviewQueue.length;

  // Weak areas: group questions by knowledge_domain, compute average confidence_tier
  // and count of low-tier (0-1) questions, then sort weakest first.
  const domainMap = new Map();
  for (const q of allQuestions) {
    const domain = q.knowledge_domain || 'Uncategorized';
    if (!domainMap.has(domain)) domainMap.set(domain, []);
    domainMap.get(domain).push(q);
  }
  const weakAreas = [...domainMap.entries()].map(([domain, qs]) => {
    const avgTier = qs.reduce((sum, q) => sum + (q.confidence_tier ?? 0), 0) / qs.length;
    const lowTierCount = qs.filter(q => (q.confidence_tier ?? 0) <= 1).length;
    return { domain, avgTier, lowTierCount, total: qs.length };
  }).sort((a, b) => a.avgTier - b.avgTier);
  const bottomWeakAreas = weakAreas.slice(0, 5);

  const studyUrl = createPageUrl('Study') +
    '?trades=' + encodeURIComponent((user?.preferred_trades || []).join(',')) +
    '&jurisdiction=' + encodeURIComponent(user?.preferred_jurisdiction || '');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-navy-900 mb-1">
            Welcome back, {user.full_name?.split(' ')[0] || 'Professional'}
          </h1>
          <p className="text-gray-500 text-base mb-6">Your study dashboard</p>
          <PreferencesPanel
            user={user}
            onSaved={(updated) => setUser(prev => ({ ...prev, ...updated }))}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            icon={BookOpen}
            label="Questions Answered"
            value={totalQuestions}
            color="blue"
            onReset={async () => {
              const all = await base44.entities.QuestionAttempt.filter({ created_by: user.email });
              await deleteInBatches(base44.entities.QuestionAttempt, all.map(a => a.id));
              queryClient.invalidateQueries(['attempts']);
            }}
          />
          <StatsCard
            icon={Target}
            label="Accuracy Rate"
            value={`${accuracy}%`}
            color="green"
            onReset={async () => {
              const all = await base44.entities.QuestionAttempt.filter({ created_by: user.email });
              await deleteInBatches(base44.entities.QuestionAttempt, all.map(a => a.id));
              queryClient.invalidateQueries(['attempts']);
            }}
          />
          <StatsCard
            icon={Trophy}
            label="Study Sessions"
            value={totalSessions}
            color="gold"
            onReset={async () => {
              const all = await base44.entities.StudySession.filter({ created_by: user.email });
              await deleteInBatches(base44.entities.StudySession, all.map(s => s.id));
              queryClient.invalidateQueries(['sessions']);
            }}
          />
          <StatsCard
            icon={TrendingUp}
            label="Need Review"
            value={questionsToReview}
            color="purple"
            onReset={async () => {
              const all = await base44.entities.ReviewQueue.filter({ created_by: user.email });
              await deleteInBatches(base44.entities.ReviewQueue, all.map(r => r.id));
              queryClient.invalidateQueries(['reviewQueue']);
            }}
          />
        </div>

        {/* Weak Areas */}
        {bottomWeakAreas.length > 0 && (
          <Card className="shadow-xl border-2 mb-8">
            <CardHeader className="bg-gradient-to-r from-orange-100 to-red-100">
              <CardTitle className="text-xl text-navy-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-600" />
                Weak Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {bottomWeakAreas.map((area) => (
                  <Link
                    key={area.domain}
                    to={studyUrl}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg bg-gray-50 hover:bg-orange-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-navy-900 truncate group-hover:text-orange-900">
                        {area.domain}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 max-w-[120px] h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-400 to-orange-400"
                            style={{ width: `${(area.avgTier / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {area.avgTier.toFixed(1)}/5 avg
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-orange-600">{area.lowTierCount}</p>
                      <p className="text-xs text-gray-500">low-tier</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-xl border-2 hover:shadow-2xl transition-all cursor-pointer group h-full">
              <Link to={createPageUrl('Study')}>
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-4 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors">
                      <Play className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-navy-900 mb-2">Start Studying</h3>
                  <p className="text-gray-600">
                    Practice with randomized questions using spaced repetition
                  </p>
                </CardContent>
              </Link>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-xl border-2 hover:shadow-2xl transition-all cursor-pointer group h-full">
              <Link to={createPageUrl('Review')}>
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-4 rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <RotateCcw className="h-8 w-8 text-purple-600" />
                    </div>
                    {questionsToReview > 0 && (
                     <span className="px-3 py-1 bg-purple-200 text-purple-900 rounded-full text-sm font-bold">
                       {questionsToReview}
                     </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-navy-900 mb-2">Review Mistakes</h3>
                  <p className="text-gray-600">
                    Focus on questions you've answered incorrectly
                  </p>
                </CardContent>
              </Link>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="shadow-xl border-2 hover:shadow-2xl transition-all cursor-pointer group h-full border-red-200">
              <Link to={createPageUrl('TimedDrill')}>
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-4 rounded-xl bg-red-100 group-hover:bg-red-200 transition-colors">
                      <Clock className="h-8 w-8 text-red-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-navy-900 mb-2">Timed Drill</h3>
                  <p className="text-gray-600">
                    7 pressure levels from Novice to Grand Master. Train knowledge under time stress.
                  </p>
                </CardContent>
              </Link>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="shadow-xl border-2 hover:shadow-2xl transition-all cursor-pointer group h-full border-violet-200">
              <Link to={createPageUrl('NeuroDrill')}>
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-4 rounded-xl bg-violet-100 group-hover:bg-violet-200 transition-colors">
                      <Brain className="h-8 w-8 text-violet-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-navy-900 mb-2">Neuroplasticity Training</h3>
                  <p className="text-gray-600">
                    The hardest mode. Interleaving, WHY frames, generation effect, timed. Builds durable recall.
                  </p>
                </CardContent>
              </Link>
            </Card>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-xl border-2">
          <CardHeader className="bg-gradient-to-r from-navy-100 to-indigo-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-navy-900">Recent Activity</CardTitle>
              <div className="flex items-center gap-2">
                <Link to={createPageUrl(`GenerateQuestions?prefill_trades=${encodeURIComponent((user.preferred_trades || []).join(','))}&prefill_jurisdiction=${encodeURIComponent(user.preferred_jurisdiction || '')}`)}>
                  <Button variant="ghost" size="sm" className="text-purple-700 hover:bg-purple-100">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate More
                  </Button>
                </Link>
                <Link to={createPageUrl('History')}>
                  <Button variant="ghost" size="sm" className="text-navy-900 hover:bg-navy-200">
                    <History className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No study sessions yet</p>
                <p className="text-gray-400 mb-6">Start your first session to begin tracking your progress</p>
                <Link to={createPageUrl('Study')}>
                  <Button className="bg-navy-600 hover:bg-navy-700 text-gray-900">
                    <Play className="h-4 w-4 mr-2" />
                    Start First Session
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-navy-900">
                          {session.trades?.join(', ')} • {session.jurisdiction}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(session.created_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-navy-900">
                          {session.correct_answers}/{session.total_questions}
                        </p>
                        <p className="text-xs text-gray-500">
                          {session.total_questions > 0 ? Math.round((session.correct_answers / session.total_questions) * 100) : 0}% correct
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-500"
                        onClick={async () => {
                          try { await base44.entities.StudySession.delete(session.id); } catch (_) {}
                          queryClient.invalidateQueries({ queryKey: ['sessions'] });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}