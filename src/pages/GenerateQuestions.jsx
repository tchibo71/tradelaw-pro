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
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

const PLAN_CONCURRENCY = 8;  // laws planned in parallel
const FILL_CONCURRENCY = 8;  // slots filled in parallel
const SLOTS_PER_LAW = 10;
const QUESTIONS_PER_LAW = 8; // approx questions we expect per law before needing more

const TRADES = [
  "General Contractor", "Building Contractor", "Residential Builder", "Commercial Builder", "Remodeling Contractor",
  "Plumber", "Master Plumber", "Journeyman Plumber", "Pipefitter", "Steamfitter", "Sprinkler Fitter", "Medical Gas Installer", "Backflow Prevention Technician",
  "Electrician", "Master Electrician", "Journeyman Electrician", "Residential Electrician", "Commercial Electrician", "Industrial Electrician", "Lineman", "Inside Wireman", "Low Voltage Technician", "Fire Alarm Technician", "Security Alarm Installer", "Telecommunications Installer", "Solar Photovoltaic Installer", "Wind Turbine Technician",
  "HVAC Technician", "HVAC Contractor", "Air Conditioning Contractor", "Heating Contractor", "Refrigeration Technician", "Commercial Refrigeration", "Boiler Operator", "Boiler Installer", "Mechanical Contractor",
  "Carpenter", "Rough Carpenter", "Finish Carpenter", "Cabinet Maker", "Millwork Installer", "Framer", "Concrete Contractor", "Concrete Finisher", "Mason", "Bricklayer", "Block Mason", "Stone Mason", "Tile Setter", "Marble Setter", "Terrazzo Worker", "Plasterer", "Stucco Contractor", "Drywall Installer", "Drywall Finisher", "Lather",
  "Roofer", "Roofing Contractor", "Sheet Metal Worker", "Siding Installer", "Gutter Installer", "Waterproofing Contractor", "Caulking Contractor", "Glazier", "Window Installer", "Door Installer",
  "Painter", "Painting Contractor", "Wallpaper Hanger", "Decorator", "Flooring Installer", "Hardwood Floor Installer", "Carpet Installer", "Vinyl Floor Installer", "Epoxy Floor Installer",
  "Insulation Contractor", "Spray Foam Insulator", "Weatherization Specialist", "Energy Auditor",
  "Welder", "Certified Welder", "Pipefitter-Welder", "Structural Welder", "Ironworker", "Reinforcing Ironworker", "Ornamental Ironworker", "Structural Steel Erector", "Metal Building Assembler",
  "Demolition Contractor", "Excavation Contractor", "Grading Contractor", "Trenching Contractor", "Site Work Contractor", "Earthmoving Contractor",
  "Heavy Equipment Operator", "Crane Operator", "Tower Crane Operator", "Rigger", "Hoist Operator", "Forklift Operator", "Pile Driver Operator",
  "Elevator Mechanic", "Elevator Installer", "Escalator Mechanic", "Asbestos Abatement Contractor", "Lead Abatement Contractor", "Mold Remediation Contractor", "Fire Sprinkler Installer", "Fire Suppression Contractor", "Kitchen Hood System Installer", "Swimming Pool Contractor", "Spa & Hot Tub Installer", "Fence Contractor", "Dock Builder", "Marina Contractor", "Well Driller", "Well Pump Installer", "Irrigation Contractor", "Lawn Sprinkler Installer",
  "Septic System Installer", "Septic Tank Installer", "Septic System Designer", "Septic System Pumper", "Septic System Inspector", "Wastewater Treatment Operator", "Wastewater Facility Operator", "On-Site Wastewater Installer",
  "Landscape Contractor", "Landscape Architect", "Arborist", "Tree Trimmer", "Tree Service Operator", "Pesticide Applicator", "Lawn Care Operator", "Turf Management Specialist",
  "Architect", "Professional Engineer", "Structural Engineer", "Civil Engineer", "Mechanical Engineer", "Electrical Engineer", "Land Surveyor", "Professional Land Surveyor", "Geologist", "Soil Scientist", "Interior Designer",
  "Home Inspector", "Building Inspector", "Code Enforcement Officer", "Plans Examiner", "Fire Inspector", "Elevator Inspector", "Environmental Inspector", "Asbestos Inspector", "Lead Inspector", "Mold Inspector", "Radon Measurement Technician",
  "Real Estate Agent", "Real Estate Broker", "Real Estate Appraiser", "Property Manager", "Community Association Manager", "Mortgage Broker", "Mortgage Loan Originator",
  "Auto Mechanic", "Automotive Technician", "Diesel Mechanic", "Heavy Truck Mechanic", "Auto Body Repair", "Collision Repair Technician", "Transmission Specialist", "Brake Specialist", "Emissions Inspector", "Vehicle Safety Inspector", "Smog Technician", "Auto Glass Technician", "Locksmith", "Towing Operator", "Driving Instructor", "CDL Instructor", "Motorcycle Mechanic", "Marine Mechanic", "Small Engine Mechanic", "Aircraft Mechanic",
  "Appliance Repair Technician", "Refrigerator Technician", "Commercial Kitchen Equipment Installer", "Fire Extinguisher Service",
  "Pest Control Operator", "Fumigator", "Termite Control Operator", "Wildlife Control Operator",
  "Cosmetologist", "Hair Stylist", "Barber", "Nail Technician", "Esthetician", "Massage Therapist", "Tattoo Artist", "Body Piercer", "Electrologist",
  "Food Service Manager", "Food Handler", "Food Safety Manager", "Certified Food Manager", "Mobile Food Vendor", "Alcohol Server", "Bartender",
  "Farrier", "Veterinary Technician", "Animal Control Officer", "Dog Groomer", "Kennel Operator",
  "Water Treatment Operator", "Water Distribution Operator", "Swimming Pool Operator", "Lifeguard", "Boat Captain", "Charter Boat Captain", "Commercial Fisherman", "Commercial Diver",
  "Security Guard", "Private Investigator", "Alarm System Installer", "CCTV Installer", "Firearm Dealer",
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

const normalizeForMatch = (str) =>
  (str || '').toLowerCase()
    .replace(/[\u00a0\u2009\u202f\t]/g, ' ')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"']/g, '')
    .replace(/\s+/g, ' ').trim();

const normalizeFP = (str) =>
  (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ─── Pipeline step helpers ───────────────────────────────────────────────────

// STEP 1 ONLY — web search enabled here and nowhere else
const step1EnumerateLaws = (trades, jurisdiction, mode) => {
  const scope = mode === 'federal'
    ? 'FEDERAL law only (OSHA, EPA, DOT, FTC etc). Do NOT include state laws.'
    : `${jurisdiction} STATE law only. Do NOT include federal laws.`;
  return base44.integrations.Core.InvokeLLM({
    prompt: `List applicable laws and regulations for these licensed trades in scope: ${scope}
Trades: ${trades.join(', ')}
Include: licensing statutes, continuing education, bonding/insurance, installation standards, inspection/permitting, enforcement/penalties.
For each: citation (exact), title (short), law_type ("statute"|"regulation"), trade (one of the input trade names).`,
    add_context_from_internet: true,
    model: "gemini_3_flash",
    response_json_schema: {
      type: "object",
      properties: {
        laws: {
          type: "array",
          items: {
            type: "object",
            properties: {
              citation: { type: "string" },
              title: { type: "string" },
              law_type: { type: "string" },
              trade: { type: "string" }
            }
          }
        }
      }
    }
  });
};

// STEP 2 — web search OFF, uses only law name/citation as context
const step2PlanSlots = (law, jurisdiction, trades) =>
  base44.integrations.Core.InvokeLLM({
    prompt: `Pre-define ${SLOTS_PER_LAW} unique exam question slots for this law.
Law: ${law.citation} — ${law.title} (${law.law_type})
Jurisdiction: ${jurisdiction}, Trade(s): ${trades.join(', ')}
Dimensions to cover: definitions, thresholds_limits, exemptions, penalties, required_procedures, deadlines, responsible_parties, documentation_requirements, numerical_precision, sequencing
Per slot: dimension, legal_fact_fingerprint ("[Citation] — [specific fact]"), question_hint (one line), suggested_format (multiple_choice|true_false|fill_in_blank)`,
    add_context_from_internet: false,
    model: "gemini_3_flash",
    response_json_schema: {
      type: "object",
      properties: {
        slots: {
          type: "array",
          items: {
            type: "object",
            properties: {
              dimension: { type: "string" },
              legal_fact_fingerprint: { type: "string" },
              question_hint: { type: "string" },
              suggested_format: { type: "string" }
            }
          }
        }
      }
    }
  });

// STEP 3 — web search OFF, uses only slot fingerprint + law name as context
const step3FillSlot = (slot, jurisdiction, trades, existingFingerprints) => {
  const fpList = existingFingerprints.length > 0
    ? `\nDO NOT test these already-covered facts:\n${existingFingerprints.slice(0, 40).map((f, i) => `${i + 1}. ${f}`).join('\n')}\n`
    : '';
  return base44.integrations.Core.InvokeLLM({
    prompt: `Generate exactly 1 professional licensing exam question for ${trades.join(', ')} in ${jurisdiction}.
Law: ${slot.law_citation} — ${slot.law_title} (${slot.law_type})
Dimension: ${slot.dimension}
Legal fact to test: ${slot.legal_fact_fingerprint}
Hint: ${slot.question_hint}
Format: ${slot.suggested_format}
${fpList}
Rules:
- legal_fact_fingerprint MUST be: "${slot.legal_fact_fingerprint}"
- law_type: "${slot.law_type}"
- For MC: 4 options, correct_answer matches one word-for-word
- For T/F: correct_answer is exactly "True" or "False"
- For fill_in_blank: use _____, never reveal answer in question text
- NEVER embed the answer in the question text
- 1-sentence explanation only`,
    add_context_from_internet: false,
    model: "gemini_3_flash",
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
              difficulty: { type: "string" },
              legal_fact_fingerprint: { type: "string" }
            }
          }
        }
      }
    }
  });
};

