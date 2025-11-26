import { NextResponse } from 'next/server';
import { getTeams } from '@/lib/linear';

export async function GET() {
    try {
        const teams = await getTeams();
        return NextResponse.json({ teams });
    } catch (error) {
        console.error('Error fetching teams:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
