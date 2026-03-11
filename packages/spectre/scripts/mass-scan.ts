import { z } from 'zod';

const TARGET_ENDPOINTS = [
    { name: 'CloudMesh Dashboard', url: 'http://localhost:5173/cloud-mesh' },
    { name: 'Console Main', url: 'http://localhost:5173' },
    { name: 'EON Research Ambassador', url: 'http://localhost:5174' } // Assuming Vite runs the outreach site here
];

async function runMassScan() {
    console.log('================================================');
    console.log('[SPECTRE] Initiating Global Visual Audit...');
    console.log('================================================');
    
    const results = [];

    for (const target of TARGET_ENDPOINTS) {
        console.log(`\n-> Scanning [${target.name}] at ${target.url}`);
        
        try {
            // Ping the SPECTRE local agent created in Wave 38
            const response = await fetch('http://localhost:6000/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: target.url,
                    changedComponent: 'Global Layout'
                })
            });

            if (!response.ok) {
                console.warn(`[SPECTRE] Failed to connect to port 6000. Is the QA agent running?`);
                continue;
            }

            const data = await response.json();
            
            results.push({
                target: target.name,
                url: target.url,
                status: data.status,
                reasoning: data.reasoning
            });

            console.log(`   Result: ${data.status}`);
            console.log(`   Reasoning: ${data.reasoning.substring(0, 100)}...`);
            
        } catch (error) {
            console.error(`   [Error] Could not audit ${target.name}:`, error instanceof Error ? error.message : error);
        }
    }

    console.log('\n================================================');
    console.log('[SPECTRE] Audit Complete. Generating Report...');
    
    // Format Markdown Report
    const reportMd = `# SPECTRE Visual Audit Report\n*Generated: ${new Date().toISOString()}*\n\n` + 
        results.map(r => `## ${r.target}\n- **URL:** ${r.url}\n- **Status:** **${r.status}**\n- **Analysis:** ${r.reasoning}\n`).join('\n---\n');
    
    // Use dynamic import for fs to write the file in ESM
    const { writeFileSync } = await import('fs');
    writeFileSync('visual-audit-report.md', reportMd, 'utf-8');
    
    console.log('[SPECTRE] Report saved to visual-audit-report.md');
}

runMassScan().catch(console.error);
