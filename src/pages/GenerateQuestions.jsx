import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

const API_KEY = 'd176fde449dbead5a0aead4739173214';

const TRADES = ["Plumbing", "Electrical", "HVAC", "Carpentry", "Masonry", "Roofing", "Welding", "Farrier"];

const STATES = [
  "Federal", "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

export default function GenerateQuestions() {
  const [selectedTrade, setSelectedTrade] = useState('');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const generateQuestions = async () => {
    setGenerating(true);
    setResults(null);

    try {
      // Use AI to generate questions based on trade and jurisdiction
      const prompt = `Generate 5 realistic professional certification exam questions for ${selectedTrade} professionals regarding ${selectedJurisdiction} laws and regulations.

For each question, provide:
1. A realistic question text that would appear on a professional exam
2. Question type (multiple_choice, true_false, or fill_in_blank)
3. The correct answer
4. For multiple choice: 4 plausible answer options
5. The law type (statute or regulation)
6. A realistic legal citation (e.g., "OSHA 1926.451", "CA Business Code § 7031", "IRC 2018 Section 301.2")
7. A detailed explanation referencing the actual legal requirement
8. Difficulty level (beginner, intermediate, or advanced)

Focus on:
- Safety regulations (OSHA, building codes)
- Licensing requirements
- Professional standards
- Industry-specific regulations
- State-specific requirements for ${selectedJurisdiction}

Make the questions professional, accurate, and exam-worthy.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_text: { type: "string" },
                  question_type: { type: "string" },
                  correct_answer: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  law_type: { type: "string" },
                  law_citation: { type: "string" },
                  explanation: { type: "string" },
                  difficulty: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Create questions in database
      const questionsToCreate = response.questions.map(q => ({
        question_text: q.question_text,
        question_type: q.question_type,
        correct_answer: q.correct_answer,
        options: q.options || [],
        trade: selectedTrade,
        jurisdiction: selectedJurisdiction,
        law_type: q.law_type,
        law_citation: q.law_citation,
        explanation: q.explanation,
        difficulty: q.difficulty
      }));

      await base44.entities.LawQuestion.bulkCreate(questionsToCreate);
      
      queryClient.invalidateQueries(['questions']);
      
      setResults({
        success: true,
        count: questionsToCreate.length
      });
    } catch (error) {
      console.error('Error generating questions:', error);
      setResults({
        success: false,
        error: error.message
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="sm">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8" />
              <div>
                <CardTitle className="text-2xl">Generate Questions</CardTitle>
                <CardDescription className="text-purple-100">
                  AI-powered question generation using real legal data
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Trade
                </label>
                <Select value={selectedTrade} onValueChange={setSelectedTrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a trade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADES.map(trade => (
                      <SelectItem key={trade} value={trade}>{trade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Jurisdiction
                </label>
                <Select value={selectedJurisdiction} onValueChange={setSelectedJurisdiction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose jurisdiction..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {STATES.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={generateQuestions}
              disabled={!selectedTrade || !selectedJurisdiction || generating}
              className="w-full h-14 text-lg bg-purple-600 hover:bg-purple-700"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate 5 Questions
                </>
              )}
            </Button>

            {results && (
              <div className={`p-4 rounded-lg border-2 ${
                results.success 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-red-50 border-red-500'
              }`}>
                <div className="flex items-start gap-3">
                  {results.success ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-900 mb-1">
                          Successfully generated {results.count} questions!
                        </p>
                        <p className="text-sm text-green-800">
                          Questions have been added to the database for {selectedTrade} ({selectedJurisdiction})
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900 mb-1">Generation failed</p>
                        <p className="text-sm text-red-800">{results.error}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>How it works:</strong> This tool uses AI with real-time legal research to generate 
                professional exam-quality questions based on actual {selectedJurisdiction} laws and regulations 
                for {selectedTrade || 'your selected trade'}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}