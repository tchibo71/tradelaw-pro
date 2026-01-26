import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { format } from 'date-fns';

export default function History() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', user?.email],
    queryFn: async () => {
      const data = await base44.entities.StudySession.filter({ created_by: user?.email });
      return data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user,
  });

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
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card className="shadow-xl border-2">
          <CardHeader className="bg-gradient-to-r from-navy-600 to-indigo-700 text-white">
            <CardTitle className="text-2xl">Study History</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No study sessions yet</p>
                <p className="text-gray-400 mb-6">Start studying to build your history</p>
                <Link to={createPageUrl('Study')}>
                  <Button className="bg-navy-600 hover:bg-navy-700">
                    Start First Session
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => {
                  const accuracy = session.total_questions > 0 
                    ? Math.round((session.correct_answers / session.total_questions) * 100)
                    : 0;
                  
                  return (
                    <Card key={session.id} className="border-2 hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <p className="text-sm text-gray-600">
                                {format(new Date(session.created_date), 'MMMM d, yyyy • h:mm a')}
                              </p>
                            </div>
                            <p className="font-medium text-navy-900 mb-2">
                              {session.trades?.join(', ')} • {session.jurisdiction}
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                              {session.duration_minutes && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{session.duration_minutes} min</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Target className="h-4 w-4" />
                                <span>{session.total_questions} questions</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-3xl font-bold ${
                              accuracy >= 80 ? 'text-green-600' :
                              accuracy >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {accuracy}%
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {session.correct_answers}/{session.total_questions} correct
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}