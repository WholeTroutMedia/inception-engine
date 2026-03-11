/**
 * Creative DNA Embeddings — Vertex AI Multimodal Embedding Layer
 * Creative Liberation Engine v5.0.0 (GENESIS)
 *
 * Uses Vertex AI multimodalembedding@001 to generate 1408-dim vectors
 * from images, text, and video in the same semantic space.
 *
 * These vectors power Creative DNA matching — finding stylistic affinity
 * between artists, galleries, and generative directions.
 */

export interface EmbeddingInput {
  type: 'text' | 'image' | 'video';
  /** For text: the string content */
  text?: string;
  /** For image/video: base64-encoded content or GCS URI */
  content?: string;
  /** MIME type for image/video */
  mimeType?: string;
}

export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
  inputType: EmbeddingInput['type'];
  inputPreview: string;
  generatedAt: string;
}

export interface EmbeddingClientConfig {
  projectId: string;
  location?: string;
  modelId?: string;
}

const DEFAULT_CONFIG: Required<EmbeddingClientConfig> = {
  projectId: '',
  location: 'us-central1',
  modelId: 'multimodalembedding@001',
};

/**
 * Generate a Creative DNA embedding vector for a given input.
 *
 * Uses Vertex AI REST API directly (no SDK dependency — keeps bundle lean).
 * The resulting 1408-dim vector can be stored in SQLite vector extension
 * or Pinecone for semantic search across the creative corpus.
 */
export async function generateEmbedding(
  input: EmbeddingInput,
  config: EmbeddingClientConfig
): Promise<EmbeddingResult> {
  const { projectId, location, modelId } = { ...DEFAULT_CONFIG, ...config };

  if (!projectId) {
    throw new Error('[CreativeDNA] projectId is required for embedding generation');
  }

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;

  // Build Vertex AI request body
  const instances: Record<string, unknown>[] = [];
  if (input.type === 'text' && input.text) {
    instances.push({ text: input.text });
  } else if ((input.type === 'image' || input.type === 'video') && input.content) {
    const mediaKey = input.type === 'image' ? 'image' : 'video';
    if (input.content.startsWith('gs://')) {
      instances.push({ [mediaKey]: { gcsUri: input.content, mimeType: input.mimeType } });
    } else {
      instances.push({ [mediaKey]: { bytesBase64Encoded: input.content, mimeType: input.mimeType } });
    }
  } else {
    throw new Error(`[CreativeDNA] Invalid input: type "${input.type}" requires ${input.type === 'text' ? '"text"' : '"content"'} field`);
  }

  // Fetch with Application Default Credentials token
  const tokenResp = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  const { access_token } = (await tokenResp.json()) as { access_token: string };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ instances, parameters: {} }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[CreativeDNA] Vertex AI error ${resp.status}: ${err}`);
  }

  const data = (await resp.json()) as {
    predictions: Array<{
      textEmbedding?: number[];
      imageEmbedding?: number[];
      videoEmbeddings?: Array<{ embedding: number[] }>;
    }>;
  };

  const prediction = data.predictions[0];
  let vector: number[];

  if (input.type === 'text') {
    vector = prediction.textEmbedding ?? [];
  } else if (input.type === 'image') {
    vector = prediction.imageEmbedding ?? [];
  } else {
    vector = prediction.videoEmbeddings?.[0]?.embedding ?? [];
  }

  const preview =
    input.type === 'text'
      ? (input.text ?? '').slice(0, 60)
      : `${input.type}:${(input.content ?? '').slice(0, 20)}`;

  return {
    vector,
    dimensions: vector.length,
    inputType: input.type,
    inputPreview: preview,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Compute cosine similarity between two Creative DNA vectors.
 * Returns 0–1 (1 = identical style, 0 = completely opposite).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`[CreativeDNA] Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Find the top-K most similar embeddings from a corpus.
 */
export function topKSimilar(
  query: number[],
  corpus: Array<{ id: string; vector: number[] }>,
  k = 5
): Array<{ id: string; score: number }> {
  const scored = corpus.map(({ id, vector }) => ({
    id,
    score: cosineSimilarity(query, vector),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
