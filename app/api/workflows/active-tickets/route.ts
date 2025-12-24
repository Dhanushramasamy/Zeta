
import { NextResponse } from 'next/server';
import { getActiveStatusTicket } from '@/lib/workflows';

export async function GET() {
    try {
        const clients = ['Divank', 'Insight-Ally', 'Acolyte'];
        const results = await Promise.all(clients.map(async (client) => {
            try {
                const ticket = await getActiveStatusTicket(client);
                if (!ticket) return { client, ticket: null };

                return {
                    client,
                    ticket: {
                        identifier: ticket.identifier,
                        title: ticket.title,
                        url: ticket.url,
                        state: (await ticket.state)?.name
                    }
                };
            } catch (e) {
                console.error(`Error fetching ticket for ${client}:`, e);
                return { client, ticket: null, error: 'Failed to fetch' };
            }
        }));

        return NextResponse.json({ tickets: results });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
