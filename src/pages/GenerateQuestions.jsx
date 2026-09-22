import React, { useState, useRef, useEffect } from 'react';
import { TRADES, KNOWLEDGE_SUBJECTS } from '@/lib/trades';
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

const PLAN_CONCURRENCY = 4;  // laws planned in parallel (Step 2)
const FILL_CONCURRENCY = 4;  // slots filled in parallel (Step 3)
const QUESTIONS_PER_LAW = 8;

// Dynamic slot cap: complexity 1–10 → 5–20 slots
// Regulations get a +2 base bonus so they're never starved vs thin statutes
const slotsForLaw = (law) => {
  const rawScore = law.complexity_score ?? 5;
  const bonus = law.law_type === 'regulation' ? 2 : 0;
  const score = Math.min(10, rawScore + bonus);
  return Math.round(5 + (score / 10) * 15);
};

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

// East Tennessee service area counties — triggers Source Layer 8 / TYPE 12
const EAST_TN_COUNTIES = new Set([
  'hancock', 'hawkins', 'sullivan', 'bristol', 'kingsport', 'johnson city',
  'washington', 'unicoi', 'erwin', 'carter', 'elizabethton', 'johnson', 'mountain city',
  'greene', 'greeneville', 'cocke', 'newport', 'sevier', 'sevierville', 'pigeon forge', 'gatlinburg',
  'knox', 'knoxville', 'union', 'maynardville', 'claiborne', 'grainger', 'jefferson',
  'hamblen', 'morristown', 'anderson', 'oak ridge', 'clinton', 'roan mountain', 'blountville',
]);

const isEastTNJurisdiction = (jurisdiction) => {
  const lower = (jurisdiction || '').toLowerCase();
  for (const county of EAST_TN_COUNTIES) {
    if (lower.includes(county)) return true;
  }
  return false;
};

const normalizeForMatch = (str) =>
  (str || '').toLowerCase()
    .replace(/[\u00a0\u2009\u202f\t]/g, ' ')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"']/g, '')
    .replace(/\s+/g, ' ').trim();

