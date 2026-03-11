/**
 * @module design-ingest/framer
 * @description Framer React Component Extractor using unframer
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export class FramerExtractor {
    /**
     * Extracts a component from a Framer project URL.
     * Uses `npx unframer` to download and parse the React code.
     * 
     * @param url The Framer canvas URL
     * @param outDir The absolute path where the component should be saved
     * @returns The path to the extracted component directory
     */
    async extract(url: string, outDir: string): Promise<{ success: boolean; outPath: string; error?: string }> {
        try {
            // Ensure the output directory exists
            if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });
            }

            console.error(`[FRAMER-EXTRACTOR] Executing: npx unframer ${url} --outDir ${outDir}`);

            // We use npx unframer as per the Phase 1 spec
            const { stdout, stderr } = await execAsync(`npx unframer "${url}" --outDir "${outDir}"`);

            console.error(`[FRAMER-EXTRACTOR] Unframer stdout: ${stdout}`);
            if (stderr) {
                console.error(`[FRAMER-EXTRACTOR] Unframer stderr: ${stderr}`);
            }

            return {
                success: true,
                outPath: outDir
            };
        } catch (error: any) {
            console.error(`[FRAMER-EXTRACTOR] Failed to extract component: ${error.message}`);
            return {
                success: false,
                outPath: outDir,
                error: error.message
            };
        }
    }
}
