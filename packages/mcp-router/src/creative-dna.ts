/**
 * Creative DNA Vectors — Multi-Tenant Platform
 * Task: T20260308-696 — Creative DNA Vectors Integration
 *
 * Each tenant (photographer/studio) has a "Creative DNA" — a high-dimensional
 * style vector that captures their aesthetic fingerprint.
 *
 * The vector encodes:
 *   - Color palette preferences (warm/cool/neutral/mono)
 *   - Subject preferences (portrait/landscape/macro/sports/abstract)
 *   - Mood signature (dramatic/minimal/romantic/editorial/documentary)
 *   - Technical style (bokeh-heavy/sharp/grainy/clean/HDR)
 *   - Composition patterns (rule-of-thirds/centered/asymmetric/negative-space)
 *
 * Used by:
 *   - AI auto-tagger to weight subject/style scores
 *   - Gallery curation to sort by style match
 *   - ALFRED to personalize recommendations
 *   - Print shop to suggest products that match the aesthetic
 *
 * Storage: Firestore `tenants/{tenantId}/creativeDNA` document
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ColorPaletteStyle = 'warm' | 'cool' | 'neutral' | 'mono' | 'vibrant' | 'muted' | 'earthy';
export type SubjectPreference = 'portrait' | 'landscape' | 'macro' | 'sports' | 'abstract' | 'wedding' | 'commercial' | 'street';
export type MoodSignature = 'dramatic' | 'minimal' | 'romantic' | 'editorial' | 'documentary' | 'fine-art' | 'candid';
export type TechnicalStyle = 'bokeh-heavy' | 'sharp' | 'grainy' | 'clean' | 'hdr' | 'long-exposure' | 'high-key' | 'low-key';
export type CompositionPattern = 'rule-of-thirds' | 'centered' | 'asymmetric' | 'negative-space' | 'leading-lines' | 'framing';

// ─── Core Types ───────────────────────────────────────────────────────────────

/**
 * A numeric embedding vector (128-d) representing a photographer's creative style.
 * Can be used for cosine similarity comparisons between photographers or images.
 */
export type StyleEmbedding = Float32Array | number[];

export interface CreativeDNADimensions {
  /** Color palette preference [0–1] scores per style */
  colorPalette: Record<ColorPaletteStyle, number>;
  /** Subject preference [0–1] scores per subject */
  subjectPreference: Record<SubjectPreference, number>;
  /** Mood signature [0–1] scores per mood */
  moodSignature: Record<MoodSignature, number>;
  /** Technical style [0–1] scores per style trait */
  technicalStyle: Record<TechnicalStyle, number>;
  /** Composition pattern [0–1] scores per pattern */
  compositionPattern: Record<CompositionPattern, number>;
}

export interface CreativeDNA {
  /** Tenant/photographer ID */
  tenantId: string;
  /** Human-readable label for dominant style */
  dominantStyle: string;
  /** Normalized dimension scores */
  dimensions: CreativeDNADimensions;
  /** 128-d embedding for similarity search (stored as Array for JSON compat) */
  embedding: number[];
  /** Confidence in the vector quality [0–1] */
  confidence: number;
  /** Number of photos analyzed to generate this vector */
  photoCount: number;
  /** ISO timestamp when DNA was last computed */
  computedAt: string;
  /** Version of the DNA algorithm */
  version: string;
}

export interface CreativeDNADiff {
  /** Which dimensions changed significantly */
  changedDimensions: string[];
  /** Cosine similarity between old and new [0–1] */
  similarity: number;
  /** Whether this change crossed a style-shift threshold */
  isStyleShift: boolean;
}

// ─── Default Dimensions ───────────────────────────────────────────────────────

function zeroDimensions(): CreativeDNADimensions {
  return {
    colorPalette: { warm: 0, cool: 0, neutral: 0, mono: 0, vibrant: 0, muted: 0, earthy: 0 },
    subjectPreference: { portrait: 0, landscape: 0, macro: 0, sports: 0, abstract: 0, wedding: 0, commercial: 0, street: 0 },
    moodSignature: { dramatic: 0, minimal: 0, romantic: 0, editorial: 0, documentary: 0, 'fine-art': 0, candid: 0 },
    technicalStyle: { 'bokeh-heavy': 0, sharp: 0, grainy: 0, clean: 0, hdr: 0, 'long-exposure': 0, 'high-key': 0, 'low-key': 0 },
    compositionPattern: { 'rule-of-thirds': 0, centered: 0, asymmetric: 0, 'negative-space': 0, 'leading-lines': 0, framing: 0 },
  };
}

// ─── Vector Math ──────────────────────────────────────────────────────────────

/**
 * Compute cosine similarity between two style embeddings.
 * Returns 1.0 for identical styles, 0.0 for orthogonal.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Embedding dimension mismatch');
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Flatten CreativeDNADimensions into a normalized number array.
 * Used to construct the 128-d embedding.
 */
