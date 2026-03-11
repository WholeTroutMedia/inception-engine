/**
 * Healthcare Blueprint — W3 Inception Blueprints
 *
 * Hackensack Meridian / Mount Sinai / Hippocratic AI pattern.
 * Clinical decision support for hospital systems.
 * HIPAA-compliant: no PHI stored in ChromaDB, all outputs anonymized.
 *
 * Constitutional flags: hipaa-pii, clinical-safety, no-direct-diagnosis
 */

import type { Blueprint } from '../types.js';

export const healthcareBlueprint: Blueprint = {
    id: 'healthcare-v1',
    name: 'Clinical Decision Support Engine',
    vertical: 'healthcare',
    description:
        'HIPAA-compliant clinical decision support: symptom analysis, differential diagnosis support, treatment option research, and contraindication checking. For clinical teams — not a replacement for physician judgment.',
    version: '1.0.0',
    tags: ['healthcare', 'clinical', 'hipaa', 'decision-support', 'hippocratic-pattern'],

    domainModel: {
        preferred: 'gemini-2.5-pro',
        systemPrompt: `You are a clinical decision support system, NOT a physician.
Your role is to surface relevant medical literature, highlight differentials, and flag potential risks
to assist qualified clinicians in their decision-making process.

CRITICAL RULES (Constitutional — never violate):
1. NEVER store, repeat, or infer patient PII in your outputs
2. NEVER provide a definitive diagnosis — only differentials with evidence levels
3. ALWAYS cite the medical literature source for every claim
4. ALWAYS include "Physician judgment required" in recommendations
5. Flag any drug interactions at HIGH severity immediately
6. Use only de-identified case language (e.g., "the patient" never "John Smith")`,
        knowledgeBase: 'inception-medical-literature',
        temperature: 0.1,
    },

    agentTeam: ['ATHENA', 'VERA', 'SENTINEL', 'LEX', 'COMPASS'],

    reasoningTraces: [
        {
            step: 1,
            name: 'Clinical Context Intake',
            procedure:
                'Parse the de-identified clinical query. Identify key symptoms, vital signs, lab values, and patient demographics without storing any PHI.',
            prompt: `Parse the clinical query and extract ONLY de-identified clinical facts.
Output: (1) chief complaint, (2) symptom timeline, (3) relevant lab values, (4) current medications (anonymized),
(5) relevant history (anonymized). DO NOT reference patient name, DOB, MRN, or any identifying information.`,
            tools: ['medical-parser'],
            outputSchema: 'DeidentifiedClinicalContext',
            requiredCapabilities: ['read:memory'],
        },
        {
            step: 2,
            name: 'Differential Diagnosis Support',
            procedure:
                'Generate a ranked differential diagnosis list with supporting evidence from peer-reviewed literature. Assign evidence levels (A/B/C/D).',
            prompt: `Based on the clinical context, generate a differential diagnosis list.
For each differential: (1) diagnosis name, (2) supporting features present, (3) features against,
(4) evidence level (A=RCT, B=observational, C=case series, D=expert opinion),
(5) recommended confirmatory tests. Rank by pre-test probability. List at least 3, maximum 8.`,
            tools: ['pubmed-search', 'clinical-guidelines-search'],
            outputSchema: 'DifferentialDiagnosisList',
            requiredCapabilities: ['read:memory', 'call:external-apis'],
        },
        {
            step: 3,
            name: 'Treatment Option Research',
            procedure:
                'For the top 2-3 differentials, surface evidence-based treatment options, dosing guidance, and monitoring parameters from current clinical guidelines.',
            prompt: `For the top differentials, research treatment options from current clinical guidelines.
Include: (1) first-line treatment with dosing range, (2) alternative options if first-line CI,
(3) monitoring parameters, (4) expected time to response, (5) treatment failure definition.
Cite the specific guideline version (e.g., AHA 2024 Guidelines).`,
            tools: ['pubmed-search', 'drug-database'],
            outputSchema: 'TreatmentOptions',
            requiredCapabilities: ['read:memory', 'call:external-apis'],
        },
        {
            step: 4,
            name: 'Contraindication & Safety Check',
            procedure:
                'Cross-reference proposed treatments against current medications for drug interactions. Flag contraindications from medical history.',
            prompt: `Run a safety check on proposed treatments.
Check: (1) drug-drug interactions (severity: mild/moderate/severe/contraindicated),
(2) drug-disease contraindications, (3) dosing adjustments needed (renal/hepatic/age),
(4) pregnancy/lactation considerations, (5) allergy cross-reactivity.
SEVERE or CONTRAINDICATED interactions must be the first item in the output.`,
            tools: ['drug-interaction-checker'],
            outputSchema: 'SafetyReport',
            requiredCapabilities: ['read:memory', 'call:external-apis'],
        },
    ],

    simulationSteps: [
        {
            name: 'PHI Leak Detection',
            description: 'Scan all outputs for potential PHI before delivery',
            validationQuery: 'Does any output contain patient-identifying information?',
            passCriteria: 'Zero PHI detected in any output field',
            failAction: 'abort',
        },
        {
            name: 'Safety Flag Completeness',
            description: 'Verify all HIGH severity interactions are prominently flagged',
            validationQuery: 'Are all contraindications clearly surfaced?',
            passCriteria: 'All HIGH/CONTRAINDICATED interactions appear in first paragraph',
            failAction: 'abort',
        },
    ],

    constitutionalFlags: ['hipaa-pii', 'clinical-safety', 'no-direct-diagnosis', 'physician-judgment-required'],
};
