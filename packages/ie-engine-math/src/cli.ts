#!/usr/bin/env node

import { runCollatzSieve } from './collatz-sieve.js';

const args = process.argv.slice(2);
const startArg = args.find(a => a.startsWith('--start='));
const endArg = args.find(a => a.startsWith('--end='));

if (!startArg || !endArg) {
    console.error('Usage: npx @inception/ie-engine-math --start=<number> --end=<number>');
    process.exit(1);
}

const start = parseInt(startArg.split('=')[1], 10);
const end = parseInt(endArg.split('=')[1], 10);

console.log(`[ie-engine-math] Starting Collatz Sieve from ${start} to ${end}...`);
const result = runCollatzSieve(start, end);

if (result.counterExampleFound) {
    console.log(`\n🚨 MATHERMATICAL ANOMALY DETECTED 🚨`);
    console.log(`Counter-example found at: ${result.counterExample}`);
} else {
    console.log(`\n✅ Range verified cleanly in ${result.executionTimeMs}ms`);
}

// Print a JSON payload at the very end so an agent or orchestrator can parse the structured output
console.log('\n---RESULT---');
console.log(JSON.stringify(result));
