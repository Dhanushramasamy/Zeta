import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/linear';

export async function GET() {
    try {
        const users = await getUsers();
        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
