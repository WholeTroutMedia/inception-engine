/**
 * Creative DNA — Public API
 * Creative Liberation Engine v5.0.0 (GENESIS)
 */

export {
  generateEmbedding,
  cosineSimilarity,
  topKSimilar,
  type EmbeddingInput,
  type EmbeddingResult,
  type EmbeddingClientConfig,
} from './embeddings.js';

export {
  storeEmbedding,
  getEntityEmbeddings,
  setVectorStore,
  getVectorStore,
  InMemoryVectorStore,
  type StoredVector,
  type EntityType,
  type VectorStoreAdapter,
} from './vector-store.js';
