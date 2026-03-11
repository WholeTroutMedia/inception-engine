/**
 * Cloud Mesh — AWS Lambda Adapter
 * Routes tasks to an AWS Lambda Function URL (no SDK — pure HTTPS POST).
 * @package cloud-mesh
 */

import type { CloudTarget } from '../types.js';

export interface AwsAdapterConfig {
  functionUrl: string;
  region: string;
  /** AWS API key or IAM token for the function URL (if auth enabled) */
  authToken?: string;
}

export function buildAwsTarget(config: AwsAdapterConfig): CloudTarget {
  return {
    id: `aws-${config.region}`,
    provider: 'aws',
    endpoint: config.functionUrl,
    region: config.region,
    costPerInvocationUSD: 0.0000002,  // Lambda: $0.20 per 1M requests = $0.0000002/req
    avgLatencyMs: 150,
    maxConcurrent: 10_000,            // Lambda default concurrency
    healthCheckUrl: `${config.functionUrl}?action=health`,
    authToken: config.authToken,
    sovereign: false,
  };
}
