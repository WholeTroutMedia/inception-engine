import { z } from 'genkit';
import { memoryBus } from './bus.js';

export const CompetencyProfileSchema = z.object({
    workerId: z.string(),
    skill: z.string(),
    confidenceScore: z.number().min(0).max(100),
    lastAssessed: z.string().describe("ISO timestamp"),
    decayRateDays: z.number().default(30).describe("Days until skill decays significantly"),
});

export type CompetencyProfile = z.infer<typeof CompetencyProfileSchema>;

export class CompetencyTracker {
    
    constructor() {}

    /**
     * Record a new skill assessment.
     */
    assessSkill(workerId: string, skill: string, score: number, decayRateDays: number = 30) {
        const profile: CompetencyProfile = {
            workerId,
            skill,
            confidenceScore: score,
            lastAssessed: new Date().toISOString(),
            decayRateDays
        };
        
        // Log to memory bus
        memoryBus.logCompetencyEvent('SKILL_ASSESSED', profile);
        return profile;
    }

    /**
     * Calculate current confidence based on decay.
     */
    calculateDecay(profile: CompetencyProfile): number {
        const lastAssessedDate = new Date(profile.lastAssessed);
        const now = new Date();
        const daysSince = (now.getTime() - lastAssessedDate.getTime()) / (1000 * 3600 * 24);
        
        if (daysSince <= 0) return profile.confidenceScore;
        
        // Simple linear decay for now
        const decayFactor = Math.max(0, 1 - (daysSince / profile.decayRateDays));
        return Math.round(profile.confidenceScore * decayFactor);
    }

    /**
     * Check profile for decay and trigger warnings if necessary.
     */
    checkDecay(profile: CompetencyProfile, threshold: number = 50) {
        const currentScore = this.calculateDecay(profile);
        if (currentScore < threshold) {
            memoryBus.logCompetencyEvent('SKILL_DECAY_WARNING', {
                workerId: profile.workerId,
                skill: profile.skill,
                currentScore,
                originalScore: profile.confidenceScore,
                lastAssessed: profile.lastAssessed
            });
            return true;
        }
        return false;
    }

    generateReport(workerId: string, profiles: CompetencyProfile[]) {
        memoryBus.logCompetencyEvent('COMPETENCY_REPORT_READY', {
            workerId,
            skillsCount: profiles.length,
            generatedAt: new Date().toISOString(),
        });
    }
}

export const competencyTracker = new CompetencyTracker();
