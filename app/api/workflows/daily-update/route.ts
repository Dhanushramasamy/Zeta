import { NextResponse } from 'next/server';
import { processDailyUpdate } from '@/lib/workflows';

export async function POST(request: Request) {
    try {
        const { clientName, plan, completed, devTicketIds } = await request.json();

        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const statusTicket = await processDailyUpdate(clientName, today, plan, completed, devTicketIds);

        return NextResponse.json({ success: true, statusTicketIdentifier: statusTicket.identifier });

    } catch (error) {
        console.error('Error processing daily update:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
