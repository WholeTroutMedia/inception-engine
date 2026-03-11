import { describe, it, expect } from 'vitest';
import { runCollatzSieve } from './collatz-sieve.js';

describe('Collatz Sieve', () => {
    it('should correctly process a known secure range without finding counter-examples', () => {
        // Range 1 to 1000 is known to resolve to 1
        const result = runCollatzSieve(1, 1000);
        
        expect(result.startRange).toBe(1);
        expect(result.endRange).toBe(1000);
        expect(result.counterExampleFound).toBe(false);
        expect(result.counterExample).toBeUndefined();
        expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should be fast on large chunks', () => {
        // 1 million numbers
        const result = runCollatzSieve(1000000, 2000000);
        
        expect(result.counterExampleFound).toBe(false);
        // It should complete very quickly on bare-metal node
        expect(result.executionTimeMs).toBeLessThan(3000);
    });
});
