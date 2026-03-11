import * as os from 'os';

export interface SieveResult {
    startRange: number;
    endRange: number;
    counterExampleFound: boolean;
    counterExample?: number;
    executionTimeMs: number;
}

/**
 * Runs a high-performance bare-metal CPU sieve over a range of numbers
 * to search for a Collatz Conjecture counter-example.
 * 
 * Performance:
 * - Uses bitwise operations for extreme speed (n & 1, n >> 1)
 * - Will purposefully saturate CPUS so throttle running it via dispatch constraints
 * 
 * The Collatz Conjecture states that for any positive integer n:
 * - If n is even, divide by 2
 * - If n is odd, multiply by 3 and add 1
 * - The sequence will always reach 1
 */
export function runCollatzSieve(startRange: number, endRange: number): SieveResult {
    const startTime = Date.now();
    let counterExampleFound = false;
    let counterExample: number | undefined;

    // Use BigInt because we are spanning past 2^68
    const start = BigInt(startRange);
    const end = BigInt(endRange);
    
    // Cache constants to avoid recreation inside the hot loop
    const ZERO = 0n;
    const ONE = 1n;
    const THREE = 3n;

    for (let current = start; current < end; current += ONE) {
        let n = current;
        
        // Safety valve: prevent actual infinite loops if a counter-example exists
        let steps = 0;
        const maxSteps = 100000; 

        while (n > ONE && steps < maxSteps) {
            // (n & 1n) === 0n is marginally faster than n % 2n === 0n
            if ((n & ONE) === ZERO) {
                // n is even -> n / 2
                n = n >> ONE;
            } else {
                // n is odd -> 3n + 1
                n = (THREE * n) + ONE;
            }
            steps++;
        }

        if (steps >= maxSteps) {
            counterExampleFound = true;
            counterExample = Number(current);
            break;
        }
    }

    return {
        startRange,
        endRange,
        counterExampleFound,
        counterExample,
        executionTimeMs: Date.now() - startTime
    };
}
