'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, RefreshCw, Edit2, X, Send, ChevronDown, ChevronUp, MessageSquare, ArrowLeft, Flame } from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import WorkflowModals from '@/components/WorkflowModals';

interface SuggestedAction {
    id: string;
    type: 'comment' | 'create_issue' | 'update_status';
    issueIdentifier?: string;
    title?: string;
    description?: string;
    reasoning: string;
    project?: string;
    issueDetails?: {
        title: string;
        state: { name: string };
        url: string;
        project?: { name: string };
        dueDate?: string;
        description?: string;
        priority?: number;
        priorityLabel?: string;
        labels?: { name: string }[];
        comments?: { body: string; user?: { name: string } }[];
    };
}

export default function LinearPage() {
    const [notes, setNotes] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());
    const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
    const [executionResults, setExecutionResults] = useState<{ status: string; error?: string; action: SuggestedAction }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [workflowModal, setWorkflowModal] = useState<'weekly' | 'daily' | null>(null);

    const [refiningId, setRefiningId] = useState<string | null>(null);
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [editMode, setEditMode] = useState<'ai' | 'manual'>('ai');
    const [manualEditContent, setManualEditContent] = useState('');

    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Project selection state
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);

    // Fetch projects on mount
    useEffect(() => {
        const fetchProjects = async () => {
            setIsLoadingProjects(true);
            try {
                const res = await fetch('/api/projects');
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data.projects || []);
                }
            } catch (err) {
                console.error('Failed to fetch projects:', err);
            } finally {
                setIsLoadingProjects(false);
            }
        };
        fetchProjects();
    }, []);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);
        setSuggestions([]);
        setExecutionResults([]);

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes,
                    projectId: selectedProjectId || undefined
                }),
            });

            if (!res.ok) throw new Error('Failed to analyze notes');

            const data = await res.json();
            const suggestionsWithIds = data.suggestions.map((s: Omit<SuggestedAction, 'id'>) => ({
                ...s,
                id: Math.random().toString(36).substr(2, 9),
            }));
            setSuggestions(suggestionsWithIds);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRefine = async (action: SuggestedAction) => {
        if (!refinementPrompt.trim()) return;
        setIsRefining(true);
        try {
            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suggestion: action,
                    userPrompt: refinementPrompt,
                    issueContext: action.issueDetails
                }),
            });

            if (!res.ok) throw new Error('Failed to refine suggestion');
            const data = await res.json();

            setSuggestions(prev => prev.map(s => s.id === action.id ? { ...data.suggestion, id: action.id, issueDetails: action.issueDetails } : s));
            setRefiningId(null);
            setRefinementPrompt('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred during refinement');
        } finally {
            setIsRefining(false);
        }
    };

    const handleManualSave = (action: SuggestedAction) => {
        setSuggestions(prev => prev.map(s =>
            s.id === action.id
                ? { ...s, description: manualEditContent }
                : s
        ));
        setRefiningId(null);
        setManualEditContent('');
    };

    const handleExecute = async (action: SuggestedAction) => {
        setExecutingIds(prev => new Set(prev).add(action.id));
        setError(null);

        try {
            const res = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions: [action] }),
            });

            if (!res.ok) throw new Error('Failed to execute action');

            const data = await res.json();
            setExecutionResults(prev => [...prev, ...data.results]);
            setSuggestions(prev => prev.filter((s) => s.id !== action.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setExecutingIds(prev => {
                const next = new Set(prev);
                next.delete(action.id);
                return next;
            });
        }
    };

    const handleExecuteAll = async () => {
        const allIds = suggestions.map(s => s.id);
        setExecutingIds(new Set(allIds));

        try {
            const res = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions: suggestions }),
            });

            if (!res.ok) throw new Error('Failed to execute actions');

            const data = await res.json();
            setExecutionResults(prev => [...prev, ...data.results]);
            setSuggestions([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setExecutingIds(new Set());
        }
    };

    return (
        <div className="min-h-screen bg-[#F2F4F8] text-gray-900 font-sans p-6 selection:bg-orange-200">
            {/* Background Decorative */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-100/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px]" />
            </div>

            <div className="flex gap-8 relative z-10 h-[calc(100vh-48px)]">
                <Sidebar onWorkflowOpen={(type) => setWorkflowModal(type)} />

                <main className="flex-1 flex flex-col min-w-0 pr-4 overflow-y-auto">

                    <header className="mb-8">
                        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-orange-500 mb-4 transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Back to ZETA
                        </Link>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Linear Assistant</h1>
                        <p className="text-gray-500 font-medium">Turn your daily notes into Linear updates automatically.</p>
                    </header>

                    <div className="space-y-8 max-w-4xl">

                        {/* Input Section */}
                        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-6">

                            {/* Project Select */}
                            <div>
                                <label htmlFor="project-select" className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                                    Select Project
                                </label>
                                <select
                                    id="project-select"
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    disabled={isLoadingProjects}
                                    className="w-full rounded-2xl bg-gray-50 border border-gray-100 text-gray-900 font-medium p-4 focus:ring-2 focus:ring-orange-100 outline-none transition-all disabled:opacity-50"
                                >
                                    <option value="">All Projects</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.name}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                                {selectedProjectId && (
                                    <p className="mt-2 text-xs text-orange-500 font-bold ml-1">
                                        🎯 Focusing on: {selectedProjectId}
                                    </p>
                                )}
                            </div>

                            {/* Notes Input */}
                            <div>
                                <label htmlFor="notes" className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                                    Daily Notes
                                </label>
                                <textarea
                                    id="notes"
                                    rows={6}
                                    className="w-full rounded-2xl bg-gray-50 border border-gray-100 text-gray-900 font-medium p-4 focus:ring-2 focus:ring-orange-100 outline-none transition-all placeholder:text-gray-400"
                                    placeholder="e.g., Fixed the login bug (LIN-123), started working on the new dashboard..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || !notes.trim()}
                                    className="inline-flex items-center px-8 py-4 bg-orange-500 text-white font-bold rounded-full shadow-lg shadow-orange-500/20 hover:bg-orange-600 hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="-ml-1 mr-2 h-5 w-5" />
                                            Analyze Updates
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-2xl bg-red-50 border border-red-100 p-6 flex items-start gap-4">
                                <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                                <div>
                                    <h3 className="text-sm font-bold text-red-800">Error</h3>
                                    <p className="mt-1 text-sm text-red-600 font-medium">{error}</p>
                                </div>
                            </div>
                        )}

                        {suggestions.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h2 className="text-2xl font-bold text-gray-900">Suggested Updates</h2>
                                    <button
                                        onClick={handleExecuteAll}
                                        disabled={executingIds.size > 0}
                                        className="text-sm font-bold text-orange-500 hover:text-orange-600 bg-orange-50 px-4 py-2 rounded-full transition-colors disabled:opacity-50"
                                    >
                                        Apply All
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {suggestions.map((action) => (
                                        <div key={action.id} className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all group">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-2 flex-1 mr-6">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${action.type === 'create_issue' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'
                                                            }`}>
                                                            {action.type === 'create_issue' ? 'Create Issue' : 'Comment / Update'}
                                                        </span>
                                                        {action.issueIdentifier && (
                                                            <span className="text-sm font-mono text-gray-500 font-bold bg-gray-50 px-2 py-0.5 rounded-lg">{action.issueIdentifier}</span>
                                                        )}
                                                        {action.project && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-600">
                                                                {action.project}
                                                            </span>
                                                        )}
                                                        {action.issueDetails?.dueDate && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-600">
                                                                Due: {action.issueDetails.dueDate}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {action.issueDetails && (
                                                        <div className="text-sm text-gray-500 font-medium flex items-center gap-2">
                                                            <span className="text-gray-900">{action.issueDetails.title}</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                            <span>{action.issueDetails.state.name}</span>
                                                        </div>
                                                    )}

                                                    {action.title && <h3 className="font-bold text-gray-900">{action.title}</h3>}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (refiningId === action.id) {
                                                                setRefiningId(null);
                                                                setRefinementPrompt('');
                                                            } else {
                                                                setRefiningId(action.id);
                                                                setRefinementPrompt('');
                                                            }
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-orange-500 rounded-full hover:bg-orange-50 transition-colors"
                                                        title="Refine"
                                                    >
                                                        {refiningId === action.id ? <X className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleExecute(action)}
                                                        disabled={executingIds.has(action.id)}
                                                        className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded-xl shadow-sm text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-all"
                                                    >
                                                        {executingIds.has(action.id) ? (
                                                            <Loader2 className="animate-spin h-4 w-4" />
                                                        ) : (
                                                            'Apply'
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {refiningId === action.id ? (
                                                <div className="mt-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-3">
                                                    <div className="flex gap-2 mb-2 p-1 bg-white rounded-xl border border-gray-100 w-fit">
                                                        <button
                                                            onClick={() => {
                                                                setEditMode('ai');
                                                                setManualEditContent('');
                                                            }}
                                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${editMode === 'ai'
                                                                ? 'bg-orange-500 text-white shadow-sm'
                                                                : 'text-gray-500 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            🤖 AI Refine
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditMode('manual');
                                                                setManualEditContent(action.description || '');
                                                                setRefinementPrompt('');
                                                            }}
                                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${editMode === 'manual'
                                                                ? 'bg-orange-500 text-white shadow-sm'
                                                                : 'text-gray-500 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            ✏️ Manual Edit
                                                        </button>
                                                    </div>

                                                    {editMode === 'ai' ? (
                                                        <div className="flex gap-3">
                                                            <input
                                                                type="text"
                                                                value={refinementPrompt}
                                                                onChange={(e) => setRefinementPrompt(e.target.value)}
                                                                placeholder="e.g., Add more details..."
                                                                className="flex-1 text-sm rounded-xl bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500 p-3"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        handleRefine(action);
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => handleRefine(action)}
                                                                disabled={isRefining || !refinementPrompt.trim()}
                                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl shadow-sm text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
                                                            >
                                                                {isRefining ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <textarea
                                                                value={manualEditContent}
                                                                onChange={(e) => setManualEditContent(e.target.value)}
                                                                rows={4}
                                                                className="w-full text-sm rounded-xl bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500 p-3"
                                                                placeholder="Edit Description..."
                                                            />
                                                            <div className="flex gap-2 justify-end">
                                                                <button
                                                                    onClick={() => handleManualSave(action)}
                                                                    disabled={!manualEditContent.trim()}
                                                                    className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
                                                                >
                                                                    Save
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-600 leading-relaxed font-medium">
                                                    {action.description}
                                                </div>
                                            )}

                                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                                <p className="text-xs text-gray-400 font-medium italic">Reasoning: {action.reasoning}</p>

                                                {action.issueDetails && (
                                                    <button
                                                        onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
                                                        className="flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
                                                    >
                                                        {expandedId === action.id ? (
                                                            <>
                                                                <ChevronUp className="h-4 w-4" />
                                                                Less Info
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronDown className="h-4 w-4" />
                                                                More Info
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {expandedId === action.id && action.issueDetails && (
                                                <div className="mt-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4 animate-in slide-in-from-top-2">
                                                    {action.issueDetails.description && (
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Description</h4>
                                                            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{action.issueDetails.description}</p>
                                                        </div>
                                                    )}

                                                    {action.issueDetails.comments && action.issueDetails.comments.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                                                                <MessageSquare className="h-3 w-3" />
                                                                Recent Comments
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {action.issueDetails.comments.map((comment, idx) => (
                                                                    <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="text-xs font-bold text-gray-900">{comment.user?.name || 'Unknown'}</span>
                                                                        </div>
                                                                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{comment.body}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <a
                                                        href={action.issueDetails.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-gray-900 hover:text-orange-500 transition-colors"
                                                    >
                                                        Open in Linear →
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {executionResults.length > 0 && (
                            <div className="bg-gray-900 rounded-[24px] p-6 text-white shadow-lg shadow-gray-900/10">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold">Execution Results</h2>
                                    <button
                                        onClick={() => setExecutionResults([])}
                                        className="text-xs font-bold text-gray-400 hover:text-white transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {executionResults.map((res, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                            {res.status === 'success' ? (
                                                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                                            ) : (
                                                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                                            )}
                                            <div>
                                                <p className="text-sm font-bold">
                                                    {res.status === 'success' ? 'Success' : 'Failed'}
                                                </p>
                                                {res.error && <p className="text-xs text-red-300 mt-1">{res.error}</p>}
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {res.action.type} {res.action.issueIdentifier ? `on ${res.action.issueIdentifier}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="h-20" /> {/* Spacer */}
                </main>

                <WorkflowModals
                    type={workflowModal}
                    onClose={() => setWorkflowModal(null)}
                    onSuccess={(msg) => alert(msg)}
                />
            </div>
        </div>
    );
}
