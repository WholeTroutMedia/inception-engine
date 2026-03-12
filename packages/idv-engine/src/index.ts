/**
 * @cle/idv-engine — Hybrid Identity Verification Engine
 * Processes guest intake and returns risk-based decisions.
 */

export interface IDVIntakeInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  socialLink?: string;
  referredBy?: string;
  selfieImage?: string;
}

export interface IDVResult {
  status: 'APPROVED' | 'REQUIRES_IDV';
  riskScore?: number;
  sessionData?: {
    applicantId: string;
    sdkToken: string;
  };
}

/**
 * Process guest intake through the Hybrid IDV Engine.
 * Returns APPROVED for low-risk guests, REQUIRES_IDV for higher risk.
 */
export async function processGuestIntake(input: IDVIntakeInput): Promise<IDVResult> {
  // Stub implementation: approve known referrals, require IDV for others
  const hasReferral = Boolean(input.referredBy?.trim());
  const hasSelfie = Boolean(input.selfieImage?.trim());

  if (hasReferral && hasSelfie) {
    return {
      status: 'APPROVED',
      riskScore: 15,
    };
  }

  if (hasReferral) {
    return {
      status: 'APPROVED',
      riskScore: 35,
    };
  }

  return {
    status: 'REQUIRES_IDV',
    riskScore: 72,
    sessionData: {
      applicantId: `app_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      sdkToken: `sdk_${Math.random().toString(36).slice(2, 24)}`,
    },
  };
}
