import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, BookOpen, Sparkles, CheckCircle, XCircle, Play, AlertCircle } from 'lucide-react';
import { NASCLA_BOOKS } from '@/lib/nasclaBooks';
import { createPageUrl } from '../utils';

const BATCH_SIZE = 10;
const PRIMARY_TRADE = 'Tennessee General Contractor';

const normalizeFP = (str) =>
  (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeForMatch = (str) =>
  (str || '').toLowerCase()
    .replace(/[\u00a0\u2009\u202f\t]/g, ' ')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"']/g, '')
    .replace(/\s+/g, ' ').trim();

const isValidQuestion = (q, fps) => {
  if (!q.question_text || !q.correct_answer) return false;
  if (q.legal_fact_fingerprint && fps.has(normalizeFP(q.legal_fact_fingerprint))) return false;
  const qLower = q.question_text.toLowerCase();
  const aLower = q.correct_answer.toLowerCase().trim();
  if (aLower.length > 2 && qLower.includes(aLower)) return false;
  if (q.question_type === 'multiple_choice') {
    const trimmed = q.question_text.trim();
    if (!trimmed.includes('?') && trimmed.endsWith('.')) return false;
  }
  return true;
};

const generateBatch = async (book, batchNum, existingFPs) => {
  const tradeTag = `${PRIMARY_TRADE},${book.tradeTag}`;
  const fpList = existingFPs.length > 0
    ? `\nDO NOT test these already-covered facts:\n${existingFPs.slice(0, 30).map((f, i) => `${i + 1}. ${f}`).join('\n')}\n`
    : '';

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Generate ${BATCH_SIZE} professional exam questions for the Tennessee General Contractor NASCLA exam.
These questions are based on publicly available information about the topics covered in this reference book.

BOOK: "${book.title}" by ${book.author}
TOPICS COVERED: ${book.topics.join(', ')}
KNOWLEDGE DOMAIN: ${book.knowledgeDomain}
TRADE TAGS: ${tradeTag}
JURISDICTION: ${book.jurisdiction}
LAW TYPE: ${book.lawType}

IMPORTANT COPYRIGHT NOTICE: Do NOT reproduce any copyrighted text from this book. Generate ORIGINAL questions about the publicly available standards, codes, regulations, and professional knowledge that this book teaches. Cite the book by title as the reference source in law_citation.

Generate a MIX of question types:
- multiple_choice: 4 options, only one correct, correct_answer matches one option word-for-word
- fill_in_blank: use _____ in the question text, NEVER reveal the answer in the question
- true_false: correct_answer is exactly "True" or "False"
- essay: open-ended question, correct_answer is a model answer with key points (3-5 sentences), options is empty array []

Generate a MIX of difficulties: beginner, intermediate, advanced.

DIFFICULTY CLASSIFICATION:
- "beginner": tests a commonly-cited, frequently-encountered fact. A working tradesperson would know this from routine practice.
- "intermediate": tests a less commonly-cited rule, OR requires connecting one related fact or exception.
- "advanced": requires cross-referencing multiple standards, resolving a conflict, or applying to a non-obvious edge case.

For each question provide:
- question_text: the question (NEVER embed the answer)
- question_type: "multiple_choice" | "fill_in_blank" | "true_false" | "essay"
- correct_answer: the correct answer (for essay, model answer with key points)
- options: 4 options for MC, empty array [] for all other types
- trade: "${tradeTag}"
- jurisdiction: "${book.jurisdiction}"
- law_type: "${book.lawType}"
- law_citation: "${book.title}"
- legal_fact_fingerprint: unique description of the exact fact being tested
- explanation: why the answer is correct and the real-world consequence (2-3 sentences)
- memory_tip: one short practical sentence to remember the value or sequence
- knowledge_domain: "${book.knowledgeDomain}"
- difficulty: "beginner" | "intermediate" | "advanced"
${fpList}
RULES:
- Each question must test a DIFFERENT fact (unique legal_fact_fingerprint)
- For MC: verify each wrong option is unambiguously wrong
- For fill_in_blank: use _____ and never reveal the answer in the question
- For true_false: correct_answer is exactly "True" or "False"
- For essay: open-ended, correct_answer is a model answer with key points, options is []`,
    add_context_from_internet: true,
    model: 'gemini_3_flash',
    response_json_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question_text: { type: 'string' },
              question_type: { type: 'string', enum: ['multiple_choice', 'fill_in_blank', 'true_false', 'essay'] },
              correct_answer: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              trade: { type: 'string' },
              jurisdiction: { type: 'string' },
              law_type: { type: 'string' },
              law_citation: { type: 'string' },
              legal_fact_fingerprint: { type: 'string' },
              explanation: { type: 'string' },
              memory_tip: { type: 'string' },
              knowledge_domain: { type: 'string' },
              difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            },
          },
        },
      },
    },
  });

  return result?.questions || [];
};

export default function NASCLAGenerator() {
  const [selectedBookIds, setSelectedBookIds] = useState(new Set(NASCLA_BOOKS.map(b => b.id)));
  const [questionsPerBook, setQuestionsPerBook] = useState(25);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ bookIdx: 0, totalBooks: 0, batchIdx: 0, totalBatches: 0, totalGenerated: 0, currentBook: '' });
  const [results, setResults] = useState(null);

  const queryClient = useQueryClient();

  const toggleBook = (id) => {
    setSelectedBookIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    const books = NASCLA_BOOKS.filter(b => selectedBookIds.has(b.id));
    if (books.length === 0) return;

    setGenerating(true);
    setResults(null);

    const bookResults = [];
    let totalGenerated = 0;

    try {
      // Load existing fingerprints for dedup
      const existing = await base44.entities.LawQuestion.list(null, 2000);
      const existingFPs = new Set(
        existing.map(q => q.legal_fact_fingerprint).filter(Boolean).map(f => normalizeFP(f))
      );

      for (let bi = 0; bi < books.length; bi++) {
        const book = books[bi];
        const batchesNeeded = Math.ceil(questionsPerBook / BATCH_SIZE);
        let bookGenerated = 0;
        let bookSkipped = 0;

        for (let batchIdx = 0; batchIdx < batchesNeeded; batchIdx++) {
          setProgress({
            bookIdx: bi,
            totalBooks: books.length,
            batchIdx,
            totalBatches: batchesNeeded,
            totalGenerated,
            currentBook: book.title,
          });

          const fpSnapshot = [...existingFPs];
          const rawQuestions = await generateBatch(book, batchIdx, fpSnapshot);

          const validQuestions = [];
          for (const q of rawQuestions) {
            if (!isValidQuestion(q, existingFPs)) { bookSkipped++; continue; }
            if (q.legal_fact_fingerprint) existingFPs.add(normalizeFP(q.legal_fact_fingerprint));

            let correctAnswer = q.correct_answer?.trim();
            const options = (q.options || []).map(o => o?.trim());
            if (q.question_type === 'multiple_choice' && options.length > 0) {
              const match = options.find(opt => normalizeForMatch(opt) === normalizeForMatch(correctAnswer));
              if (match) correctAnswer = match;
            }
            if (q.question_type === 'true_false') {
              if (correctAnswer?.toLowerCase() === 'true') correctAnswer = 'True';
              if (correctAnswer?.toLowerCase() === 'false') correctAnswer = 'False';
            }

            validQuestions.push({
              question_text: q.question_text?.trim(),
              question_type: q.question_type,
              correct_answer: correctAnswer,
              options: q.question_type === 'multiple_choice' ? options : [],
              trade: `${PRIMARY_TRADE},${book.tradeTag}`,
              jurisdiction: book.jurisdiction,
              law_type: book.lawType,
              law_citation: book.title,
              legal_fact_fingerprint: q.legal_fact_fingerprint?.trim() || null,
              explanation: q.explanation,
              difficulty: q.difficulty || 'intermediate',
              memory_tip: q.memory_tip || null,
              knowledge_domain: q.knowledge_domain || book.knowledgeDomain,
              confidence_tier: 0,
              consecutive_correct: 0,
            });
          }

          if (validQuestions.length > 0) {
            await base44.entities.LawQuestion.bulkCreate(validQuestions);
            bookGenerated += validQuestions.length;
            totalGenerated += validQuestions.length;
          }
        }

        bookResults.push({
          book: book.title,
          tradeTag: book.tradeTag,
          generated: bookGenerated,
          skipped: bookSkipped,
        });
      }

      queryClient.invalidateQueries(['questions']);
      setResults({ success: true, bookResults, totalGenerated });
    } catch (error) {
      setResults({ success: false, error: error.message, bookResults, totalGenerated });
    } finally {
      setGenerating(false);
      setProgress({ bookIdx: 0, totalBooks: 0, batchIdx: 0, totalBatches: 0, totalGenerated: 0, currentBook: '' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="sm">← Back to Dashboard</Button>
          </Link>
        </div>

        <Card className="shadow-2xl border-2 mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-100 to-indigo-100">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-purple-700" />
              <div>
                <CardTitle className="text-2xl text-purple-900">NASCLA Question Generator</CardTitle>
                <CardDescription className="text-purple-800">
                  Generate exam questions from the Tennessee General Contractor testing bundle
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Copyright notice */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Questions are generated from <strong>publicly available</strong> standards, codes, and professional knowledge
                that these books cover — using web search. No copyrighted text is extracted or reproduced from the books themselves.
                Each question cites the book by title as its reference source.
              </p>
            </div>

            {/* Book selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                Select Reference Books ({selectedBookIds.size} of {NASCLA_BOOKS.length} selected)
              </label>
              <div className="grid gap-3">
                {NASCLA_BOOKS.map(book => {
                  const selected = selectedBookIds.has(book.id);
                  return (
                    <div
                      key={book.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => toggleBook(book.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                        }`}>
                          {selected && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{book.title}</p>
                          <p className="text-xs text-gray-500 mb-2">{book.author}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge className="bg-navy-100 text-navy-600 border border-navy-600 text-xs">{PRIMARY_TRADE}</Badge>
                            <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-xs">{book.tradeTag}</Badge>
                            <Badge variant="outline" className="text-xs">{book.jurisdiction}</Badge>
                            <Badge variant="outline" className="text-xs">{book.lawType}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Questions per book */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Questions per book: <span className="font-bold text-purple-700">{questionsPerBook}</span>
                <span className="text-gray-400 font-normal ml-2">
                  (~{Math.ceil(questionsPerBook / BATCH_SIZE)} web-search calls per book)
                </span>
              </label>
              <Slider min={5} max={50} step={5} value={[questionsPerBook]} onValueChange={([val]) => setQuestionsPerBook(val)} className="w-full" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5</span><span>25</span><span>50</span>
              </div>
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={selectedBookIds.size === 0 || generating}
              className="w-full h-14 text-lg bg-purple-600 hover:bg-purple-700 text-white"
            >
              {generating ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="mr-2 h-5 w-5" />Generate {selectedBookIds.size * questionsPerBook} Questions</>
              )}
            </Button>

            {/* Progress */}
            {generating && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 rounded py-1.5 text-center text-xs font-semibold bg-purple-600 text-white border border-purple-600">
                    Generating (web search)
                  </div>
                </div>
                {progress.currentBook && (
                  <p className="text-xs text-gray-600">
                    Book {progress.bookIdx + 1} of {progress.totalBooks}: {progress.currentBook}
                    <br />Batch {progress.batchIdx + 1} of {progress.totalBatches} · {progress.totalGenerated} questions generated so far
                  </p>
                )}
                {progress.totalBooks > 0 && (
                  <Progress value={Math.round(((progress.bookIdx + (progress.batchIdx + 1) / progress.totalBatches) / progress.totalBooks) * 100)} className="h-2" />
                )}
              </div>
            )}

            {/* Results */}
            {results && (
              <div className={`p-4 rounded-lg border-2 ${results.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                <div className="flex items-start gap-3">
                  {results.success ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                      <div className="w-full">
                        <p className="font-semibold text-green-900 mb-2">
                          Generated {results.totalGenerated} questions across {results.bookResults.length} book(s)!
                        </p>
                        <div className="space-y-1 mb-3">
                          {results.bookResults.map((br, i) => (
                            <p key={i} className="text-xs text-green-800">
                              {br.generated} questions — {br.book}
                              {br.skipped > 0 && <span className="text-amber-700"> ({br.skipped} duplicates skipped)</span>}
                            </p>
                          ))}
                        </div>
                        <Link to={createPageUrl(`Study?trades=${encodeURIComponent(PRIMARY_TRADE)}&jurisdiction=Tennessee`)}>
                          <Button className="bg-green-600 hover:bg-green-700 text-white">
                            <Play className="h-4 w-4 mr-2" />Start Studying
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900 mb-1">Generation incomplete</p>
                        <p className="text-sm text-red-800">{results.error}</p>
                        {results.totalGenerated > 0 && (
                          <p className="text-xs text-red-700 mt-1">{results.totalGenerated} questions were generated before the error.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}