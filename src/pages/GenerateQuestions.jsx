import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, CheckCircle, XCircle, X, Search, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

const API_KEY = 'd176fde449dbead5a0aead4739173214';

const TRADES = [
  // Construction - General
  "General Contractor", "Building Contractor", "Residential Builder", "Commercial Builder", "Remodeling Contractor",
  
  // Plumbing & Piping
  "Plumber", "Master Plumber", "Journeyman Plumber", "Pipefitter", "Steamfitter", "Sprinkler Fitter", "Medical Gas Installer", "Backflow Prevention Technician",
  
  // Electrical
  "Electrician", "Master Electrician", "Journeyman Electrician", "Residential Electrician", "Commercial Electrician", "Industrial Electrician", "Lineman", "Inside Wireman", "Low Voltage Technician", "Fire Alarm Technician", "Security Alarm Installer", "Telecommunications Installer", "Solar Photovoltaic Installer", "Wind Turbine Technician",
  
  // HVAC & Refrigeration
  "HVAC Technician", "HVAC Contractor", "Air Conditioning Contractor", "Heating Contractor", "Refrigeration Technician", "Commercial Refrigeration", "Boiler Operator", "Boiler Installer", "Mechanical Contractor",
  
  // Structural Trades
  "Carpenter", "Rough Carpenter", "Finish Carpenter", "Cabinet Maker", "Millwork Installer", "Framer", "Concrete Contractor", "Concrete Finisher", "Mason", "Bricklayer", "Block Mason", "Stone Mason", "Tile Setter", "Marble Setter", "Terrazzo Worker", "Plasterer", "Stucco Contractor", "Drywall Installer", "Drywall Finisher", "Lather",
  
  // Exterior & Roofing
  "Roofer", "Roofing Contractor", "Sheet Metal Worker", "Siding Installer", "Gutter Installer", "Waterproofing Contractor", "Caulking Contractor", "Glazier", "Window Installer", "Door Installer",
  
  // Finishing Trades
  "Painter", "Painting Contractor", "Wallpaper Hanger", "Decorator", "Flooring Installer", "Hardwood Floor Installer", "Carpet Installer", "Vinyl Floor Installer", "Epoxy Floor Installer",
  
  // Insulation
  "Insulation Contractor", "Spray Foam Insulator", "Weatherization Specialist", "Energy Auditor",
  
  // Welding & Metal
  "Welder", "Certified Welder", "Pipefitter-Welder", "Structural Welder", "Ironworker", "Reinforcing Ironworker", "Ornamental Ironworker", "Structural Steel Erector", "Metal Building Assembler",
  
  // Demolition & Excavation
  "Demolition Contractor", "Excavation Contractor", "Grading Contractor", "Trenching Contractor", "Site Work Contractor", "Earthmoving Contractor",
  
  // Heavy Equipment
  "Heavy Equipment Operator", "Crane Operator", "Tower Crane Operator", "Rigger", "Hoist Operator", "Forklift Operator", "Pile Driver Operator",
  
  // Specialty Construction
  "Elevator Mechanic", "Elevator Installer", "Escalator Mechanic", "Asbestos Abatement Contractor", "Lead Abatement Contractor", "Mold Remediation Contractor", "Fire Sprinkler Installer", "Fire Suppression Contractor", "Kitchen Hood System Installer", "Swimming Pool Contractor", "Spa & Hot Tub Installer", "Fence Contractor", "Dock Builder", "Marina Contractor", "Well Driller", "Well Pump Installer", "Irrigation Contractor", "Lawn Sprinkler Installer",
  
  // Septic & Wastewater
  "Septic System Installer", "Septic Tank Installer", "Septic System Designer", "Septic System Pumper", "Septic System Inspector", "Wastewater Treatment Operator", "Wastewater Facility Operator", "On-Site Wastewater Installer",
  
  // Landscaping
  "Landscape Contractor", "Landscape Architect", "Arborist", "Tree Trimmer", "Tree Service Operator", "Pesticide Applicator", "Lawn Care Operator", "Turf Management Specialist",
  
  // Professional Services
  "Architect", "Professional Engineer", "Structural Engineer", "Civil Engineer", "Mechanical Engineer", "Electrical Engineer", "Land Surveyor", "Professional Land Surveyor", "Geologist", "Soil Scientist", "Interior Designer",
  
  // Inspections
  "Home Inspector", "Building Inspector", "Code Enforcement Officer", "Plans Examiner", "Fire Inspector", "Elevator Inspector", "Environmental Inspector", "Asbestos Inspector", "Lead Inspector", "Mold Inspector", "Radon Measurement Technician",
  
  // Real Estate
  "Real Estate Agent", "Real Estate Broker", "Real Estate Appraiser", "Property Manager", "Community Association Manager", "Mortgage Broker", "Mortgage Loan Originator",
  
  // Automotive
  "Auto Mechanic", "Automotive Technician", "Diesel Mechanic", "Heavy Truck Mechanic", "Auto Body Repair", "Collision Repair Technician", "Transmission Specialist", "Brake Specialist", "Emissions Inspector", "Vehicle Safety Inspector", "Smog Technician", "Auto Glass Technician", "Locksmith", "Towing Operator", "Driving Instructor", "CDL Instructor", "Motorcycle Mechanic", "Marine Mechanic", "Small Engine Mechanic", "Aircraft Mechanic",
  
  // Appliance
  "Appliance Repair Technician", "Refrigerator Technician", "Commercial Kitchen Equipment Installer", "Fire Extinguisher Service",
  
  // Pest Control
  "Pest Control Operator", "Fumigator", "Termite Control Operator", "Wildlife Control Operator",
  
  // Health & Beauty
  "Cosmetologist", "Hair Stylist", "Barber", "Nail Technician", "Esthetician", "Massage Therapist", "Tattoo Artist", "Body Piercer", "Electrologist",
  
  // Food Service
  "Food Service Manager", "Food Handler", "Food Safety Manager", "Certified Food Manager", "Mobile Food Vendor", "Alcohol Server", "Bartender",
  
  // Animal Care
  "Farrier", "Veterinary Technician", "Animal Control Officer", "Dog Groomer", "Kennel Operator",
  
  // Water & Marine
  "Water Treatment Operator", "Water Distribution Operator", "Swimming Pool Operator", "Lifeguard", "Boat Captain", "Charter Boat Captain", "Commercial Fisherman", "Commercial Diver",
  
  // Security
  "Security Guard", "Private Investigator", "Alarm System Installer", "CCTV Installer", "Firearm Dealer",
  
  // Other Licensed
  "Funeral Director", "Embalmer", "Crematory Operator", "Auctioneer", "Pawnbroker", "Bail Bondsman", "Process Server", "Court Reporter", "Notary Public", "Tax Preparer", "Accountant", "CPA", "Insurance Agent", "Insurance Broker", "Pharmacy Technician", "Optician", "Hearing Aid Dealer", "Home Health Aide", "Nursing Home Administrator", "Childcare Provider", "Day Care Operator"
];

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
  const [selectedTrades, setSelectedTrades] = useState([]);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [tradeSearch, setTradeSearch] = useState('');
  const [showTradeDropdown, setShowTradeDropdown] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairResults, setRepairResults] = useState(null);
  const tradeRef = useRef(null);
  const queryClient = useQueryClient();

  const normalizeForMatch = (str) =>
    (str || '')
      .toLowerCase()
      .replace(/[\u00a0\u2009\u202f\t]/g, ' ')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  // Fact-check a batch of questions using live internet research. Returns array of ids to delete.
  const factCheckBatch = async (batch) => {
    const payload = batch.map((q, i) => ({
      index: i,
      id: q.id,
      trade: q.trade,
      jurisdiction: q.jurisdiction,
      question_text: q.question_text,
      question_type: q.question_type,
      correct_answer: q.correct_answer,
      options: q.options || [],
      law_citation: q.law_citation || ''
    }));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional licensing law expert. For each question below, verify whether the stated correct_answer is actually accurate based on REAL current laws and regulations for that trade and jurisdiction. Use your knowledge and internet search to verify. Mark a question as INACCURATE if the correct_answer is factually wrong (e.g., wrong hour requirements, wrong fees, wrong license tiers, wrong agency names, etc.). Be strict - if something is genuinely incorrect, flag it.

Questions to verify:
${JSON.stringify(payload, null, 2)}

Return a JSON object with a "results" array, one entry per question in the same order, each with: { "index": number, "accurate": boolean, "reason": string }`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number" },
                accurate: { type: "boolean" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    const toDelete = [];
    for (const r of (result?.results || [])) {
      if (!r.accurate && batch[r.index]) {
        toDelete.push(batch[r.index].id);
      }
    }
    return toDelete;
  };

  const repairExistingQuestions = async () => {
    setRepairing(true);
    setRepairResults(null);
    try {
      const allQuestions = await base44.entities.LawQuestion.list();
      let fixed = 0;
      const updates = [];

      // Step 1: Fix answer mismatches
      for (const q of allQuestions) {
        let newCorrect = q.correct_answer;
        let changed = false;

        if (q.question_type === 'multiple_choice' && q.options?.length > 0) {
          const options = q.options.map(o => o?.trim());
          const match = options.find(opt => normalizeForMatch(opt) === normalizeForMatch(q.correct_answer));
          if (match && match !== q.correct_answer) { newCorrect = match; changed = true; }
        }

        if (q.question_type === 'true_false') {
          const lower = q.correct_answer?.toLowerCase().trim();
          if (lower === 'true' && q.correct_answer !== 'True') { newCorrect = 'True'; changed = true; }
          if (lower === 'false' && q.correct_answer !== 'False') { newCorrect = 'False'; changed = true; }
        }

        if (changed) {
          updates.push(base44.entities.LawQuestion.update(q.id, { correct_answer: newCorrect }));
          fixed++;
        }
      }
      await Promise.all(updates);

      // Step 2: Fact-check all questions in batches of 5
      const BATCH = 5;
      let deleted = 0;
      for (let i = 0; i < allQuestions.length; i += BATCH) {
        const batch = allQuestions.slice(i, i + BATCH);
        const toDelete = await factCheckBatch(batch);
        for (const id of toDelete) {
          await base44.entities.LawQuestion.delete(id);
          deleted++;
        }
      }

      setRepairResults({ success: true, total: allQuestions.length, fixed, deleted });
    } catch (err) {
      setRepairResults({ success: false, error: err.message });
    } finally {
      setRepairing(false);
    }
  };

  const filteredTrades = TRADES.filter(t =>
    t.toLowerCase().includes(tradeSearch.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tradeRef.current && !tradeRef.current.contains(e.target)) {
        setShowTradeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTrade = (trade) => {
    if (!selectedTrades.includes(trade)) {
      setSelectedTrades(prev => [...prev, trade]);
    }
    setTradeSearch('');
    setShowTradeDropdown(false);
  };

  const removeTrade = (trade) => {
    setSelectedTrades(prev => prev.filter(t => t !== trade));
  };

  const buildPrompt = (trades, jurisdiction, count) => {
    const tradesLabel = trades.join(', ');

    // Trades that are heavily regulation-driven (more agency regs than statutes)
    const heavyRegTrades = [
      'septic', 'wastewater', 'well', 'environmental', 'asbestos', 'lead', 'mold',
      'pesticide', 'water treatment', 'food', 'health', 'medical', 'funeral', 'embalmer',
      'crematory', 'childcare', 'day care', 'nursing home', 'pharmacy', 'boiler',
      'elevator', 'crane', 'radiation', 'air conditioning', 'refrigeration'
    ];

    const isHeavyReg = (trade) => heavyRegTrades.some(keyword => trade.toLowerCase().includes(keyword));

    const tradeGuidance = trades.map(trade => {
      const regHeavy = isHeavyReg(trade);
      return `- ${trade}: weight ${regHeavy ? '~70% agency/department regulations, ~30% statutes' : '~50% statutes, ~50% agency/department regulations'}`;
    }).join('\n');

    return `Generate exactly ${count} realistic professional certification exam questions for ${tradesLabel} professionals in ${jurisdiction}.

CRITICAL: You MUST cover BOTH (1) state statutes (legislature-enacted laws) AND (2) state agency/department regulations (administrative rules). Weight the mix by trade:
${tradeGuidance}

CITATION RULES (MANDATORY):
- For statutes: prefix law_citation with "Statute:" then cite the exact code section (e.g., "Statute: CA Business & Professions Code § 7059")
- For regulations: prefix law_citation with "Regulation:" then cite BOTH the agency/department name AND the regulation code (e.g., "Regulation: CA State Water Resources Control Board, 23 CCR § 2650")
- law_type field must be "statute" for statutes, "regulation" for agency/department rules

QUESTION FORMATTING RULES:
- TRUE/FALSE: Must be a complete factual STATEMENT (e.g., "In ${jurisdiction}, septic system installers must obtain approval from the Department of Health before installation.")
- MULTIPLE CHOICE: Exactly 4 options; correct_answer must match one option exactly.
- FILL IN BLANK: Use _____ for the blank.

For each question provide: question_text, question_type (multiple_choice|true_false|fill_in_blank), correct_answer, options (4 items for MC, empty array otherwise), trade, law_type (statute|regulation), law_citation (prefixed as above), explanation (1 sentence max), difficulty (beginner|intermediate|advanced).

Distribute questions evenly across trades: ${tradesLabel}. Keep explanations SHORT (1 sentence) to stay within JSON limits.`;
  };

  const callLLM = async (prompt) => {
    return base44.integrations.Core.InvokeLLM({
      prompt,
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
                trade: { type: "string" },
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
  };

  const generateQuestions = async () => {
    setGenerating(true);
    setResults(null);

    try {
      // Split into batches of 5 to avoid JSON truncation with large requests
      const BATCH_SIZE = 5;
      const allQuestions = [];
      let remaining = questionCount;
      let batchStart = 0;

      while (remaining > 0) {
        const batchCount = Math.min(BATCH_SIZE, remaining);
        const prompt = buildPrompt(selectedTrades, selectedJurisdiction, batchCount);
        const response = await callLLM(prompt);
        if (response?.questions?.length > 0) {
          allQuestions.push(...response.questions.slice(0, batchCount));
        }
        remaining -= batchCount;
        batchStart += batchCount;
      }

      // Aggressively normalize a string for comparison: lowercase, collapse whitespace, strip punctuation
      const normalizeForMatch = (str) =>
        (str || '')
          .toLowerCase()
          .replace(/[\u00a0\u2009\u202f\t]/g, ' ') // replace non-breaking & special spaces
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"']/g, '') // strip punctuation
          .replace(/\s+/g, ' ')
          .trim();

      // Create questions in database
      const questionsToCreate = allQuestions.map((q, idx) => {
        let correctAnswer = q.correct_answer?.trim();
        const options = (q.options || []).map(o => o?.trim());

        // For multiple choice: force correct_answer to be the EXACT option text using aggressive normalization
        if (q.question_type === 'multiple_choice' && options.length > 0) {
          const match = options.find(opt => normalizeForMatch(opt) === normalizeForMatch(correctAnswer));
          if (match) correctAnswer = match; // store the exact option string
        }

        // For true/false: normalize to "True" or "False"
        if (q.question_type === 'true_false') {
          if (correctAnswer?.toLowerCase() === 'true') correctAnswer = 'True';
          if (correctAnswer?.toLowerCase() === 'false') correctAnswer = 'False';
        }

        // Assign trade: use AI-returned trade if valid, otherwise round-robin across selected trades
        const assignedTrade = selectedTrades.includes(q.trade)
          ? q.trade
          : selectedTrades[idx % selectedTrades.length];

        return {
          question_text: q.question_text?.trim(),
          question_type: q.question_type,
          correct_answer: correctAnswer,
          options,
          trade: assignedTrade,
          jurisdiction: selectedJurisdiction,
          law_type: q.law_type,
          law_citation: q.law_citation,
          explanation: q.explanation,
          difficulty: q.difficulty
        };
      });

      if (questionsToCreate.length === 0) throw new Error('No questions were generated. Please try again.');
      await base44.entities.LawQuestion.bulkCreate(questionsToCreate);
      
      queryClient.invalidateQueries(['questions']);
      
      setResults({
        success: true,
        count: questionsToCreate.length,
        trades: selectedTrades
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
          <CardHeader className="bg-gradient-to-r from-purple-100 to-indigo-100">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-700" />
              <div>
                <CardTitle className="text-2xl text-purple-900">Generate Questions</CardTitle>
                <CardDescription className="text-purple-800">
                  AI-powered question generation using real legal data
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div ref={tradeRef}>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Trades (choose one or more)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    className="pl-9"
                    placeholder="Type to search trades..."
                    value={tradeSearch}
                    onChange={(e) => { setTradeSearch(e.target.value); setShowTradeDropdown(true); }}
                    onFocus={() => setShowTradeDropdown(true)}
                  />
                  {showTradeDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                      {filteredTrades.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No trades found</div>
                      ) : (
                        filteredTrades.map(trade => (
                          <button
                            key={trade}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-purple-50 transition-colors ${selectedTrades.includes(trade) ? 'text-purple-500 font-medium' : 'text-gray-800'}`}
                            onMouseDown={(e) => { e.preventDefault(); addTrade(trade); }}
                          >
                            {trade} {selectedTrades.includes(trade) && '✓'}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedTrades.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedTrades.map(trade => (
                      <Badge key={trade} className="bg-purple-100 text-purple-900 border border-purple-300 pl-3 pr-1 py-1 flex items-center gap-1">
                        {trade}
                        <button onClick={() => removeTrade(trade)} className="ml-1 hover:bg-purple-200 rounded-full p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
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

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Number of Questions: <span className="font-bold text-purple-700">{questionCount}</span>
                </label>
                <Slider
                  min={1}
                  max={20}
                  step={1}
                  value={[questionCount]}
                  onValueChange={([val]) => setQuestionCount(val)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span>
                  <span>10</span>
                  <span>20</span>
                </div>
              </div>
            </div>

            <Button
              onClick={generateQuestions}
              disabled={selectedTrades.length === 0 || !selectedJurisdiction || generating}
              className="w-full h-14 text-lg bg-purple-600 hover:bg-purple-700 text-gray-900"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate {questionCount} Question{questionCount !== 1 ? 's' : ''}
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
                          Questions added for {results.trades?.join(', ')} ({selectedJurisdiction})
                        </p>
                        <Link
                          to={createPageUrl(`Study?trades=${encodeURIComponent(results.trades.join(','))}&jurisdiction=${encodeURIComponent(selectedJurisdiction)}`)}
                          className="inline-block mt-3"
                        >
                          <Button className="bg-green-600 hover:bg-green-700 text-white">
                            <Play className="h-4 w-4 mr-2" />
                            Start Studying These Questions
                          </Button>
                        </Link>
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

            {/* Repair existing questions */}
            <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
              <p className="text-sm font-semibold text-orange-900 mb-2">🔧 Fix Existing Questions</p>
              <p className="text-xs text-orange-800 mb-3">If answers are being marked wrong when they should be correct, click this to repair all existing questions in the database.</p>
              <Button
                onClick={repairExistingQuestions}
                disabled={repairing}
                variant="outline"
                className="border-orange-400 text-orange-900 hover:bg-orange-100 w-full"
              >
                {repairing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Repairing...</> : 'Repair All Existing Questions'}
              </Button>
              {repairResults && (
                <p className={`text-sm mt-2 font-medium ${repairResults.success ? 'text-green-800' : 'text-red-800'}`}>
                  {repairResults.success
                    ? `✓ Scanned ${repairResults.total} questions — fixed ${repairResults.fixed} answer mismatches, removed ${repairResults.deleted} factually inaccurate questions.`
                    : `Error: ${repairResults.error}`}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>How it works:</strong> This tool uses AI with real-time legal research to generate 
                professional exam-quality questions based on actual {selectedJurisdiction || 'your selected jurisdiction'} laws and regulations 
                for {selectedTrades.length > 0 ? selectedTrades.join(', ') : 'your selected trades'}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}