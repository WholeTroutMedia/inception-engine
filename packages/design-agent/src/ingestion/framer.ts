import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function ingestFramerComponent(url: string, outputDir: string) {
    console.log(`Starting Framer ingestion from ${url}`);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Run unframer
    try {
        console.log('Running unframer CLI...');
        // Note: This expects unframer to be installed globally or via npx
        execSync(`npx unframer "${url}" --outDir "${outputDir}"`, { stdio: 'inherit' });
        console.log(`Successfully ingested Framer component to ${outputDir}`);
        
        // Phase 2: Add design token extraction logic here
        // e.g. parsing the generated files and creating design token yaml/json
    } catch (error) {
        console.error('Failed to ingest Framer component:', error);
        throw error;
    }
}

// Simple CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: tsx framer.ts <url> <output-dir>');
        process.exit(1);
    }
    const [url, outputDir] = args;
    ingestFramerComponent(url, outputDir).catch(() => process.exit(1));
}
