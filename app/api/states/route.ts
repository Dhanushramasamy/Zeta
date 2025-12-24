import { NextResponse } from 'next/server';
import { LinearClient } from '@linear/sdk';

const linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY,
});

export async function GET() {
    try {
        // Get all workflow states from all teams the user is part of
        const me = await linearClient.viewer;
        const teams = await me.teams();

        const allStates: { id: string; name: string; color: string; type: string }[] = [];
        const seenNames = new Set<string>();

        for (const team of teams.nodes) {
            const states = await team.states();
            for (const state of states.nodes) {
                // Avoid duplicates by name
                if (!seenNames.has(state.name)) {
                    seenNames.add(state.name);
                    allStates.push({
                        id: state.id,
                        name: state.name,
                        color: state.color,
                        type: state.type
                    });
                }
            }
        }

        // Sort by type order: backlog, unstarted, started, completed, canceled
        const typeOrder: Record<string, number> = {
            'backlog': 0,
            'unstarted': 1,
            'started': 2,
            'completed': 3,
            'canceled': 4
        };

        allStates.sort((a, b) => {
            const orderA = typeOrder[a.type] ?? 5;
            const orderB = typeOrder[b.type] ?? 5;
            return orderA - orderB;
        });

        return NextResponse.json({ states: allStates });
    } catch (error) {
        console.error('Error fetching workflow states:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
