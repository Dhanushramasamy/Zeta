'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, RefreshCw, Edit2, X, Send, ChevronDown, ChevronUp, MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">
                <header className="space-y-2 relative">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        Back to ZETA
                    </Link>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        Linear Assistant
                    </h1>
                    <p className="text-lg text-gray-400">Turn your daily notes into Linear updates automatically.</p>
                </header>

                {/* Project Selection */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <label htmlFor="project-select" className="block text-sm font-medium text-gray-300 mb-2">
                        Select Project
                    </label>
                    <select
                        id="project-select"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        disabled={isLoadingProjects}
                        className="w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm p-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="" className="bg-slate-900">All Projects</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.name} className="bg-slate-900">
                                {project.name}
                            </option>
                        ))}
                    </select>
                    {selectedProjectId && (
                        <p className="mt-2 text-xs text-cyan-400">
                            🎯 Analysis will focus on: <span className="font-semibold">{selectedProjectId}</span>
                        </p>
                    )}
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 space-y-4">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-300">
                        Daily Notes
                    </label>
                    <textarea
                        id="notes"
                        rows={6}
                        className="w-full rounded-lg bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm p-3 border"
                        placeholder="e.g., Fixed the login bug (LIN-123), started working on the new dashboard..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !notes.trim()}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
                                    Analyze Updates
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-300">Error</h3>
                                <div className="mt-2 text-sm text-red-200">
                                    <p>{error}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {suggestions.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">Suggested Updates</h2>
                            <button
                                onClick={handleExecuteAll}
                                disabled={executingIds.size > 0}
                                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                            >
                                Apply All
                            </button>
                        </div>
                        <div className="space-y-3">
                            {suggestions.map((action) => (
                                <div key={action.id} className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 shadow-sm flex flex-col gap-3 transition-all hover:border-cyan-500/30">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1 flex-1 mr-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${action.type === 'create_issue' ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'
                                                    }`}>
                                                    {action.type === 'create_issue' ? 'Create Issue' : 'Comment / Update'}
                                                </span>
                                                {action.issueIdentifier && (
                                                    <span className="text-sm font-mono text-cyan-400 font-bold">{action.issueIdentifier}</span>
                                                )}
                                                {action.project && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                                        {action.project}
                                                    </span>
                                                )}
                                                {action.issueDetails?.project && !action.project && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-gray-300">
                                                        {action.issueDetails.project.name}
                                                    </span>
                                                )}
                                                {action.issueDetails?.dueDate && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-300">
                                                        Due: {action.issueDetails.dueDate}
                                                    </span>
                                                )}
                                            </div>
                                            {action.issueDetails && (
                                                <div className="text-sm text-gray-400">
                                                    <span className="font-medium text-white">{action.issueDetails.title}</span>
                                                    <span className="mx-2 text-gray-600">|</span>
                                                    <span className="text-gray-400">{action.issueDetails.state.name}</span>
                                                </div>
                                            )}
                                            {action.title && <h3 className="font-medium text-white">{action.title}</h3>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {action.issueDetails?.url && (
                                                <a
                                                    href={action.issueDetails.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-gray-400 hover:text-cyan-400 rounded-full hover:bg-cyan-500/10 transition-colors"
                                                    title="Open in Linear"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            )}
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
                                                className="p-1.5 text-gray-400 hover:text-cyan-400 rounded-full hover:bg-cyan-500/10 transition-colors"
                                                title="Refine this suggestion"
                                            >
                                                {refiningId === action.id ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleExecute(action)}
                                                disabled={executingIds.has(action.id)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {executingIds.has(action.id) ? (
                                                    <Loader2 className="animate-spin h-3 w-3" />
                                                ) : (
                                                    'Apply'
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {refiningId === action.id ? (
                                        <div className="mt-2 p-3 bg-cyan-500/10 rounded-md border border-cyan-500/20 space-y-2">
                                            <div className="flex gap-2 mb-2">
                                                <button
                                                    onClick={() => {
                                                        setEditMode('ai');
                                                        setManualEditContent('');
                                                    }}
                                                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${editMode === 'ai'
                                                        ? 'bg-cyan-600 text-white'
                                                        : 'bg-white/5 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/10'
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
                                                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${editMode === 'manual'
                                                        ? 'bg-cyan-600 text-white'
                                                        : 'bg-white/5 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/10'
                                                        }`}
                                                >
                                                    ✏️ Manual Edit
                                                </button>
                                            </div>

                                            {editMode === 'ai' ? (
                                                <div>
                                                    <label className="block text-xs font-medium text-cyan-300 mb-1">
                                                        Tell AI how to refine this
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={refinementPrompt}
                                                            onChange={(e) => setRefinementPrompt(e.target.value)}
                                                            placeholder="e.g., Add more details about the API, tag @bob..."
                                                            className="flex-1 text-sm rounded-md bg-white/5 border-cyan-500/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500"
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
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
                                                        >
                                                            {isRefining ? <Loader2 className="animate-spin h-3 w-3" /> : <Send className="h-3 w-3" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="block text-xs font-medium text-cyan-300 mb-1">
                                                        Edit description directly
                                                    </label>
                                                    <div className="space-y-2">
                                                        <textarea
                                                            value={manualEditContent}
                                                            onChange={(e) => setManualEditContent(e.target.value)}
                                                            rows={4}
                                                            className="w-full text-sm rounded-md bg-white/5 border-cyan-500/20 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500"
                                                            placeholder="Edit the description..."
                                                        />
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => {
                                                                    setRefiningId(null);
                                                                    setManualEditContent('');
                                                                }}
                                                                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-300"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handleManualSave(action)}
                                                                disabled={!manualEditContent.trim()}
                                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
                                                            >
                                                                Save Changes
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-300 text-sm bg-white/5 p-2 rounded border border-white/10">
                                            {action.description}
                                        </p>
                                    )}

                                    <p className="text-xs text-gray-500 italic">Reasoning: {action.reasoning}</p>

                                    {action.issueDetails && (
                                        <div className="border-t border-white/10 pt-3 mt-2">
                                            <button
                                                onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
                                                className="flex items-center gap-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                                            >
                                                {expandedId === action.id ? (
                                                    <>
                                                        <ChevronUp className="h-4 w-4" />
                                                        Hide Details
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="h-4 w-4" />
                                                        View Full Issue Details
                                                    </>
                                                )}
                                            </button>

                                            {expandedId === action.id && (
                                                <div className="mt-3 p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
                                                    {action.issueDetails.description && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-300 mb-1">Description</h4>
                                                            <p className="text-sm text-gray-400 whitespace-pre-wrap">{action.issueDetails.description}</p>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-4 flex-wrap">
                                                        {action.issueDetails.priorityLabel && (
                                                            <div>
                                                                <h4 className="text-xs font-semibold text-gray-300 mb-1">Priority</h4>
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${action.issueDetails.priority === 1 ? 'bg-red-500/20 text-red-300' :
                                                                    action.issueDetails.priority === 2 ? 'bg-orange-500/20 text-orange-300' :
                                                                        action.issueDetails.priority === 3 ? 'bg-yellow-500/20 text-yellow-300' :
                                                                            'bg-gray-500/20 text-gray-300'
                                                                    }`}>
                                                                    {action.issueDetails.priorityLabel}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {action.issueDetails.labels && action.issueDetails.labels.length > 0 && (
                                                            <div>
                                                                <h4 className="text-xs font-semibold text-gray-300 mb-1">Labels</h4>
                                                                <div className="flex gap-1 flex-wrap">
                                                                    {action.issueDetails.labels.map((label, idx) => (
                                                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                                                                            {label.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {action.issueDetails.comments && action.issueDetails.comments.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1">
                                                                <MessageSquare className="h-3 w-3" />
                                                                Recent Comments ({action.issueDetails.comments.length})
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {action.issueDetails.comments.map((comment, idx) => (
                                                                    <div key={idx} className="bg-white/5 p-2 rounded border border-white/10">
                                                                        <p className="text-xs font-medium text-gray-300 mb-1">
                                                                            {comment.user?.name || 'Unknown'}
                                                                        </p>
                                                                        <p className="text-xs text-gray-400 whitespace-pre-wrap">{comment.body}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <a
                                                        href={action.issueDetails.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center text-xs font-medium text-cyan-400 hover:text-cyan-300"
                                                    >
                                                        Open in Linear →
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {executionResults.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-white">Execution Results</h2>
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 divide-y divide-white/10">
                            {executionResults.map((res, idx) => (
                                <div key={idx} className="p-4 flex items-start gap-3">
                                    {res.status === 'success' ? (
                                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {res.status === 'success' ? 'Successfully updated' : 'Failed to update'}
                                        </p>
                                        {res.error && <p className="text-sm text-red-300">{res.error}</p>}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {res.action.type} {res.action.issueIdentifier ? `on ${res.action.issueIdentifier} ` : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setExecutionResults([])}
                            className="text-sm text-cyan-400 hover:text-cyan-300"
                        >
                            Clear Results
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
