import { useState } from 'react';
import { Loader2, X } from 'lucide-react';

interface WorkflowModalsProps {
    type: 'weekly' | null;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

export default function WorkflowModals({ type, onClose, onSuccess }: WorkflowModalsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [client, setClient] = useState('Divank');

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

    if (type !== 'weekly') return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white border border-gray-100 rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 relative flex items-center justify-center">
                            <img
                                src="/zeta.png"
                                alt="Zeta"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        Start New Week
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

                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <p className="text-sm text-blue-800 font-medium leading-relaxed">
                            This will create a new <span className="font-bold underline">Status Update</span> ticket for <span className="font-bold">{client}</span> using the standard template.
                        </p>
                    </div>
                </div>

                <div className="p-8 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateWeekly}
                        disabled={isLoading}
                        className="px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all flex items-center gap-2 transform active:scale-95 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-pink-500/20"
                    >
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Create Ticket
                    </button>
                </div>
            </div>
        </div>
    );
}
