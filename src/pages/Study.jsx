import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import MultipleChoiceCard from '../components/study/MultipleChoiceCard';
import TrueFalseCard from '../components/study/TrueFalseCard';
import FillInBlankCard from '../components/study/FillInBlankCard';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Study() {
  const [user, setUser] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);

    if (!currentUser.preferred_trades || !currentUser.preferred_jurisdiction) {
      window.location.href = createPageUrl('Setup');
      return;
    }

    // Fetch questions for user's preferences
    const allQuestions = await base44.entities.LawQuestion.list();
    const filteredQuestions = allQuestions.filter(q => 
      currentUser.preferred_trades.includes(q.trade) &&
      q.jurisdiction === currentUser.preferred_jurisdiction
    );

    // Get user's attempt history for spaced repetition
    const attempts = await base44.entities.QuestionAttempt.filter({ created_by: currentUser.email });
    const reviewQueue = await base44.entities.ReviewQueue.filter({ created_by: currentUser.email });

    // Sort questions based on spaced repetition
    const sortedQuestions = sortQuestionsForSpacedRepetition(filteredQuestions, attempts, reviewQueue);
    
    setQuestions(sortedQuestions.slice(0, 10)); // 10 questions per session

    // Create session
    const session = await base44.entities.StudySession.create({
      trades: currentUser.preferred_trades,
      jurisdiction: currentUser.preferred_jurisdiction,
      total_questions: Math.min(10, sortedQuestions.length),
      correct_answers: 0
    });
    
    setCurrentSession(session);
    setStartTime(Date.now());
  };

  const sortQuestionsForSpacedRepetition = (questions, attempts, reviewQueue) => {
    // Prioritize questions in review queue (incorrect answers)
    const reviewQueueIds = reviewQueue.map(r => r.question_id);
    const reviewQuestions = questions.filter(q => reviewQueueIds.includes(q.id));
    
    // Then questions never attempted
    const attemptedIds = attempts.map(a => a.question_id);
    const newQuestions = questions.filter(q => !attemptedIds.includes(q.id));
    
    // Then questions not answered recently
    const otherQuestions = questions.filter(q => 
      !reviewQueueIds.includes(q.id) && attemptedIds.includes(q.id)
    );

    // Shuffle each category
    const shuffled = [
      ...shuffle(reviewQuestions),
      ...shuffle(newQuestions),
      ...shuffle(otherQuestions)
    ];

    return shuffled;
  };

  const shuffle = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const updateSessionMutation = useMutation({
    mutationFn: ({ sessionId, data }) => base44.entities.StudySession.update(sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sessions']);
    }
  });

  const createAttemptMutation = useMutation({
    mutationFn: (data) => base44.entities.QuestionAttempt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['attempts']);
    }
  });

  const updateReviewQueueMutation = useMutation({
    mutationFn: ({ questionId, isCorrect }) => {
      if (!isCorrect) {
        return base44.entities.ReviewQueue.create({
          question_id: questionId,
          times_incorrect: 1,
          priority_score: 2,
          last_attempt_date: new Date().toISOString()
        });
      }
    }
  });

  const handleAnswer = async (userAnswer, isCorrect) => {
    const question = questions[currentQuestionIndex];
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    // Record attempt
    await createAttemptMutation.mutateAsync({
      question_id: question.id,
      user_answer: userAnswer,
      is_correct: isCorrect,
      time_spent_seconds: timeSpent,
      session_id: currentSession.id,
      repetition_number: 1
    });

    // Update session stats
    if (isCorrect) {
      await updateSessionMutation.mutateAsync({
        sessionId: currentSession.id,
        data: {
          ...currentSession,
          correct_answers: currentSession.correct_answers + 1
        }
      });
      setCurrentSession(prev => ({
        ...prev,
        correct_answers: prev.correct_answers + 1
      }));
    } else {
      // Add to review queue
      await updateReviewQueueMutation.mutateAsync({
        questionId: question.id,
        isCorrect
      });
    }

    // Move to next question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setStartTime(Date.now());
    } else {
      // Session complete
      await updateSessionMutation.mutateAsync({
        sessionId: currentSession.id,
        data: {
          ...currentSession,
          completed: true,
          duration_minutes: Math.floor((Date.now() - startTime) / 60000)
        }
      });
      window.location.href = createPageUrl('Dashboard');
    }
  };

  if (!user || !currentSession || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="text-right">
              <p className="text-sm text-gray-600">Question {currentQuestionIndex + 1} of {questions.length}</p>
              <p className="text-lg font-bold text-navy-900">
                {currentSession.correct_answers} correct
              </p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {currentQuestion.question_type === 'multiple_choice' && (
              <MultipleChoiceCard
                question={currentQuestion}
                onAnswer={handleAnswer}
              />
            )}
            {currentQuestion.question_type === 'true_false' && (
              <TrueFalseCard
                question={currentQuestion}
                onAnswer={handleAnswer}
              />
            )}
            {currentQuestion.question_type === 'fill_in_blank' && (
              <FillInBlankCard
                question={currentQuestion}
                onAnswer={handleAnswer}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}