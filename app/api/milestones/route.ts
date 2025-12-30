import { NextResponse } from 'next/server';
import { getMilestones } from '@/lib/linear';

export async function GET() {
    try {
        const milestones = await getMilestones();
        return NextResponse.json({ milestones });
    } catch (error) {
        console.error('Error fetching milestones:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