const normalizeFP = (str) =>
  (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ─── Pipeline step helpers ───────────────────────────────────────────────────

// STEP 1 ONLY — web search enabled here and nowhere else
const step1EnumerateLaws = (trades, jurisdiction, mode, focusArea) => {
  const hasKnowledge = trades.some(t => KNOWLEDGE_SUBJECTS.has(t));
  const scope = mode === 'federal'
    ? (hasKnowledge
      ? 'FEDERAL law, federal-level standards, and general knowledge references. Do NOT include state-specific laws.'
      : 'FEDERAL law only (OSHA, EPA, DOT, FTC etc). Do NOT include state laws.')
    : (hasKnowledge
      ? `${jurisdiction} STATE law, state-specific professional licensing requirements, AND general knowledge references (use law_type="knowledge" for general references that are not state-specific).`
      : `${jurisdiction} STATE law only. Do NOT include federal laws.`);
  const focusClause = focusArea ? `\nFOCUS AREA — Prioritize content most relevant to: "${focusArea}". Still include foundational material but weight the list toward this topic.` : '';
  const knowledgeClause = hasKnowledge ? `
KNOWLEDGE SUBJECTS DETECTED in the trade list. For any trade that is a knowledge-based profession or academic subject (e.g., Soil Science, Physics, Chemistry, Accounting, Animal Science, Farrier, etc.), enumerate the key references, standards, textbook chapters, and professional certification requirements instead of laws. Use law_type="knowledge" for general knowledge references. Use law_type="statute" or "regulation" for any state-specific professional licensing requirements (e.g., CPA license requirements, certified crop advisor requirements, pesticide applicator license, farrier licensing where required).
Knowledge subject sources to draw from:
- Professional certification body references (ASA, CPA exam blueprints, AFA, AVMA, NRC, NASEM, etc.)
- Standard textbooks and reference works (cite by title and chapter)
- Industry standards (ASTM, ANSI, etc.)
- State-specific professional licensing requirements where they exist
- Federal-level requirements where applicable (USDA, EPA, FDA, etc.)
- For Farrier: draw from publicly available farrier education materials, American Farriers Association (AFA) certification references, equine anatomy and biomechanics texts, and horseshoeing principles including topics from "Principles of Horseshoeing" by Doug Butler (use publicly available summaries, course materials, and references — do not reproduce copyrighted text)
` : '';

  const eastTNLayer = isEastTNJurisdiction(jurisdiction) ? `
8. East Tennessee local jurisdiction knowledge (ACTIVE — jurisdiction is in East Tennessee service area):
   Generate entries for the following East Tennessee jurisdiction-specific sources:
   - Sevier County Environmental Health: septic permit fees ($300 new, $75 repair), re-inspection fee ($100 effective June 1 2024), mgoconnect.org online filing, processing time ~3 weeks, phone (865) 429-1766.
   - TDEC MS4 Permit (Sevier County co-permittees, re-issued April 1 2024): zero stormwater discharge for first inch of rainfall — applies in Sevierville, Pigeon Forge, Gatlinburg, Sevier County unincorporated.
   - Greene County septic routing change: applications no longer accepted at Greene County Environmental Health; route to TDEC directly at tdec.tn.gov/septic or Washington County TDEC office, 2305 Silverdale Drive, Johnson City TN, (423) 854-5400.
   - Bristol TN state line: Bristol Codes Enforcement Division is the POCA AHJ for Tennessee-side work; State Street is TN/VA boundary; confirm address side before permitting.
   - Sevierville driveway standard: maximum 10% slope first 20 feet from street, 15% thereafter — local standard not in state code.
   - Local enforcement status by county: Sevierville/Pigeon Forge/Gatlinburg/Sevier County = POCA; Knox County/Knoxville = POCA; Johnson City = POCA; Erwin/Unicoi County = verify POCA; Carter County = verify POCA or state program; Union County = verify enforcement state; Johnson County = likely state program; Hancock County = likely state program; Washington County unincorporated = own enforcement.` : '';

  return base44.integrations.Core.InvokeLLM({
    prompt: `List applicable laws and regulations for these licensed trades in scope: ${scope}
Trades: ${trades.join(', ')}${focusClause}${knowledgeClause}

Draw from ALL of the following source layers:
1. Federal statutes and agency regulations (OSHA 29 CFR 1926/1910, EPA, DOT, etc.)
2. State statutes and agency regulations (for ${jurisdiction}: state code, state agency rules, licensing statutes)
3. Adopted codes with state amendments (NEC, IRC, IPC, IMC, IFC with ${jurisdiction} amendments)
4. National/international technical standards (ASTM, ANSI, NFPA, UL, ACI, AISC, AWWA, ACCA, NCMA, ALSC, AWC, NRCA)
5. Manufacturer specifications and industry standards where codes defer to them
6. Local government ordinances and amendments where the jurisdiction has adopted more stringent local standards
7. Authority Having Jurisdiction (AHJ) determination framework — ALWAYS ACTIVE for Tennessee work:
   Tennessee AHJ is governed by TCA 68-120-101. Three enforcement states exist: (A) State Program Jurisdiction — State Fire Marshal enforces, permits via tn.gov or local issue agent; (B) Local POCA jurisdiction — local government has a Program of Cooperative Agreement, local building dept is AHJ, local code edition applies (never less stringent than state, never more than 7 years older than latest published edition per TCA 68-120-101(b)(5)(A)); (C) Opt-out jurisdiction — no mandatory residential code enforcement, voluntary State Fire Marshal inspection available per TCA 68-120-101.
   Authorities that ALWAYS retain independent jurisdiction regardless of local opt-out or POCA status: TDEC Division of Water Resources (all septic statewide, TCA 68-221-401); TOSHA (worker safety, TCA 50-3-101); State Fire Marshal (state/educational buildings); Tennessee One-Call 811 (excavation notification, TCA 65-31-101); TDCI Contractor Licensing Division (license requirements, TCA 62-6-101).
   Dispute resolution: per TCA 68-120-101(b)(6) the State Fire Marshal's interpretation supersedes conflicting local interpretation.
   POCA audit: per Tenn. Comp. R. & Regs. 0780-02-02-.06 (effective April 17 2025) the State Fire Marshal may revoke POCA if local code edition is more than 7 years older than latest published edition.
   Generate entries for: TCA 68-120-101, TCA 68-221-401, TCA 65-31-101, TCA 50-3-101, TCA 62-6-101, Tenn. Comp. R. & Regs. 0780-02-02-.06.${eastTNLayer}

Knowledge domains to use when assigning knowledge_domain: Safety and Health, Excavation and Earthwork, Concrete and Masonry, Structural and Framing, Retaining Walls, Electrical, Plumbing, HVAC and Mechanical, Roofing, Septic and Subsurface Drainage, Surface Drainage, Gutters and Downspouts, Permits and Inspections, Material Standards, Environmental and Site, Licensing, Authority Having Jurisdiction and Permit Routing

Include: licensing statutes, continuing education, bonding/insurance, installation standards, inspection/permitting, enforcement/penalties, technical standards, safety thresholds, AHJ determination, permit routing.
For each law/regulation/standard, provide:
- citation (exact)
- title (short)
- law_type ("statute" | "regulation")
- trade (one of the input trade names)
- complexity_score: integer 1–10 reflecting how many distinct testable facts, thresholds, numerical limits, or sub-requirements the document contains. A thin 3-section statute = 2–3; a dense regulatory chapter with dozens of specific technical requirements = 8–10.
- estimated_sections: your best estimate of the number of distinct sections or sub-parts in this document.

IMPORTANT: Do NOT systematically score regulations lower than statutes. Technical standards (ACI, ASTM, NFPA) with many specific numeric requirements should score high. Score based on testable content density, not document type.`,
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
              trade: { type: "string" },
              complexity_score: { type: "number" },
              estimated_sections: { type: "number" }
            }
          }
        }
      }
    }
  });
};

