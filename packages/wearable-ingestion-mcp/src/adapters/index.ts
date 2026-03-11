/**
 * Adapter Registry
 *
 * All WearableAdapters registered here are available to the ingestion pipeline.
 * Add new adapters here to extend device support.
 */

import { SandbarStreamAdapter } from './sandbar.js';
import { OuraAdapter } from './oura.js';
import type { WearableAdapter, WearableSource } from '../types.js';

const adapters = new Map<WearableSource, WearableAdapter>([
  ['sandbar_stream', SandbarStreamAdapter],
  ['oura', OuraAdapter],
]);

export function getAdapter(source: WearableSource): WearableAdapter | undefined {
  return adapters.get(source);
}

export function listAdapters(): WearableAdapter[] {
  return [...adapters.values()];
}

export { SandbarStreamAdapter, OuraAdapter };
