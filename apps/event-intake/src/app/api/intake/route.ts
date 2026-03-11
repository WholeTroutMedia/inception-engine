import { NextResponse } from 'next/server';
import { processGuestIntake } from '@inception/idv-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Server-side validation
    if (!body.firstName || !body.email || !body.phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Process via the Hybrid IDV Engine
    const result = await processGuestIntake({
      firstName: body.firstName,
      lastName: body.lastName || '',
      email: body.email,
      phone: body.phone,
      socialLink: body.socialLink,
      referredBy: body.referredBy,
      selfieImage: body.selfieImage,
    });

    // In production, save base64 selfieImage to S3/Bucket here.

    // Return the decision to the client
    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('IDV Intake Error:', error);
    return NextResponse.json({ error: 'Internal server error during intake processing' }, { status: 500 });
  }
}
