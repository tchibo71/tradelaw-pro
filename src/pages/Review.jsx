import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';

export default function Review() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: reviewQueue = [] } = useQuery({
    queryKey: ['reviewQueue', user?.email],
    queryFn: () => base44.entities.ReviewQueue.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.LawQuestion.list(),
  });

  const questionsToReview = reviewQueue.map(review => {
    const question = allQuestions.find(q => q.id === review.question_id);
    return { ...question, reviewData: review };
  }).filter(q => q.id);

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

        <Card className="shadow-xl border-2 mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
            <CardTitle className="text-2xl">Questions to Review</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {questionsToReview.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No questions to review</p>
                <p className="text-gray-400 mb-6">You're doing great! All caught up.</p>
                <Link to={createPageUrl('Study')}>
                  <Button className="bg-navy-600 hover:bg-navy-700">
                    Continue Studying
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  You have {questionsToReview.length} question{questionsToReview.length !== 1 ? 's' : ''} that need review.
                  Practice mode with these questions is coming soon!
                </p>
                
                {questionsToReview.map((question, index) => (
                  <Card key={question.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-navy-900 mb-2">{question.question_text}</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-navy-100 text-navy-800">
                              {question.trade}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                              {question.jurisdiction}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                              {question.law_type}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500">Times incorrect</p>
                          <p className="text-2xl font-bold text-purple-600">{question.reviewData?.times_incorrect || 1}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="pt-4">
                  <Link to={createPageUrl('Study')}>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 h-12">
                      Practice These Questions
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}