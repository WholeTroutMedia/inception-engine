/**
 * ERC-2981 Royalty Engine
 * Pure TypeScript royalty split calculations.
 * No wallet / contract calls in Phase 1 — pure business logic.
 * Phase 2: write splits to ERC-2981-compliant contract via ethers.js
 * T-IECR-BC-002
 */

// ── Types ─────────────────────────────────────────────────────────

export interface RoyaltySplit {
    recipient: string;  // wallet address or identifier
    basisPoints: number; // out of 10,000 (e.g. 500 = 5%)
    role: "creator" | "platform" | "collaborator" | "royalty_pool";
}

export interface RoyaltyEngine {
    assetId: string;
    splits: RoyaltySplit[];
    totalBasisPoints: number; // must sum to ≤ 10000
}

export interface RoyaltyPayment {
    assetId: string;
    salePrice: bigint; // in smallest currency unit (wei / lamports / cents)
    currency: string;
    payments: Array<{
        recipient: string;
        amount: bigint;
        role: string;
    }>;
    platformFee: bigint;
    creatorShare: bigint;
}

// ── Default IE Splits ─────────────────────────────────────────────

/** Creative Liberation Engine default royalty structure */
export const IE_DEFAULT_SPLITS = {
    CREATOR: 8000,    // 80% — artist always wins
    PLATFORM: 1000,   // 10% — IE Platform (Article 0: Sacred Mission)
    ROYALTY_POOL: 500, // 5% — community royalty pool
    COLLABORATORS: 500, // 5% — split among collaborators
} as const;

// ── Engine ────────────────────────────────────────────────────────

export function createRoyaltyEngine(params: {
    assetId: string;
    creatorAddress: string;
    collaborators?: Array<{ address: string; share: number }>; // share in basisPoints
    platformAddress?: string;
    customSplits?: RoyaltySplit[];
}): RoyaltyEngine {
    const { assetId, creatorAddress, collaborators = [], platformAddress } = params;

    if (params.customSplits) {
        const total = params.customSplits.reduce((sum, s) => sum + s.basisPoints, 0);
        if (total > 10000) throw new Error(`Royalty splits exceed 10000 basis points: ${total}`);
        return { assetId, splits: params.customSplits, totalBasisPoints: total };
    }

    const collabTotal = collaborators.reduce((sum, c) => sum + c.share, 0);
    if (collabTotal > IE_DEFAULT_SPLITS.COLLABORATORS) {
        throw new Error(`Collaborator shares exceed maximum ${IE_DEFAULT_SPLITS.COLLABORATORS} basis points`);
    }

    const splits: RoyaltySplit[] = [
        {
            recipient: creatorAddress,
            basisPoints: IE_DEFAULT_SPLITS.CREATOR,
            role: "creator",
        },
        {
            recipient: platformAddress ?? "ie:platform",
            basisPoints: IE_DEFAULT_SPLITS.PLATFORM,
            role: "platform",
        },
        {
            recipient: "ie:royalty-pool",
            basisPoints: IE_DEFAULT_SPLITS.ROYALTY_POOL,
            role: "royalty_pool",
        },
        ...collaborators.map(c => ({
            recipient: c.address,
            basisPoints: c.share,
            role: "collaborator" as const,
        })),
    ];

    const totalBasisPoints = splits.reduce((sum, s) => sum + s.basisPoints, 0);

    return { assetId, splits, totalBasisPoints };
}

export function calculateRoyaltyPayments(
    engine: RoyaltyEngine,
    salePrice: bigint,
    currency: string
): RoyaltyPayment {
    const payments = engine.splits.map(split => ({
        recipient: split.recipient,
        amount: (salePrice * BigInt(split.basisPoints)) / BigInt(10000),
        role: split.role,
    }));

    const creatorPayment = payments.find(p => p.role === "creator");
    const platformPayment = payments.find(p => p.role === "platform");

    return {
        assetId: engine.assetId,
        salePrice,
        currency,
        payments,
        platformFee: platformPayment?.amount ?? 0n,
        creatorShare: creatorPayment?.amount ?? 0n,
    };
}

/** ERC-2981 royaltyInfo() output — primarySale only */
export function erc2981RoyaltyInfo(
    engine: RoyaltyEngine,
    salePrice: bigint
): { receiver: string; royaltyAmount: bigint } {
    // ERC-2981 sends all royalties to a single receiver; use creator
    const creator = engine.splits.find(s => s.role === "creator");
    if (!creator) throw new Error("No creator split found");

    return {
        receiver: creator.recipient,
        royaltyAmount: (salePrice * BigInt(creator.basisPoints)) / BigInt(10000),
    };
}
