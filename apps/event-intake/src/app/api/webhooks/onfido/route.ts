import { NextResponse } from 'next/server';
import crypto from 'crypto';

const ONFIDO_WEBHOOK_SECRET = process.env.ONFIDO_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
  try {
    const bodyStr = await req.text();
    const signature = req.headers.get('x-sha256-signature');

    // 1. Verify Webhook Signature (Enterprise Security Standard)
    if (ONFIDO_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', ONFIDO_WEBHOOK_SECRET)
        .update(bodyStr)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('[Onfido Webhook] Invalid signature mismatch');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const event = JSON.parse(bodyStr);

    // 2. Handle the Verification Request Event
    if (event.payload?.resource_type === 'check') {
      const checkId = event.payload.object.id;
      const status = event.payload.object.status; // 'complete' or 'in_progress'
      const result = event.payload.object.result; // 'clear', 'consider', 'suspected'
      
      console.log(`[Onfido Webhook] Check ${checkId} status: ${status}, result: ${result}`);

      // 3. Database Update
      // In production:
      // await prisma.iDVSession.update({ where: { checkId: checkId }, data: { status: result === 'clear' ? 'CLEARED' : 'CONSIDER' }})
      // await prisma.guest.update(...)
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
