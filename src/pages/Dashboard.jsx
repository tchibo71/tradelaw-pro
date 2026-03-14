import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatsCard from '../components/dashboard/StatsCard';
import {
  BookOpen,
  Target,
  Trophy,
  TrendingUp,
  Play,
  RotateCcw,
  Settings,
  History,
  Sparkles,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

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

  useEffect(() => {
    base44.auth.me().then(currentUser => {
      setUser(currentUser);
      if (!currentUser.preferred_trades || !currentUser.preferred_jurisdiction) {
        window.location.href = createPageUrl('Setup');
      }
    });
  }, []);

  // Calculate stats
  const totalQuestions = attempts.length;
  const correctAnswers = attempts.filter(a => a.is_correct).length;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const totalSessions = sessions.length;
  const questionsToReview = reviewQueue.length;

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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-navy-900 mb-2">
                Welcome back, {user.full_name?.split(' ')[0] || 'Professional'}
              </h1>
              <p className="text-gray-600 text-lg">
                {user.preferred_trades?.join(', ')} • {user.preferred_jurisdiction}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl('Setup')}>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Change Preferences
                </Button>
              </Link>
            </div>
          </div>
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
              await Promise.all(all.map(a => base44.entities.QuestionAttempt.delete(a.id)));
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
              await Promise.all(all.map(a => base44.entities.QuestionAttempt.delete(a.id)));
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
              await Promise.all(all.map(s => base44.entities.StudySession.delete(s.id)));
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
              await Promise.all(all.map(r => base44.entities.ReviewQueue.delete(r.id)));
              queryClient.invalidateQueries(['reviewQueue']);
            }}
          />
        </div>

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