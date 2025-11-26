import { NextResponse } from 'next/server';
import { getLabels } from '@/lib/linear';

export async function GET() {
    try {
        const labels = await getLabels();
        return NextResponse.json({ labels });
    } catch (error) {
        console.error('Error fetching labels:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