export function dimensionsToVector(dims: CreativeDNADimensions): number[] {
  const values: number[] = [
    ...Object.values(dims.colorPalette),       // 7
    ...Object.values(dims.subjectPreference),  // 8
    ...Object.values(dims.moodSignature),      // 7
    ...Object.values(dims.technicalStyle),     // 8
    ...Object.values(dims.compositionPattern), // 6
  ];
  // Normalize to unit length (L2)
  const norm = Math.sqrt(values.reduce((s, v) => s + v * v, 0)) || 1;
  return values.map(v => v / norm);
}

/**
 * Derive a human-readable dominant style label from dimensions.
 */
export function deriveDominantStyle(dims: CreativeDNADimensions): string {
  const topMood = maxKey(dims.moodSignature);
  const topSubject = maxKey(dims.subjectPreference);
  const topColor = maxKey(dims.colorPalette);
  return `${topColor} ${topMood} ${topSubject}`;
}

function maxKey<T extends Record<string, number>>(obj: T): string {
  return Object.entries(obj).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'unknown';
}

// ─── DNA Builder ──────────────────────────────────────────────────────────────

/**
 * Build a CreativeDNA from raw tag observations.
 * Call this after auto-tagging a batch of photos; pass in the aggregated tag counts.
 */
export function buildCreativeDNA(
  tenantId: string,
  tagObservations: {
    colors: Partial<Record<ColorPaletteStyle, number>>;
    subjects: Partial<Record<SubjectPreference, number>>;
    moods: Partial<Record<MoodSignature, number>>;
    technicalStyles: Partial<Record<TechnicalStyle, number>>;
    compositions: Partial<Record<CompositionPattern, number>>;
  },
  photoCount: number
): CreativeDNA {
  const dims = zeroDimensions();

  // Aggregate and normalize each dimension
  mergeNormalized(dims.colorPalette, tagObservations.colors ?? {});
  mergeNormalized(dims.subjectPreference, tagObservations.subjects ?? {});
  mergeNormalized(dims.moodSignature, tagObservations.moods ?? {});
  mergeNormalized(dims.technicalStyle, tagObservations.technicalStyles ?? {});
  mergeNormalized(dims.compositionPattern, tagObservations.compositions ?? {});

  const embedding = dimensionsToVector(dims);
  const dominantStyle = deriveDominantStyle(dims);

  // Confidence scales with photo count — max at 200+ photos
  const confidence = Math.min(photoCount / 200, 1);

  return {
    tenantId,
    dominantStyle,
    dimensions: dims,
    embedding,
    confidence,
    photoCount,
    computedAt: new Date().toISOString(),
    version: '1.0.0',
  };
}

function mergeNormalized<K extends string>(
  target: Record<K, number>,
  source: Partial<Record<K, number>>
): void {
  let total = 0;
  for (const key of Object.keys(target) as K[]) {
    target[key] = source[key] ?? 0;
    total += target[key];
  }
  // Normalize so values sum to 1
  if (total > 0) {
    for (const key of Object.keys(target) as K[]) {
      target[key] = target[key] / total;
    }
  }
}

// ─── DNA Diff ─────────────────────────────────────────────────────────────────

const STYLE_SHIFT_THRESHOLD = 0.15; // cosine distance above this = style shift

/**
 * Compare two DNA snapshots and return what changed.
 */
export function diffCreativeDNA(previous: CreativeDNA, current: CreativeDNA): CreativeDNADiff {
  const similarity = cosineSimilarity(previous.embedding, current.embedding);
  const changed: string[] = [];

  // Check each dimension for significant drift (>0.1 absolute change)
  const categories: (keyof CreativeDNADimensions)[] = [
    'colorPalette', 'subjectPreference', 'moodSignature', 'technicalStyle', 'compositionPattern'
  ];
  for (const cat of categories) {
    const prev = previous.dimensions[cat];
    const curr = current.dimensions[cat];
    for (const key of Object.keys(prev)) {
      const delta = Math.abs((curr as Record<string, number>)[key] - (prev as Record<string, number>)[key]);
      if (delta > 0.1) {
        changed.push(`${cat}.${key}`);
      }
    }
  }

  return {
    changedDimensions: changed,
    similarity,
    isStyleShift: (1 - similarity) > STYLE_SHIFT_THRESHOLD,
  };
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Find the top-N most stylistically similar tenants to a given one.
 * Uses cosine similarity on the DNA embeddings.
 */
export function findSimilarCreators(
  target: CreativeDNA,
  pool: CreativeDNA[],
  topN = 5
): Array<{ tenantId: string; similarity: number }> {
  return pool
    .filter(d => d.tenantId !== target.tenantId)
    .map(d => ({
      tenantId: d.tenantId,
      similarity: cosineSimilarity(target.embedding, d.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}