export default function GenerateQuestions() {
  const urlParams = new URLSearchParams(window.location.search);
  const prefillTrades = urlParams.get('prefill_trades') ? urlParams.get('prefill_trades').split(',').filter(Boolean) : [];
  const prefillJurisdiction = urlParams.get('prefill_jurisdiction') || '';

  const [selectedTrades, setSelectedTrades] = useState(prefillTrades);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(prefillJurisdiction);
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ step: 0, current: 0, total: 0, stage: '' });
  const [results, setResults] = useState(null);
  const [focusArea, setFocusArea] = useState('');
  const [tradeSearch, setTradeSearch] = useState('');
  const [showTradeDropdown, setShowTradeDropdown] = useState(false);
  const [jurisdictionMode, setJurisdictionMode] = useState('state');
  const [lawRegistry, setLawRegistry] = useState([]);
  const [lawRegistryLoading, setLawRegistryLoading] = useState(false);
  const [deduplicating, setDeduplicating] = useState(false);
  const [dedupeResults, setDedupeResults] = useState(null);
  const [flaggedDupes, setFlaggedDupes] = useState(null);
  const [dupeSelections, setDupeSelections] = useState({});
  const [repairing, setRepairing] = useState(false);
  const [repairResults, setRepairResults] = useState(null);
  const [repairProgress, setRepairProgress] = useState({ current: 0, total: 0, stage: '' });
  const [masterPlanData, setMasterPlanData] = useState(null);
  const tradeRef = useRef(null);
  const queryClient = useQueryClient();

  const filteredTrades = TRADES.filter(t => t.toLowerCase().includes(tradeSearch.toLowerCase()));

  useEffect(() => {
    const handler = (e) => { if (tradeRef.current && !tradeRef.current.contains(e.target)) setShowTradeDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addTrade = (trade) => {
    if (!selectedTrades.includes(trade)) setSelectedTrades(prev => [...prev, trade]);
    setTradeSearch('');
    setShowTradeDropdown(false);
  };

  const removeTrade = (trade) => setSelectedTrades(prev => prev.filter(t => t !== trade));



  const isValidQuestion = (q, fps) => {
    if (!q.question_text || !q.correct_answer) return false;
    if (q.legal_fact_fingerprint && fps.has(q.legal_fact_fingerprint.trim().toLowerCase())) return false;
    const qLower = q.question_text.toLowerCase();
    const aLower = q.correct_answer.toLowerCase().trim();
    if (aLower.length > 2 && qLower.includes(aLower)) return false;
    if (q.question_type === 'multiple_choice') {
      const trimmed = q.question_text.trim();
      if (!trimmed.includes('?') && trimmed.endsWith('.')) return false;
    }
    return true;
  };

  const generateQuestions = async () => {
    setGenerating(true);
    setResults(null);

    try {
      const effectiveJurisdiction = jurisdictionMode === 'federal' ? 'Federal' : selectedJurisdiction;

      // ── STEP 1: Enumerate laws (web search ON — only time it fires) ──────────
      setGenProgress({ step: 1, current: 0, total: 1, stage: `Step 1 of 3: Enumerating ${effectiveJurisdiction} laws (web search)...` });
      let laws = lawRegistry.length > 0 ? lawRegistry : null;
      if (!laws) {
        const r1 = await step1EnumerateLaws(selectedTrades, effectiveJurisdiction, jurisdictionMode);
        laws = r1?.laws || [];
      }
      if (laws.length === 0) throw new Error('Step 1 failed: Could not enumerate applicable laws.');
      if (lawRegistry.length === 0) setLawRegistry(laws);

      // Load existing catalogue while we move to step 2
      const existingQuestions = await base44.entities.LawQuestion.filter({ jurisdiction: effectiveJurisdiction });
      const relevantExisting = existingQuestions.filter(q => selectedTrades.some(t => q.trade === t));
      const seenFingerprints = new Set(
        relevantExisting.map(q => q.legal_fact_fingerprint).filter(Boolean).map(f => f.trim().toLowerCase())
      );

      // ── STEP 2: Plan slots for each law (web search OFF) ─────────────────────
      const lawsNeeded = Math.max(1, Math.ceil(questionCount / QUESTIONS_PER_LAW));
      const lawsToProcess = laws.slice(0, lawsNeeded);
      const allSlots = [];

      for (let i = 0; i < lawsToProcess.length; i += PLAN_CONCURRENCY) {
        const batch = lawsToProcess.slice(i, i + PLAN_CONCURRENCY);
        setGenProgress({
          step: 2,
          current: i,
          total: lawsToProcess.length,
          stage: `Step 2 of 3: Planning slots for law${batch.length > 1 ? 's' : ''} ${i + 1}–${Math.min(i + batch.length, lawsToProcess.length)} of ${lawsToProcess.length} (no web search)...`
        });
        const batchResults = await Promise.all(batch.map(law => step2PlanSlots(law, effectiveJurisdiction, selectedTrades)));
        for (let j = 0; j < batch.length; j++) {
          const law = batch[j];
          const slots = (batchResults[j]?.slots || []).slice(0, SLOTS_PER_LAW).map(slot => ({
            ...slot,
            law_citation: law.citation,
            law_title: law.title,
            law_type: law.law_type,
            trade: law.trade || selectedTrades[0],
          }));
          allSlots.push(...slots);
        }
      }
      setMasterPlanData(allSlots);

      const openSlots = allSlots.filter(slot =>
        !slot.legal_fact_fingerprint ||
        !seenFingerprints.has(slot.legal_fact_fingerprint.trim().toLowerCase())
      );
      const slotsToFill = openSlots.slice(0, questionCount);
      if (slotsToFill.length === 0) throw new Error('All planned slots are already covered. Generate for a different trade or jurisdiction.');

      // ── STEP 3: Fill each slot (web search OFF) ───────────────────────────────
      const allQuestions = [];
      let culledCount = 0;
      let exhaustedSlots = 0;
      let filledCount = 0;

      for (let i = 0; i < slotsToFill.length; i += FILL_CONCURRENCY) {
        const batch = slotsToFill.slice(i, i + FILL_CONCURRENCY);
        const fpSnapshot = [...seenFingerprints];
        setGenProgress({
          step: 3,
          current: filledCount,
          total: slotsToFill.length,
          stage: `Step 3 of 3: Generating questions ${filledCount + 1}–${Math.min(filledCount + batch.length, slotsToFill.length)} of ${slotsToFill.length} (no web search)...`
        });

        const batchResults = await Promise.all(batch.map(async (slot) => {
          const resp = await step3FillSlot(slot, effectiveJurisdiction, selectedTrades, fpSnapshot);
          const q = resp?.questions?.[0];
          if (q && isValidQuestion(q, new Set(seenFingerprints))) return { slot, q };
          return { slot, q: null };
        }));

        for (const { slot, q } of batchResults) {
          if (q) {
            if (q.legal_fact_fingerprint) seenFingerprints.add(q.legal_fact_fingerprint.trim().toLowerCase());
            allQuestions.push({ q, slot });
          } else {
            culledCount++;
            exhaustedSlots++;
          }
          filledCount++;
        }
      }

      if (allQuestions.length === 0) throw new Error('Step 3 failed: Could not generate any valid questions.');

      // ── Save ──────────────────────────────────────────────────────────────────
      setGenProgress({ step: 3, current: filledCount, total: slotsToFill.length, stage: 'Saving questions...' });
      const questionsToCreate = allQuestions.map(({ q, slot }, idx) => {
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
        return {
          question_text: q.question_text?.trim(),
          question_type: q.question_type,
          correct_answer: correctAnswer,
          options,
          trade: selectedTrades.includes(q.trade) ? q.trade : selectedTrades[idx % selectedTrades.length],
          jurisdiction: effectiveJurisdiction,
          law_type: q.law_type || slot?.law_type,
          law_citation: q.law_citation,
          legal_fact_fingerprint: q.legal_fact_fingerprint?.trim() || null,
          explanation: q.explanation,
          difficulty: q.difficulty
        };
      });

      await base44.entities.LawQuestion.bulkCreate(questionsToCreate);
      queryClient.invalidateQueries(['questions']);

      setResults({
        success: true,
        count: questionsToCreate.length,
        filteredOut: culledCount,
        exhaustedSlots,
        totalSlotsPlanned: allSlots.length,
        openSlotsAvailable: openSlots.length,
        trades: selectedTrades,
        lawsCovered: laws.length,
        jurisdiction: effectiveJurisdiction
      });
    } catch (error) {
      setResults({ success: false, error: error.message });
    } finally {
      setGenerating(false);
      setGenProgress({ step: 0, current: 0, total: 0, stage: '' });
    }
  };

  // ─── Deduplication ────────────────────────────────────────────────────────
  const scanForDuplicates = async () => {
    setDeduplicating(true);
    setFlaggedDupes(null);
    setDedupeResults(null);
    try {
      const allQuestions = await base44.entities.LawQuestion.list(null, 1000);
      const byFingerprint = {};
      for (const q of allQuestions) {
        if (!q.legal_fact_fingerprint) continue;
        const key = normalizeFP(q.legal_fact_fingerprint);
        if (!byFingerprint[key]) byFingerprint[key] = [];
        byFingerprint[key].push(q);
      }
      const flagged = [];
      for (const group of Object.values(byFingerprint)) {
        if (group.length < 2) continue;
        const sorted = [...group].sort((a, b) => (b.explanation?.length || 0) - (a.explanation?.length || 0));
        for (let i = 1; i < sorted.length; i++) {
          flagged.push({ keepQ: sorted[0], removeQ: sorted[i], matchReason: 'Same legal fact fingerprint' });
        }
      }
      setFlaggedDupes(flagged);
      const defaults = {};
      for (const pair of flagged) defaults[pair.removeQ.id] = true;
      setDupeSelections(defaults);
    } catch (err) {
      setDedupeResults({ success: false, error: err.message });
    } finally {
      setDeduplicating(false);
    }
  };

  const confirmDupeDelete = async () => {
    setDeduplicating(true);
    try {
      const toDelete = Object.entries(dupeSelections).filter(([, v]) => v).map(([id]) => id);
      await Promise.all(toDelete.map(id => base44.entities.LawQuestion.delete(id)));
      setDedupeResults({ success: true, removed: toDelete.length });
      setFlaggedDupes(null);
      setDupeSelections({});
    } catch (err) {
      setDedupeResults({ success: false, error: err.message });
    } finally {
      setDeduplicating(false);
    }
  };

  // ─── Repair ───────────────────────────────────────────────────────────────
  const factCheckBatch = async (batch) => {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Fact-check these exam questions. For each, verify the correct_answer is real, currently-accurate law. Mark INACCURATE if you cannot find a specific, currently-in-force statute or regulation that explicitly states that exact fact.
${JSON.stringify(batch.map((q, i) => ({ index: i, id: q.id, trade: q.trade, jurisdiction: q.jurisdiction, question_text: q.question_text, correct_answer: q.correct_answer, law_citation: q.law_citation || '' })), null, 2)}
Return results array with { index, accurate, reason } per question.`,
      add_context_from_internet: true,
      model: "gemini_3_pro",
      response_json_schema: {
        type: "object",
        properties: {
          results: { type: "array", items: { type: "object", properties: { index: { type: "number" }, accurate: { type: "boolean" }, reason: { type: "string" } } } }
        }
      }
    });
    return (result?.results || []).filter(r => !r.accurate && batch[r.index]).map(r => batch[r.index].id);
  };

  const repairExistingQuestions = async () => {
    setRepairing(true);
    setRepairResults(null);
    setRepairProgress({ current: 0, total: 0, stage: 'Loading questions...' });
    try {
      const allQuestions = await base44.entities.LawQuestion.list(null, 1000);
      let fixed = 0;
      const updates = [];

      for (const q of allQuestions) {
        let newCorrect = q.correct_answer;
        let changed = false;
        if (q.question_type === 'multiple_choice' && q.options?.length > 0) {
          const match = q.options.map(o => o?.trim()).find(opt => normalizeForMatch(opt) === normalizeForMatch(q.correct_answer));
          if (match && match !== q.correct_answer) { newCorrect = match; changed = true; }
        }
        if (q.question_type === 'true_false') {
          const lower = q.correct_answer?.toLowerCase().trim();
          if (lower === 'true' && q.correct_answer !== 'True') { newCorrect = 'True'; changed = true; }
          if (lower === 'false' && q.correct_answer !== 'False') { newCorrect = 'False'; changed = true; }
        }
        if (changed) { updates.push(base44.entities.LawQuestion.update(q.id, { correct_answer: newCorrect })); fixed++; }
      }
      await Promise.all(updates);

      let embeddedDeleted = 0;
      for (const q of allQuestions) {
        if (!q.question_text || !q.correct_answer) continue;
        const qLower = q.question_text.toLowerCase();
        const aLower = q.correct_answer.toLowerCase().trim();
        let bad = aLower.length > 2 && qLower.includes(aLower);
        if (q.question_type === 'multiple_choice' && !q.question_text.trim().includes('?') && q.question_text.trim().endsWith('.')) bad = true;
        if (bad) { await base44.entities.LawQuestion.delete(q.id); embeddedDeleted++; }
      }

      const BATCH = 5;
      let deleted = 0;
      const totalBatches = Math.ceil(allQuestions.length / BATCH);
      for (let i = 0; i < allQuestions.length; i += BATCH) {
        const batchNum = Math.floor(i / BATCH) + 1;
        setRepairProgress({ current: batchNum, total: totalBatches, stage: `Fact-checking batch ${batchNum}/${totalBatches}...` });
        const toDelete = await factCheckBatch(allQuestions.slice(i, i + BATCH));
        for (const id of toDelete) { await base44.entities.LawQuestion.delete(id); deleted++; }
      }

      setRepairResults({ success: true, total: allQuestions.length, fixed, deleted: deleted + embeddedDeleted });
    } catch (err) {
      setRepairResults({ success: false, error: err.message });
    } finally {
      setRepairing(false);
      setRepairProgress({ current: 0, total: 0, stage: '' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="sm">← Back to Dashboard</Button>
          </Link>
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader className="bg-gradient-to-r from-purple-100 to-indigo-100">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-700" />
              <div>
                <CardTitle className="text-2xl text-purple-900">Generate Questions</CardTitle>
                <CardDescription className="text-purple-800">AI-powered question generation using real legal data</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              {/* Trade selector */}
              <div ref={tradeRef}>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Select Trades (choose one or more)</label>
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
                          <button key={trade}
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

              {/* Jurisdiction */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Select Jurisdiction</label>
                <div className="flex gap-2 mb-2">
                  <button onClick={() => { setJurisdictionMode('state'); setLawRegistry([]); }}
                    className={`flex-1 py-1.5 rounded text-sm font-medium border transition-colors ${jurisdictionMode === 'state' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50'}`}
                  >State Law</button>
                  <button onClick={() => { setJurisdictionMode('federal'); setLawRegistry([]); }}
                    className={`flex-1 py-1.5 rounded text-sm font-medium border transition-colors ${jurisdictionMode === 'federal' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50'}`}
                  >Federal Law Only</button>
                </div>
                {jurisdictionMode === 'state' && (
                  <Select value={selectedJurisdiction} onValueChange={(v) => { setSelectedJurisdiction(v); setLawRegistry([]); }}>
                    <SelectTrigger><SelectValue placeholder="Choose state..." /></SelectTrigger>
                    <SelectContent className="max-h-64">
                      {STATES.filter(s => s !== 'Federal').map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {jurisdictionMode === 'federal' && (
                  <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-3 py-2">Federal statutes and agency regulations only (OSHA, EPA, DOT, etc.)</p>
                )}
              </div>

              {/* Master Plan Summary */}
              {masterPlanData && masterPlanData.length > 0 && (
                <div className="border border-violet-200 rounded-lg bg-violet-50 p-4">
                  <p className="text-sm font-semibold text-violet-900 mb-1">📋 Master Question Plan Ready</p>
                  <p className="text-xs text-violet-800">
                    {masterPlanData.length} pre-defined slots across {[...new Set(masterPlanData.map(s => s.law_citation))].length} laws
                    ({[...new Set(masterPlanData.map(s => s.dimension))].length} dimensions covered).
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[...new Set(masterPlanData.map(s => s.dimension))].map(dim => (
                      <span key={dim} className="text-[10px] bg-violet-200 text-violet-900 rounded px-1.5 py-0.5 font-medium">
                        {dim} ({masterPlanData.filter(s => s.dimension === dim).length})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Law Registry */}
              <div className="border border-indigo-200 rounded-lg bg-indigo-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-indigo-900">📋 Applicable Laws</p>
                  <Button size="sm" variant="outline"
                    onClick={async () => {
                      if (selectedTrades.length === 0 || (jurisdictionMode === 'state' && !selectedJurisdiction)) return;
                      setLawRegistryLoading(true);
                      setLawRegistry([]);
                      const laws = await fetchApplicableLaws(selectedTrades, jurisdictionMode === 'federal' ? 'Federal' : selectedJurisdiction, jurisdictionMode);
                      setLawRegistry(laws);
                      setLawRegistryLoading(false);
                    }}
                    disabled={lawRegistryLoading || selectedTrades.length === 0 || (jurisdictionMode === 'state' && !selectedJurisdiction)}
                    className="border-indigo-400 text-indigo-800 hover:bg-indigo-100 text-xs"
                  >
                    {lawRegistryLoading ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Loading...</> : lawRegistry.length > 0 ? 'Refresh Laws' : 'Enumerate Laws'}
                  </Button>
                </div>
                {lawRegistry.length === 0 && !lawRegistryLoading && (
                  <p className="text-xs text-indigo-700">Optionally preview applicable laws before generating. Laws are cached for faster repeated generation.</p>
                )}
                {lawRegistryLoading && <p className="text-xs text-indigo-700 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Researching laws...</p>}
                {lawRegistry.length > 0 && (
                  <div className="space-y-1 max-h-64 overflow-y-auto mt-2">
                    <p className="text-xs text-indigo-700 mb-2 font-medium">{lawRegistry.length} laws identified (only the most relevant will be planned per generation run):</p>
                    {lawRegistry.map((law, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs py-1 border-b border-indigo-100 last:border-0">
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${law.law_type === 'statute' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                          {law.law_type === 'statute' ? 'STAT' : 'REG'}
                        </span>
                        <div>
                          <span className="font-medium text-indigo-900">{law.citation}</span>
                          <span className="text-indigo-600 ml-1">— {law.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Focus Area */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Focus Area <span className="text-gray-400 font-normal">(optional — narrows topic)</span>
                </label>
                <Input
                  placeholder="e.g. perc tests, well setback distances, pump installation..."
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                />
              </div>

              {/* Question count */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Number of Questions: <span className="font-bold text-purple-700">{questionCount}</span>
                </label>
                <Slider min={1} max={20} step={1} value={[questionCount]} onValueChange={([val]) => setQuestionCount(val)} className="w-full" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span><span>10</span><span>20</span>
                </div>
              </div>
            </div>

            <Button
              onClick={generateQuestions}
              disabled={selectedTrades.length === 0 || (jurisdictionMode === 'state' && !selectedJurisdiction) || generating}
              className="w-full h-14 text-lg bg-purple-600 hover:bg-purple-700 text-gray-900"
            >
              {generating ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{genProgress.stage || 'Working...'}</>
              ) : (
                <><Sparkles className="mr-2 h-5 w-5" />Generate {questionCount} Question{questionCount !== 1 ? 's' : ''}</>
              )}
            </Button>

            {generating && genProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{genProgress.stage}</span>
                  <span>{genProgress.current}/{genProgress.total}</span>
                </div>
                <Progress value={Math.round((genProgress.current / genProgress.total) * 100)} className="h-3" />
              </div>
            )}

            {results && (
              <div className={`p-4 rounded-lg border-2 ${results.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                <div className="flex items-start gap-3">
                  {results.success ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-900 mb-1">Successfully generated {results.count} questions!</p>
                        <p className="text-sm text-green-800">
                          {results.trades?.join(', ')} ({jurisdictionMode === 'federal' ? 'Federal' : selectedJurisdiction})
                          {results.lawsCovered > 0 && ` — ${results.lawsCovered} laws identified`}
                        </p>
                        {results.totalSlotsPlanned > 0 && (
                          <p className="text-xs text-blue-700 mt-1">
                            📋 {results.totalSlotsPlanned} slots planned ({results.openSlotsAvailable} open) — {results.count} filled.
                          </p>
                        )}
                        {results.filteredOut > 0 && (
                          <p className="text-xs text-amber-700 mt-1">
                            ⚠ {results.filteredOut} slot{results.filteredOut !== 1 ? 's' : ''} needed retries.
                            {results.exhaustedSlots > 0 && ` ${results.exhaustedSlots} could not be filled.`}
                          </p>
                        )}
                        <Link to={createPageUrl(`Study?trades=${encodeURIComponent(results.trades.join(','))}&jurisdiction=${encodeURIComponent(results.jurisdiction || selectedJurisdiction)}`)} className="inline-block mt-3">
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
                        <p className="font-semibold text-red-900 mb-1">Generation failed</p>
                        <p className="text-sm text-red-800">{results.error}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Deduplicate */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <p className="text-sm font-semibold text-blue-900 mb-2">🔍 Find Duplicate Questions</p>
              <p className="text-xs text-blue-800 mb-3">Scans for questions testing the same legal fact by fingerprint.</p>
              <Button onClick={scanForDuplicates} disabled={deduplicating} variant="outline" className="border-blue-400 text-blue-900 hover:bg-blue-100 w-full">
                {deduplicating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scanning...</> : 'Scan for Duplicates'}
              </Button>
              {flaggedDupes !== null && (
                <div className="mt-4 space-y-3">
                  {flaggedDupes.length === 0 ? (
                    <p className="text-sm text-green-800 font-medium">✓ No duplicates found!</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-blue-900">{flaggedDupes.length} duplicate pair{flaggedDupes.length !== 1 ? 's' : ''} found:</p>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {flaggedDupes.map((pair, idx) => (
                          <div key={pair.removeQ.id} className="bg-white border border-blue-200 rounded-lg p-3 text-xs space-y-2">
                            <span className="font-semibold text-blue-800">Pair #{idx + 1} — {pair.matchReason}</span>
                            <div className="bg-green-50 border border-green-200 rounded p-2">
                              <span className="text-green-700 font-semibold">KEEP: </span>
                              <span className="text-gray-800">{pair.keepQ.question_text}</span>
                            </div>
                            <div className={`border rounded p-2 ${dupeSelections[pair.removeQ.id] ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                              <label className="flex items-start gap-2 cursor-pointer">
                                <input type="checkbox" className="mt-0.5"
                                  checked={!!dupeSelections[pair.removeQ.id]}
                                  onChange={(e) => setDupeSelections(prev => ({ ...prev, [pair.removeQ.id]: e.target.checked }))}
                                />
                                <span>
                                  <span className={`font-semibold ${dupeSelections[pair.removeQ.id] ? 'text-red-700' : 'text-gray-500'}`}>
                                    {dupeSelections[pair.removeQ.id] ? 'DELETE: ' : 'KEEP: '}
                                  </span>
                                  <span className="text-gray-800">{pair.removeQ.question_text}</span>
                                </span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button onClick={confirmDupeDelete}
                        disabled={deduplicating || Object.values(dupeSelections).every(v => !v)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        {deduplicating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : `Delete ${Object.values(dupeSelections).filter(Boolean).length} Selected`}
                      </Button>
                    </>
                  )}
                </div>
              )}
              {dedupeResults && (
                <p className={`text-sm mt-2 font-medium ${dedupeResults.success ? 'text-green-800' : 'text-red-800'}`}>
                  {dedupeResults.success ? `✓ Deleted ${dedupeResults.removed} question${dedupeResults.removed !== 1 ? 's' : ''}.` : `Error: ${dedupeResults.error}`}
                </p>
              )}
            </div>

            {/* Repair */}
            <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
              <p className="text-sm font-semibold text-orange-900 mb-2">🔧 Fix Existing Questions</p>
              <p className="text-xs text-orange-800 mb-3">Repairs answer mismatches and removes factually inaccurate questions.</p>
              <Button onClick={repairExistingQuestions} disabled={repairing} variant="outline" className="border-orange-400 text-orange-900 hover:bg-orange-100 w-full">
                {repairing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Repairing...</> : 'Repair All Existing Questions'}
              </Button>
              {repairing && repairProgress.total > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-orange-800">{repairProgress.stage}</p>
                  <Progress value={Math.round((repairProgress.current / repairProgress.total) * 100)} className="h-2" />
                  <p className="text-xs text-orange-600 text-right">{repairProgress.current}/{repairProgress.total}</p>
                </div>
              )}
              {repairing && repairProgress.total === 0 && <p className="text-xs text-orange-800 mt-2">{repairProgress.stage}</p>}
              {repairResults && (
                <p className={`text-sm mt-2 font-medium ${repairResults.success ? 'text-green-800' : 'text-red-800'}`}>
                  {repairResults.success
                    ? `✓ Scanned ${repairResults.total} — fixed ${repairResults.fixed} mismatches, removed ${repairResults.deleted} inaccurate.`
                    : `Error: ${repairResults.error}`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}