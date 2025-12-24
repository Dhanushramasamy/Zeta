
import { useState } from 'react';
import { Loader2, CheckCircle, X, Calendar, Edit3, Link as LinkIcon, Briefcase } from 'lucide-react';

interface WorkflowModalsProps {
    type: 'weekly' | 'daily' | null;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

export default function WorkflowModals({ type, onClose, onSuccess }: WorkflowModalsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [client, setClient] = useState('Divank');
    const [plan, setPlan] = useState('');
    const [completed, setCompleted] = useState('');
    const [devTickets, setDevTickets] = useState('');

    const handleCreateWeekly = async () => {
        setIsLoading(true);
        try {
            const weekStart = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const res = await fetch('/api/workflows/create-weekly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientName: client, weekStart }),
            });
            const data = await res.json();
            if (data.success) {
                onSuccess(`Weekly ticket created for ${client}: ${data.issue?.identifier}`);
                onClose();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to create weekly ticket');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDailyUpdate = async () => {
        setIsLoading(true);
        try {
            // Parse dev tickets from string (comma or space separated)
            const devTicketIds = devTickets.split(/[\s,]+/).filter(id => id.match(/[A-Z]+-\d+/));

            const res = await fetch('/api/workflows/daily-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientName: client,
                    plan,
                    completed,
                    devTicketIds
                }),
            });
            const data = await res.json();
            if (data.success) {
                onSuccess(`Daily update posted to ${data.statusTicketIdentifier} and related tickets.`);
                onClose();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to post daily update');
        } finally {
            setIsLoading(false);
        }
    };

    if (!type) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white border border-gray-100 rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        {type === 'weekly' ? (
                            <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-pink-600" />
                            </div>
                        ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Edit3 className="h-5 w-5 text-blue-600" />
                            </div>
                        )}
                        {type === 'weekly' ? 'Start New Week' : 'Daily Update'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-700">Select Client</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['Divank', 'Insight-Ally', 'Acolyte'].map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setClient(c)}
                                    className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${client === c
                                        ? 'bg-pink-50 border-pink-200 text-pink-700 shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    {type === 'weekly' ? (
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                            <p className="text-sm text-blue-800 font-medium leading-relaxed">
                                This will create a new <span className="font-bold underline">Status Update</span> ticket for <span className="font-bold">{client}</span> using the standard template.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-700">Completed Yesterday/Today</label>
                                <textarea
                                    value={completed}
                                    onChange={(e) => setCompleted(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none h-28 transition-all font-medium"
                                    placeholder="- Fixed bug X..."
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-700">Plan for Today</label>
                                <textarea
                                    value={plan}
                                    onChange={(e) => setPlan(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none h-28 transition-all font-medium"
                                    placeholder="- Start working on feature Y..."
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4 text-gray-400" />
                                    Related Dev Tickets (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={devTickets}
                                    onChange={(e) => setDevTickets(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                                    placeholder="LIN-123, LIN-456"
                                />
                                <p className="text-xs text-gray-500 font-medium ml-1">I'll post a comment on these tickets linking them to this update.</p>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-8 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={type === 'weekly' ? handleCreateWeekly : handleDailyUpdate}
                        disabled={isLoading}
                        className={`px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all flex items-center gap-2 transform active:scale-95 ${type === 'weekly'
                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-pink-500/20'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-cyan-500/20'
                            }`}
                    >
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {type === 'weekly' ? 'Create Ticket' : 'Post Update'}
                    </button>
                </div>
            </div>
        </div>
    );
}
