#!/usr/bin/env node
/**
 * Design Ingest MCP Server
 *
 * Brokers the Design Ingestion Pipeline: Framer, Mobbin, and Vision based RAG.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { FramerExtractor } from './framer.js';
import { MobbinExtractor } from './mobbin.js';
import { VisionExtractor } from './vision.js';
import path from 'path';

const framerExtractor = new FramerExtractor();
const mobbinExtractor = new MobbinExtractor();
const visionExtractor = new VisionExtractor();

const server = new Server(
  { name: 'inception-design-ingest', version: '1.0.0-genesis' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'design.extract_framer',
      description: 'Extracts living parameterized React code from a live Framer component URL using unframer.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The Framer canvas URL' },
          targetComponent: { type: 'string', description: 'The specific component name to extract' }
        },
        required: ['url', 'targetComponent']
      },
    },
    {
      name: 'design.extract_mobbin',
      description: 'Pulls structured pattern hierarchies and spacing metrics from the Mobbin API.',
      inputSchema: {
          type: 'object',
          properties: {
              patternCategory: { type: 'string', description: 'E.g., "onboarding", "paywall"' }
          },
          required: ['patternCategory']
      }
    },
    {
      name: 'design.vision_reconstruct',
      description: 'Navigates Comet to a target URL, analyzes visual hierarchy natively, and stubs out skeletal React code.',
      inputSchema: {
          type: 'object',
          properties: {
              url: { type: 'string', description: 'Target URL to reverse engineer' }
          },
          required: ['url']
      }
    }
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'design.extract_framer': {
      const { url, targetComponent } = args as Record<string, string>;
      const outDir = path.resolve('..', '..', 'apps', 'console', 'src', 'components', 'framer', targetComponent);
      
      // Fire and forget since extraction might take a bit, but for MCP we'll await it to provide feedback
      try {
          const result = await framerExtractor.extract(url, outDir);
          
          if (result.success) {
               return {
                  content: [{
                      type: 'text',
                      text: JSON.stringify({
                          status: 'extraction_complete',
                          vector: 'framer',
                          url,
                          targetComponent,
                          savedTo: result.outPath,
                          message: 'Component successfully extracted and saved to Component Registry directory. You should now register this in apps/console/src/registry/components.ts'
                      })
                  }]
              };
          } else {
              return {
                  content: [{ type: 'text', text: `Extraction failed: ${result.error}` }],
                  isError: true
              };
          }
      } catch (err: any) {
           return {
               content: [{ type: 'text', text: `Extraction error: ${err.message}` }],
               isError: true
           };
      }
    }
    case 'design.extract_mobbin': {
        const { patternCategory } = args as Record<string, string>;
        try {
            const result = await mobbinExtractor.extract(patternCategory);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        status: result.success ? 'extraction_complete' : 'extraction_failed',
                        vector: 'mobbin',
                        patternCategory,
                        patterns: result.patterns,
                        error: result.error,
                        message: 'Mobbin pattern library queried.'
                    })
                }]
            };
        } catch (err: any) {
            return { content: [{ type: 'text', text: `Extraction error: ${err.message}` }], isError: true };
        }
    }
    case 'design.vision_reconstruct': {
        const { url } = args as Record<string, string>;
        const componentName = url.replace(/[^a-zA-Z0-9]/g, '');
        const outDir = path.resolve('..', '..', 'apps', 'console', 'src', 'components', 'vision', componentName);
        
        try {
            const result = await visionExtractor.reconstruct(url, outDir);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        status: result.success ? 'extraction_complete' : 'extraction_failed',
                        vector: 'vision',
                        url,
                        savedTo: result.outPath,
                        error: result.error,
                        message: 'Comet session initiated for spatial/visual capture. Skeletal React code generated.'
                    })
                }]
            };
        } catch (err: any) {
            return { content: [{ type: 'text', text: `Extraction error: ${err.message}` }], isError: true };
        }
    }
    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[DESIGN-INGEST] MCP Bridge online');
}

main().catch(console.error);
