import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const webhookSecret = Deno.env.get('LINEAR_WEBHOOK_SECRET') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper to verify Linear signature
async function verifySignature(signature: string, body: string, secret: string): Promise<boolean> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )
    const signatureBytes = hexToUint8Array(signature)
    const bodyBytes = encoder.encode(body)
    const signed = await crypto.subtle.sign('HMAC', key, bodyBytes)
    const signedBytes = new Uint8Array(signed)

    if (signatureBytes.length !== signedBytes.length) return false
    return signatureBytes.every((byte, i) => byte === signedBytes[i])
}

function hexToUint8Array(hex: string): Uint8Array {
    return new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)))
}

Deno.serve(async (req) => {
    try {
        const signature = req.headers.get('Linear-Signature')
        const bodyText = await req.text()

        // 1. Verify Webhook Secret (if set)
        if (webhookSecret && signature) {
            const isValid = await verifySignature(signature, bodyText, webhookSecret)
            if (!isValid) {
                console.error('Invalid Webhook Signature')
                return new Response(JSON.stringify({ error: 'Invalid Signature' }), { status: 401 })
            }
        }

        const payload = JSON.parse(bodyText)
        const { action, type, data } = payload

        console.log(`Received Linear Webhook: ${type} ${action}`)

        if (type === 'Issue') {
            // 2. Filter: Only process issues assigned to "Dhanush"
            // We check if assignee exists and name contains "Dhanush" (case-insensitive)
            const assigneeName = data.assignee ? data.assignee.name : ''
            if (!assigneeName.toLowerCase().includes('dhanush')) {
                console.log(`Skipping issue assigned to: ${assigneeName} (Not Dhanush)`)
                return new Response(JSON.stringify({ message: 'Skipped: Not assigned to Dhanush' }), { status: 200 })
            }

            if (action === 'create' || action === 'update') {
                // Upsert Issue
                const { error } = await supabase
                    .from('linear_issues')
                    .upsert({
                        id: data.id,
                        identifier: data.identifier,
                        title: data.title,
                        description: data.description,
                        state: data.state.name,
                        priority: data.priority,
                        priority_label: data.priorityLabel,
                        assignee_id: data.assigneeId,
                        assignee_name: data.assignee ? data.assignee.name : null,
                        project_name: data.project ? data.project.name : null,
                        team_name: data.team ? data.team.name : null,
                        labels: data.labels ? data.labels.map((l: any) => l.name) : [],
                        due_date: data.dueDate,
                        created_at: data.createdAt,
                        updated_at: data.updatedAt,
                        url: data.url,
                    })

                if (error) {
                    console.error('Error upserting issue:', error)
                    throw error
                }
            } else if (action === 'remove') {
                // Delete Issue
                const { error } = await supabase
                    .from('linear_issues')
                    .delete()
                    .eq('id', data.id)

                if (error) {
                    console.error('Error deleting issue:', error)
                    throw error
                }
            }
        } else if (type === 'Comment') {
            // First, check if the issue exists in our database
            // (We only store issues assigned to Dhanush, so comments for other issues should be skipped)
            const { data: issueExists } = await supabase
                .from('linear_issues')
                .select('id')
                .eq('id', data.issueId)
                .single()

            if (!issueExists) {
                console.log(`Skipping comment for issue ${data.issueId} (Issue not in database)`)
                return new Response(JSON.stringify({ message: 'Skipped: Issue not in database' }), { status: 200 })
            }

            if (action === 'create' || action === 'update') {
                // Upsert Comment (handles both create and update)
                const { error } = await supabase
                    .from('linear_comments')
                    .upsert({
                        id: data.id,
                        issue_id: data.issueId,
                        body: data.body,
                        user_name: data.user ? data.user.name : 'Unknown',
                        created_at: data.createdAt
                    })

                if (error) {
                    console.error('Error upserting comment:', error)
                    throw error
                }
            } else if (action === 'remove') {
                // Delete Comment
                const { error } = await supabase
                    .from('linear_comments')
                    .delete()
                    .eq('id', data.id)

                if (error) {
                    console.error('Error deleting comment:', error)
                    throw error
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Error processing webhook:', error)
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
