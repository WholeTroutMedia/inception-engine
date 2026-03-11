/**
 * @inception/finance-agent — VERA Guardian
 * Constitutional compliance layer for all financial operations.
 * Every DeFi action must pass VERA before execution. Article IX.
 */

export interface VeraGuardianResult {
    approved: boolean;
    reason?: string;
    auditTrail: string[];
}

export interface FinancialAction {
    type: 'swap' | 'transfer' | 'stake' | 'unstake' | 'burn';
    amountSol: number;
    targetAddress?: string;
    notes?: string;
}

export class VeraGuardian {
    private readonly blockedManeuvers = ['burn', 'unstake'];

    async evaluate(action: FinancialAction): Promise<VeraGuardianResult> {
        const trail: string[] = [];

        if (this.blockedManeuvers.includes(action.type)) {
            trail.push(`[BLOCK] Action type '${action.type}' requires elevated VERA approval`);
            return { approved: false, reason: `'${action.type}' is constitutionally gated`, auditTrail: trail };
        }

        if (action.amountSol <= 0) {
            trail.push('[BLOCK] Non-positive amount rejected');
            return { approved: false, reason: 'Amount must be positive', auditTrail: trail };
        }

        trail.push(`[APPROVED] ${action.type} ${action.amountSol} SOL — constitutional check passed`);
        return { approved: true, auditTrail: trail };
    }
}

export const veraGuardian = new VeraGuardian();