// STEP 2 — web search OFF, uses only law name/citation as context
const step2PlanSlots = (law, jurisdiction, trades, focusArea) => {
  const eastTNDimensions = isEastTNJurisdiction(jurisdiction)
    ? ', ahj_identification_permit_routing, east_tn_local_jurisdiction'
    : ', ahj_identification_permit_routing';

  return base44.integrations.Core.InvokeLLM({
    prompt: `Pre-define up to 20 unique exam question slots for this law/standard.
Law: ${law.citation} — ${law.title} (${law.law_type})
Jurisdiction: ${jurisdiction}, Trade(s): ${trades.join(', ')}${focusArea ? `\nFocus Area: "${focusArea}" — weight slots toward this topic where relevant.` : ''}
Dimensions to cover: definitions, thresholds_limits, exemptions, penalties, required_procedures, deadlines, responsible_parties, documentation_requirements, numerical_precision, sequencing, code_citations, scenario_application, jurisdiction_comparison, manufacturer_specifications, safety_thresholds${eastTNDimensions}

TYPE 11 — AHJ IDENTIFICATION AND PERMIT ROUTING (use dimension: ahj_identification_permit_routing):
Reserve slots for questions that train the user to determine the complete AHJ picture before starting any job. Sub-topics: identifying enforcement state (state program / POCA / opt-out), which office to call for each permit type, which code edition applies in the jurisdiction, who conducts inspections, what happens when a POCA is revoked, dispute resolution between state and local per TCA 68-120-101(b)(6), and which authorities always retain independent jurisdiction (TDEC septic, TOSHA, 811, State Fire Marshal, Contractor Licensing).
${isEastTNJurisdiction(jurisdiction) ? `
TYPE 12 — EAST TENNESSEE SERVICE AREA JURISDICTION (use dimension: east_tn_local_jurisdiction — ACTIVE for this jurisdiction):
Reserve slots for questions covering: Sevier County MS4 stormwater zero-discharge requirement for first inch of rainfall; Sevier County Environmental Health septic fees/timelines/re-inspection process; Greene County septic routing change to TDEC direct; Bristol TN state-line permit jurisdiction confirmation; Roan Mountain CDP non-municipal Carter County jurisdiction; Union County multi-agency coordination (811, TDEC septic, state/POCA building, contractor licensing); local POCA vs state program status for East Tennessee counties in the service area.` : ''}

DISAMBIGUATION RULE — CRITICAL:
If this law contains multiple dollar amounts, timeframes, thresholds, or numerical values that differ based on triggering circumstance (e.g. initial licensing vs. reinstatement after suspension, different license tiers, different covered parties), each distinct amount/trigger MUST be its own separate slot with a unique legal_fact_fingerprint that includes the specific triggering circumstance. NEVER combine two distinct statutory amounts into a single slot. The question_hint must identify the specific trigger (e.g. "initial applicant bond before authorization" vs. "reinstatement bond after permit revocation").

Per slot: dimension, legal_fact_fingerprint ("[Citation] — [specific triggering circumstance] — [specific fact/amount]"), question_hint (one line specifying the exact trigger), suggested_format (multiple_choice|true_false|fill_in_blank)`,
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
};

// STEP 3 — web search OFF, uses only slot fingerprint + law name as context
const step3FillSlot = (slot, jurisdiction, trades, existingFingerprints, focusArea) => {
  const fpList = existingFingerprints.length > 0
    ? `\nDO NOT test these already-covered facts:\n${existingFingerprints.slice(0, 40).map((f, i) => `${i + 1}. ${f}`).join('\n')}\n`
    : '';
  const focusClause = focusArea ? `\nFocus Area: Prioritize angle toward "${focusArea}" where relevant to this slot.\n` : '';

  const ahjInstructions = slot.dimension === 'ahj_identification_permit_routing' ? `
TYPE 11 — AHJ IDENTIFICATION AND PERMIT ROUTING INSTRUCTIONS:
This slot tests AHJ determination. Questions must train the user to identify the correct AHJ and permit routing before starting work. Cover: enforcement state identification (state program / POCA / opt-out per TCA 68-120-101), which office issues each permit type, which code edition applies (local POCA may adopt equal-or-more-stringent edition, never more than 7 years older than latest published per TCA 68-120-101(b)(5)(A)), who conducts inspections, what happens when POCA is revoked (State Fire Marshal reassumes, per Tenn. Comp. R. & Regs. 0780-02-02-.06), dispute resolution (State Fire Marshal supersedes local per TCA 68-120-101(b)(6)), and authorities always retaining independent jurisdiction regardless of local status (TDEC septic TCA 68-221-401, TOSHA TCA 50-3-101, 811 TCA 65-31-101, State Fire Marshal for state/educational buildings, Contractor Licensing TCA 62-6-101).
Question stems must specify location and trade type precisely. Scenario-based questions are preferred — present a realistic job situation and ask who the AHJ is, where to pull the permit, or what code edition governs.` : '';

  const eastTNInstructions = (slot.dimension === 'east_tn_local_jurisdiction' && isEastTNJurisdiction(jurisdiction)) ? `
TYPE 12 — EAST TENNESSEE SERVICE AREA JURISDICTION INSTRUCTIONS:
This slot tests location-specific jurisdiction knowledge for the user's East Tennessee service area. Use verified facts only:
- Sevier County MS4 stormwater (TDEC permit re-issued April 1 2024): zero runoff for first inch of rainfall applies in Sevierville, Pigeon Forge, Gatlinburg, Sevier County unincorporated. Affects all drainage design in this corridor.
- Sevier County Environmental Health septic: $300 new permit fee, $75 repair fee, $100 re-inspection fee (effective June 1 2024), mgoconnect.org for standard online applications, in-person for subdivisions and large conventional systems, cash/check only payable to Sevier County Health Department, ~3 weeks processing, call (865) 429-1766 between 8am–9am to reschedule after failed final inspection.
- Greene County septic routing change: no longer accepted at Greene County Environmental Health — apply through TDEC at tdec.tn.gov/septic or Washington County TDEC office, 2305 Silverdale Drive, Johnson City TN (423) 854-5400.
- Bristol TN: POCA jurisdiction, Bristol Codes Enforcement Division is AHJ. State Street is TN/VA boundary. Confirm Tennessee-side address before pulling permits.
- Roan Mountain: census-designated place, no incorporated municipal authority, falls under Carter County jurisdiction. Verify Carter County POCA or state program status before permitting.
- Union County multi-agency: 811 three business days before excavation (TCA 65-31-101), TDEC for septic (no local septic office), determine building enforcement state before pulling structure permits, contractor license required for projects $25,000+ (TCA 62-6-101).
- Knoxville / Knox County: both POCA. Knoxville has local electrical amendments more stringent than state and separate electrical permit process.
- Sevierville local driveway standard: max 10% slope first 20 feet, 15% remainder — local standard not in state code.
Questions must be scenario-based with specific locations. Present realistic job situations and ask the user to identify permit routing, fee amounts, processing timelines, or jurisdictional facts.` : '';

  const knowledgeInstructions = slot.law_type === 'knowledge' ? `
KNOWLEDGE SUBJECT INSTRUCTIONS:
This slot tests general professional knowledge from a reference/standard/textbook, NOT a legal code or regulation.
- Frame the question as a professional knowledge question, not a legal compliance question.
- The explanation should cite the specific reference, standard, or textbook section (not a legal code section).
- knowledge_domain should be appropriate to the academic subject (e.g., "Soil Physics", "Organic Chemistry", "Equine Anatomy", "Financial Accounting", "Classical Mechanics").
` : '';

  return base44.integrations.Core.InvokeLLM({
    prompt: `Generate exactly 1 professional licensing exam question for ${trades.join(', ')} in ${jurisdiction}.
Source: ${slot.law_citation} — ${slot.law_title} (${slot.law_type})
Dimension: ${slot.dimension}
Legal fact to test: ${slot.legal_fact_fingerprint}
Hint: ${slot.question_hint}
Format: ${slot.suggested_format}
${fpList}${focusClause}${ahjInstructions}${eastTNInstructions}${knowledgeInstructions}
Rules:
- legal_fact_fingerprint MUST be: "${slot.legal_fact_fingerprint}"
- law_type: "${slot.law_type}"
- For MC: 4 options, correct_answer matches one word-for-word
- For T/F: correct_answer is exactly "True" or "False"
- For fill_in_blank: use _____, never reveal answer in question text
- NEVER embed the answer in the question text
- explanation: explain WHY the answer is correct AND the real-world consequence of getting it wrong (2-3 sentences). Must cite the specific code/standard/reference section.
- memory_tip: (optional) one short practical sentence to remember the value or sequence (e.g. "Five feet — deeper than you are tall, you need protection.")
- manufacturer_note: (optional) include ONLY if the answer derives from a manufacturer spec or the code defers to manufacturer instructions
- knowledge_domain: assign one of: Safety and Health, Excavation and Earthwork, Concrete and Masonry, Structural and Framing, Retaining Walls, Electrical, Plumbing, HVAC and Mechanical, Roofing, Septic and Subsurface Drainage, Surface Drainage, Gutters and Downspouts, Permits and Inspections, Material Standards, Environmental and Site, Licensing, Authority Having Jurisdiction and Permit Routing

DIFFICULTY CLASSIFICATION — apply BOTH criteria together:
- "beginner": tests a commonly-cited, frequently-encountered rule as a single plain fact. No cross-referencing of other code sections required. A working tradesperson would know this from routine day-to-day practice.
- "intermediate": EITHER tests a less commonly-cited/more obscure rule as a single fact, OR tests a commonly-cited rule but requires connecting it to one related fact or exception to answer correctly.
- "advanced": tests a rule that is BOTH less commonly invoked in practice AND requires cross-referencing multiple code sections, resolving a conflict or exception between two rules, or applying the rule to a non-obvious edge case. This should be difficult even for an experienced tradesperson who doesn't specialize in code compliance.
You must assign exactly one of these three values to every question's difficulty field based on this rubric — do not default to "intermediate" when uncertain; make a deliberate classification decision using the criteria above.

DISAMBIGUATION RULES — NON-NEGOTIABLE:
1. The question stem MUST specify the exact triggering circumstance so only ONE answer is correct.
2. NO two answer choices may both be legally correct under any reasonable reading of the question as written.
3. For MC questions: verify each wrong option is unambiguously wrong given the question stem.
4. The question stem must contain enough context that a knowledgeable test-taker can identify the single correct answer.`,
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
              difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
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
  const [genProgress, setGenProgress] = useState({ step: 0, current: 0, total: 0, stage: '', completedCalls: 0, estimatedTotal: 0 });
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
  const [disambiguating, setDisambiguating] = useState(false);
  const [disambigResults, setDisambigResults] = useState(null);
  const [disambigProgress, setDisambigProgress] = useState({ current: 0, total: 0, stage: '' });
  const [masterPlanData, setMasterPlanData] = useState(null);
  const tradeRef = useRef(null);
  const queryClient = useQueryClient();

  const filteredTrades = TRADES.filter(t => t.toLowerCase().includes(tradeSearch.toLowerCase()));

  // Estimated LLM calls: 1 for step 1 (only if laws not cached) + lawsNeeded for step 2 + questionCount for step 3
  const estimatedLLMCalls = (lawRegistry.length === 0 ? 1 : 0)
    + Math.max(1, Math.ceil(questionCount / QUESTIONS_PER_LAW))
    + questionCount;

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

    let completedCalls = 0;

    try {
      const effectiveJurisdiction = jurisdictionMode === 'federal' ? 'Federal' : selectedJurisdiction;

      // ── STEP 1: Enumerate laws (web search ON — only time it fires) ──────────
      setGenProgress({ step: 1, current: 0, total: 1, stage: `Step 1 of 3: Enumerating ${effectiveJurisdiction} laws (web search)...`, completedCalls: 0, estimatedTotal: estimatedLLMCalls });
      let laws = lawRegistry.length > 0 ? lawRegistry : null;
      if (!laws) {
        const r1 = await step1EnumerateLaws(selectedTrades, effectiveJurisdiction, jurisdictionMode, focusArea);
        laws = r1?.laws || [];
        completedCalls += 1;
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
      // Sort laws by effective complexity (regulations get +2 bonus) so denser laws are processed first
      const scoredLaws = [...laws].sort((a, b) => {
        const scoreA = Math.min(10, (a.complexity_score ?? 5) + (a.law_type === 'regulation' ? 2 : 0));
        const scoreB = Math.min(10, (b.complexity_score ?? 5) + (b.law_type === 'regulation' ? 2 : 0));
        return scoreB - scoreA;
      });
      const lawsNeeded = Math.max(1, Math.ceil(questionCount / QUESTIONS_PER_LAW));
      const lawsToProcess = scoredLaws.slice(0, lawsNeeded);
      const allSlots = [];

      for (let i = 0; i < lawsToProcess.length; i += PLAN_CONCURRENCY) {
        const batch = lawsToProcess.slice(i, i + PLAN_CONCURRENCY);
        setGenProgress({
          step: 2,
          current: i,
          total: lawsToProcess.length,
          stage: `Step 2 of 3: Planning slots for law${batch.length > 1 ? 's' : ''} ${i + 1}–${Math.min(i + batch.length, lawsToProcess.length)} of ${lawsToProcess.length} (no web search)...`,
          completedCalls,
          estimatedTotal: estimatedLLMCalls
        });
        const batchResults = await Promise.all(batch.map(law => step2PlanSlots(law, effectiveJurisdiction, selectedTrades, focusArea)));
        completedCalls += batch.length;
        for (let j = 0; j < batch.length; j++) {
          const law = batch[j];
          const dynamicCap = slotsForLaw(law);
          const slots = (batchResults[j]?.slots || []).slice(0, dynamicCap).map(slot => ({
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
          stage: `Step 3 of 3: Generating questions ${filledCount + 1}–${Math.min(filledCount + batch.length, slotsToFill.length)} of ${slotsToFill.length} (no web search)...`,
          completedCalls,
          estimatedTotal: estimatedLLMCalls
        });

        const batchResults = await Promise.all(batch.map(async (slot) => {
          const resp = await step3FillSlot(slot, effectiveJurisdiction, selectedTrades, fpSnapshot, focusArea);
          const q = resp?.questions?.[0];
          if (q && isValidQuestion(q, new Set(seenFingerprints))) return { slot, q };
          return { slot, q: null };
        }));
        completedCalls += batch.length;

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
      setGenProgress({ step: 3, current: filledCount, total: slotsToFill.length, stage: 'Saving questions...', completedCalls, estimatedTotal: estimatedLLMCalls });
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
          difficulty: q.difficulty,
          memory_tip: q.memory_tip || null,
          manufacturer_note: q.manufacturer_note || null,
          knowledge_domain: q.knowledge_domain || null,
          confidence_tier: 0,
          consecutive_correct: 0,
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
        jurisdiction: effectiveJurisdiction,
        actualLLMCalls: completedCalls,
        estimatedLLMCalls
      });
    } catch (error) {
      setResults({ success: false, error: error.message });
    } finally {
      setGenerating(false);
      setGenProgress({ step: 0, current: 0, total: 0, stage: '', completedCalls: 0, estimatedTotal: 0 });
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

  const disambiguateExistingQuestions = async () => {
    setDisambiguating(true);
    setDisambigResults(null);
    setDisambigProgress({ current: 0, total: 0, stage: 'Loading questions...' });
    try {
      const allQuestions = await base44.entities.LawQuestion.list(null, 1000);
      const mcQuestions = allQuestions.filter(q => q.question_type === 'multiple_choice' && q.options?.length >= 2);
      const BATCH = 10;
      const totalBatches = Math.ceil(mcQuestions.length / BATCH);
      let deleted = 0;
      let rewritten = 0;

      for (let i = 0; i < mcQuestions.length; i += BATCH) {
        const batch = mcQuestions.slice(i, i + BATCH);
        const batchNum = Math.floor(i / BATCH) + 1;
        setDisambigProgress({ current: batchNum, total: totalBatches, stage: `Auditing batch ${batchNum}/${totalBatches} (~${Math.round((batchNum/totalBatches)*100)}%)...` });

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Audit these ${batch.length} multiple-choice exam questions for AMBIGUITY. A question FAILS if any wrong answer option could also be legally correct under a reasonable reading of the stem (e.g. stem omits triggering circumstance like "initial applicant" vs "reinstatement").

For each question that FAILS: provide the index (0-based) and a rewritten question_text that adds the missing context so only the correct_answer is right.
Only include FAILING questions in your response — omit passing ones entirely.

${batch.map((q, idx) => `[${idx}] "${q.question_text}"
Options: ${(q.options||[]).join(' | ')}
Correct: "${q.correct_answer}"
Law: ${q.law_citation||'?'} | ${q.jurisdiction}`).join('\n\n')}

Return JSON: { "fixes": [ { "index": number, "rewritten": "new question text" } ] }`,
          add_context_from_internet: false,
          model: "gemini_3_flash",
          response_json_schema: {
            type: "object",
            properties: {
              fixes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "number" },
                    rewritten: { type: "string" }
                  },
                  required: ["index", "rewritten"]
                }
              }
            },
            required: ["fixes"]
          }
        });

        for (const fix of (result?.fixes || [])) {
          const q = batch[fix.index];
          if (!q || !fix.rewritten) continue;
          await base44.entities.LawQuestion.update(q.id, { question_text: fix.rewritten });
          rewritten++;
        }
      }

      setDisambigResults({ success: true, total: mcQuestions.length, rewritten, deleted });
    } catch (err) {
      setDisambigResults({ success: false, error: err.message });
    } finally {
      setDisambiguating(false);
      setDisambigProgress({ current: 0, total: 0, stage: '' });
    }
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

      // ── Backfill missing difficulty classifications ────────────────────────
      const VALID_DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);
      const needsDifficulty = allQuestions.filter(q => !q.difficulty || !VALID_DIFFICULTIES.has(q.difficulty));
      let difficultyBackfilled = 0;
      if (needsDifficulty.length > 0) {
        const DIFF_BATCH = 5;
        const diffTotalBatches = Math.ceil(needsDifficulty.length / DIFF_BATCH);
        for (let i = 0; i < needsDifficulty.length; i += DIFF_BATCH) {
          const batch = needsDifficulty.slice(i, i + DIFF_BATCH);
          const batchNum = Math.floor(i / DIFF_BATCH) + 1;
          setRepairProgress({ current: batchNum, total: diffTotalBatches, stage: `Classifying difficulty batch ${batchNum}/${diffTotalBatches}...` });
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Classify the difficulty of each exam question using this rubric:

DIFFICULTY CLASSIFICATION — apply BOTH criteria together:
- "beginner": tests a commonly-cited, frequently-encountered rule as a single plain fact. No cross-referencing of other code sections required. A working tradesperson would know this from routine day-to-day practice.
- "intermediate": EITHER tests a less commonly-cited/more obscure rule as a single fact, OR tests a commonly-cited rule but requires connecting it to one related fact or exception to answer correctly.
- "advanced": tests a rule that is BOTH less commonly invoked in practice AND requires cross-referencing multiple code sections, resolving a conflict or exception between two rules, or applying the rule to a non-obvious edge case. This should be difficult even for an experienced tradesperson who doesn't specialize in code compliance.

Questions to classify:
${JSON.stringify(batch.map(q => ({ id: q.id, question_text: q.question_text, correct_answer: q.correct_answer, law_citation: q.law_citation || '' })), null, 2)}

Return a classifications array with { id, difficulty } for each question.`,
            add_context_from_internet: false,
            model: "gemini_3_flash",
            response_json_schema: {
              type: "object",
              properties: {
                classifications: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] }
                    }
                  }
                }
              }
            }
          });
          const diffUpdates = [];
          for (const c of (result?.classifications || [])) {
            if (c.id && VALID_DIFFICULTIES.has(c.difficulty)) {
              diffUpdates.push(base44.entities.LawQuestion.update(c.id, { difficulty: c.difficulty }));
              difficultyBackfilled++;
            }
          }
          await Promise.all(diffUpdates);
        }
      }

      setRepairResults({ success: true, total: allQuestions.length, fixed, deleted: deleted + embeddedDeleted, difficultyBackfilled });
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
                      const r = await step1EnumerateLaws(selectedTrades, jurisdictionMode === 'federal' ? 'Federal' : selectedJurisdiction, jurisdictionMode, focusArea);
                      setLawRegistry(r?.laws || []);
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
                    {[...lawRegistry].sort((a, b) => {
                      const sA = Math.min(10, (a.complexity_score ?? 5) + (a.law_type === 'regulation' ? 2 : 0));
                      const sB = Math.min(10, (b.complexity_score ?? 5) + (b.law_type === 'regulation' ? 2 : 0));
                      return sB - sA;
                    }).map((law, i) => {
                      const effectiveScore = Math.min(10, (law.complexity_score ?? 5) + (law.law_type === 'regulation' ? 2 : 0));
                      const slots = slotsForLaw(law);
                      return (
                        <div key={i} className="flex items-start gap-2 text-xs py-1 border-b border-indigo-100 last:border-0">
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${law.law_type === 'statute' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                            {law.law_type === 'statute' ? 'STAT' : 'REG'}
                          </span>
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-800">
                            ⚡{effectiveScore} · {slots}s
                          </span>
                          <div>
                            <span className="font-medium text-indigo-900">{law.citation}</span>
                            <span className="text-indigo-600 ml-1">— {law.title}</span>
                          </div>
                        </div>
                      );
                    })}
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

            {selectedTrades.length > 0 && (jurisdictionMode === 'federal' || selectedJurisdiction) && !generating && (
              <p className="text-xs text-gray-500 text-center -mb-1">
                This will make approximately {estimatedLLMCalls} AI generation call{estimatedLLMCalls !== 1 ? 's' : ''}.
              </p>
            )}

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

            {generating && (
              <div className="space-y-3">
                {/* Step indicator */}
                <div className="flex gap-2">
                  {[1, 2, 3].map(s => (
                    <div key={s} className={`flex-1 rounded py-1.5 text-center text-xs font-semibold border transition-all ${
                      genProgress.step === s
                        ? 'bg-purple-600 text-white border-purple-600'
                        : genProgress.step > s
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-gray-100 text-gray-400 border-gray-200'
                    }`}>
                      {genProgress.step > s ? '✓ ' : ''}{s === 1 ? 'Web Search' : s === 2 ? 'Plan Slots' : 'Generate'}
                    </div>
                  ))}
                </div>
                {genProgress.stage && (
                  <p className="text-xs text-gray-600">
                    {genProgress.stage}
                    {genProgress.estimatedTotal > 0 && ` · ${genProgress.completedCalls}/${genProgress.estimatedTotal} AI calls`}
                  </p>
                )}
                {genProgress.total > 0 && (
                  <div className="space-y-1">
                    <Progress value={Math.round((genProgress.current / genProgress.total) * 100)} className="h-2" />
                    <p className="text-xs text-gray-400 text-right">{genProgress.current}/{genProgress.total}</p>
                  </div>
                )}
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
                        {results.actualLLMCalls != null && (
                          <p className="text-xs text-gray-600 mt-1">
                            🔢 {results.actualLLMCalls} AI calls made (estimated {results.estimatedLLMCalls}).
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

            {/* Disambiguate */}
            <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <p className="text-sm font-semibold text-yellow-900 mb-2">⚖️ Fix Ambiguous Questions</p>
              <p className="text-xs text-yellow-800 mb-3">
                Audits all multiple-choice questions and rewrites any where two answer choices could both be legally correct (e.g. two bond amounts from the same law). Adds triggering circumstance to the question stem to make the correct answer unambiguous.
              </p>
              <Button onClick={disambiguateExistingQuestions} disabled={disambiguating} variant="outline" className="border-yellow-400 text-yellow-900 hover:bg-yellow-100 w-full">
                {disambiguating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Auditing...</> : 'Audit & Fix Ambiguous Questions'}
              </Button>
              {disambiguating && disambigProgress.total > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-yellow-800">{disambigProgress.stage}</p>
                  <Progress value={Math.round((disambigProgress.current / disambigProgress.total) * 100)} className="h-2" />
                  <p className="text-xs text-yellow-600 text-right">{disambigProgress.current}/{disambigProgress.total}</p>
                </div>
              )}
              {disambiguating && disambigProgress.total === 0 && <p className="text-xs text-yellow-800 mt-2">{disambigProgress.stage}</p>}
              {disambigResults && (
                <p className={`text-sm mt-2 font-medium ${disambigResults.success ? 'text-green-800' : 'text-red-800'}`}>
                  {disambigResults.success
                    ? `✓ Audited ${disambigResults.total} MC questions — rewrote ${disambigResults.rewritten} ambiguous stems.`
                    : `Error: ${disambigResults.error}`}
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
                    ? `✓ Scanned ${repairResults.total} — fixed ${repairResults.fixed} mismatches, removed ${repairResults.deleted} inaccurate${repairResults.difficultyBackfilled ? `, backfilled ${repairResults.difficultyBackfilled} difficulty` : ''}.`
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