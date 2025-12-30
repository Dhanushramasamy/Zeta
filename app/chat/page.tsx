'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, ArrowLeft, Eye, ExternalLink, X, MessageSquare, Hash, Search, AlertCircle, CheckCircle2, Clock, ClipboardList, Check } from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';

interface ToolCall {
    id: string;
    function: {
        name: string;
        arguments: string;
    };
}

interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content?: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

type ChatMode = 'general' | 'create_issue' | 'update_issue' | 'issue_qa' | 'status_update';

interface Issue {
    id: string;
    identifier: string;
    title: string;
    project_name?: string;
    state?: string;
}

interface Project {
    id: string;
    name: string;
}

interface Label {
    id: string;
    name: string;
    color?: string;
}

interface WorkflowState {
    id: string;
    name: string;
    type?: string;
}

interface Milestone {
    id: string;
    name: string;
    targetDate?: string;
}

// Hover Card Component
function IssueHoverCard({ identifier, onClick }: { identifier: string; onClick: () => void }) {
    const [issue, setIssue] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    // Remove timeoutRef if unused or use it for debounce
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (!issue && !loading) {
            setLoading(true);
            fetch('/api/issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier }),
            })
                .then(res => res.json())
                .then(data => {
                    setIssue(data.issue);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <span
            className="relative inline-block align-baseline"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="inline-flex items-center gap-1 mx-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg px-2 py-0.5 border border-orange-200 transition-colors font-mono text-sm font-bold cursor-pointer"
            >
                {identifier}
            </button>

            {/* Popover Card */}
            {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-in zoom-in-95 duration-200 pointer-events-none">
                    {loading ? (
                        <div className="flex items-center justify-center py-4 text-orange-500">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    ) : issue ? (
                        <div className="space-y-3 text-left">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{issue.identifier}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${issue.state?.name === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                                        issue.state?.name === 'Done' ? 'bg-green-50 text-green-600' :
                                            'bg-gray-50 text-gray-600'
                                        }`}>
                                        {issue.state?.name || 'Unknown'}
                                    </span>
                                </div>
                                {issue.priorityLabel && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                        <AlertCircle className="h-3 w-3" />
                                        {issue.priorityLabel}
                                    </div>
                                )}
                            </div>

                            {/* Title */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{issue.title}</h4>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{issue.description || 'No description preview.'}</p>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center gap-3 text-xs text-gray-400 pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {issue.assignee?.name || 'Unassigned'}
                                </div>
                                {issue.project?.name && (
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                        {issue.project.name}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-xs text-gray-400 py-2">
                            Issue details not found.
                        </div>
                    )}

                    {/* Arrow */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-gray-100 rotate-45 transform" />
                </div>
            )}
        </span>
    );
}

export default function ChatPage() {
    const [chatMode, setChatMode] = useState<ChatMode>('general');
    const [threads, setThreads] = useState<Record<ChatMode, Message[]>>({
        general: [],
        create_issue: [],
        update_issue: [],
        issue_qa: [],
        status_update: [],
    });
    const messages = threads[chatMode];
    const setMessages = (updater: (prev: Message[]) => Message[]) => {
        setThreads((prev) => ({
            ...prev,
            [chatMode]: updater(prev[chatMode]),
        }));
    };
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const clientDateStr = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    // Issue Details Modal State
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingIssueId, setLoadingIssueId] = useState<string | null>(null);

    // Issue Selector State
    const [availableIssues, setAvailableIssues] = useState<Issue[]>([]);
    const [showIssueSelect, setShowIssueSelect] = useState(false);
    const [issueSearch, setIssueSearch] = useState('');

    // Status Update Mode (derived from chatMode)
    const statusUpdateMode = chatMode === 'status_update';

    // Create Issue metadata
    const [projects, setProjects] = useState<Project[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [states, setStates] = useState<WorkflowState[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);

    // Draft values per create_issue tool call id
    const [createIssueDrafts, setCreateIssueDrafts] = useState<Record<string, any>>({});

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch issues for selector
    useEffect(() => {
        const fetchIssues = async () => {
            try {
                // Fetch issues assigned to Dhanush or mentioned
                const res = await fetch('/api/tickets/search?assigneeName=Dhanush');
                const data = await res.json();
                if (data.issues) {
                    setAvailableIssues(data.issues);
                }
            } catch (e) {
                console.error("Failed to fetch issues for selector", e);
            }
        };
        fetchIssues();
    }, []);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [pRes, lRes, sRes, mRes] = await Promise.all([
                    fetch('/api/projects'),
                    fetch('/api/labels'),
                    fetch('/api/states'),
                    fetch('/api/milestones'),
                ]);
                const [pData, lData, sData, mData] = await Promise.all([
                    pRes.json(),
                    lRes.json(),
                    sRes.json(),
                    mRes.json(),
                ]);
                setProjects(pData.projects || []);
                setLabels(lData.labels || []);
                setStates(sData.states || []);
                setMilestones(mData.milestones || []);
            } catch (e) {
                console.error('Failed to fetch create issue metadata', e);
            }
        };
        fetchMeta();
    }, []);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages: [...messages, userMessage],
                    statusUpdateMode,
                    clientDateStr,
                    chatMode,
                }),
            });

            if (!res.ok) throw new Error('Failed to send message');

            const data = await res.json();
            setMessages((prev) => [...prev, data.message]);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToolConfirmation = async (toolCall: ToolCall) => {
        const args = JSON.parse(toolCall.function.arguments);
        let type: 'comment' | 'create_issue' | 'create_sub_issue' | 'update_status' | 'log_daily_work' | 'find_issue' | 'update_status_ticket' = 'comment';

        if (toolCall.function.name === 'create_issue') type = 'create_issue';
        else if (toolCall.function.name === 'create_sub_issue') type = 'create_sub_issue';
        else if (toolCall.function.name === 'update_issue_status') type = 'update_status';
        else if (toolCall.function.name === 'log_daily_work') type = 'log_daily_work';
        else if (toolCall.function.name === 'find_issue') type = 'find_issue';
        else if (toolCall.function.name === 'update_status_ticket') type = 'update_status_ticket';

        const action: any = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            reasoning: 'User requested via Chat',
        };

        if (type === 'update_status_ticket') {
            action.statusTicketId = args.statusTicketId;
            action.logType = args.logType; // 'planned' or 'completed'
            action.items = args.items; // Array of items to add
            action.workTickets = args.workTickets; // Referenced work tickets
            action.targetDate = clientDateStr; // Use user's local date, not server date
        } else if (type === 'log_daily_work') {
            action.description = args.description;
            action.clientName = args.clientName;
            action.logType = args.logType || 'completed'; // Default to 'completed'
            action.issueIdentifier = args.issueId;
            action.issueTitle = args.newIssueTitle;
        } else if (type === 'find_issue') {
            action.query = args.query;
            action.project = args.project;
        } else if (type === 'create_sub_issue') {
            // Map sub-issue creation arguments
            action.parentIssueId = args.parentIssueId;
            action.title = args.title;
            action.description = args.description;
            action.initialState = args.initialState || 'In Progress';
        } else {
            // Existing mappings (comment, create_issue, update_status)
            action.issueIdentifier = args.issueId;
            action.title = args.title;
            action.description = args.description || args.body;
            action.stateId = args.stateId;
        }

        // Merge draft fields for create_issue
        if (type === 'create_issue') {
            const draft = createIssueDrafts[toolCall.id] || {};
            action.title = args.title;
            action.description = args.description;
            action.teamId = args.teamId || draft.teamId;
            action.stateId = draft.stateId || args.stateId;
            action.projectId = draft.projectId || args.projectId;
            action.priority = typeof draft.priority === 'number' ? draft.priority : args.priority;
            action.milestoneId = draft.milestoneId || args.milestoneId;
            action.dueDate = draft.dueDate || args.dueDate;
            action.labelIds = draft.labelIds || args.labelIds;

            // Enforce required fields for your workflow
            const missing: string[] = [];
            if (!action.stateId) missing.push('Status');
            if (!action.projectId) missing.push('Project');
            if (!action.priority) missing.push('Priority');
            if (!action.milestoneId) missing.push('Milestone');
            if (!action.dueDate) missing.push('Due date');
            if (!action.labelIds || action.labelIds.length === 0) missing.push('Labels');
            if (missing.length) {
                alert(`Please select: ${missing.join(', ')}`);
                return;
            }
        }

        try {
            const res = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions: [action] }),
            });

            if (!res.ok) throw new Error('Failed to execute action');

            const data = await res.json();
            const resultData = data.results && data.results[0] ? data.results[0] : { status: 'unknown' };

            const toolMessage: Message = {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(resultData)
            };
            setMessages(prev => [...prev, toolMessage]);

            setIsLoading(true);
            try {
                // Fetch follow-up from AI
                const followUpRes = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: [...messages, toolMessage], statusUpdateMode, clientDateStr, chatMode }),
                });
                const followUpData = await followUpRes.json();
                if (followUpData.message) {
                    setMessages(prev => [...prev, followUpData.message]);
                }
            } catch (e) {
                console.error("Error getting follow-up", e);
            } finally {
                setIsLoading(false);
            }

        } catch (error) {
            console.error('Execution failed', error);
            const errorMessage: Message = {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const handleViewIssue = async (identifier: string) => {
        setLoadingIssueId(identifier);
        try {
            const res = await fetch('/api/issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier }),
            });
            const data = await res.json();
            if (data.issue) {
                setSelectedIssue(data.issue);
                setIsModalOpen(true);
            } else {
                // Fallback if not found (maybe just open link?)
                window.open(`https://linear.app/issue/${identifier}`, '_blank');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingIssueId(null);
        }
    };

    // Helper to convert issue identifiers to clickable links with buttons
    const renderMessageWithLinks = (content: string) => {
        const issuePattern = /\b([A-Z]+[A-Z0-9]*-\d+)\b/g;
        const parts = content.split(issuePattern);

        return parts.map((part, idx) => {
            if (part.match(issuePattern)) {
                return (
                    <IssueHoverCard
                        key={idx}
                        identifier={part}
                        onClick={() => handleViewIssue(part)}
                    />
                );
            }
            return <span key={idx}>{part}</span>;
        });
    };

    // Filter available issues for selector
    const filteredIssues = availableIssues.filter(i =>
        i.title.toLowerCase().includes(issueSearch.toLowerCase()) ||
        i.identifier.toLowerCase().includes(issueSearch.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F2F4F8] text-gray-900 font-sans p-6 selection:bg-orange-200">
            {/* Background Decorative */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-100/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px]" />
            </div>

            <div className="flex gap-8 relative z-10 h-[calc(100vh-48px)]">
                <Sidebar />

                <main className="flex-1 flex flex-col min-w-0 pr-4 bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden relative">

                    {/* Chat Header */}
                    <header className="px-8 py-6 flex items-center gap-4 border-b border-gray-100 bg-white/80 backdrop-blur-md z-10">
                        <div className="w-12 h-12 relative flex items-center justify-center">
                            <img
                                src="/zeta.png"
                                alt="Zeta"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">ZETA Chat</h1>
                            <div className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Online Assistant
                            </div>
                        </div>

                        {/* Case Tabs */}
                        <div className="ml-auto flex items-center gap-2">
                            {([
                                { id: 'general', label: 'General' },
                                { id: 'create_issue', label: 'Create Issue' },
                                { id: 'update_issue', label: 'Update Issue' },
                                { id: 'issue_qa', label: 'Ask about Issue' },
                                { id: 'status_update', label: 'Status Update' },
                            ] as { id: ChatMode; label: string }[]).map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setChatMode(t.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                        chatMode === t.id
                                            ? 'bg-gray-900 text-white border-gray-900'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </header>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/50">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-400 mt-20">
                                <div className="w-16 h-16 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-6">
                                    <Bot className="h-8 w-8 text-orange-500 opacity-50" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome Back, Dhanush!</h3>
                                <p className="text-gray-500">I'm ready to help you track issues, log work, and stay organized.</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role !== 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0 mt-1">
                                        <Bot className="h-4 w-4 text-orange-500" />
                                    </div>
                                )}

                                <div className={`max-w-[80%] rounded-3xl px-6 py-4 shadow-sm ${msg.role === 'user'
                                    ? 'bg-gray-900 text-white rounded-br-none'
                                    : msg.role === 'tool'
                                        ? 'bg-green-50 border border-green-100 text-green-800'
                                        : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none'
                                    }`}>
                                    {msg.content && <div className="whitespace-pre-wrap leading-relaxed loading-relaxed text-sm">{renderMessageWithLinks(msg.content)}</div>}

                                    {msg.tool_calls && (
                                        <div className="mt-4 space-y-3">
                                            {msg.tool_calls.map((tool, toolIdx) => {
                                                const args = JSON.parse(tool.function.arguments);
                                                const actionName = tool.function.name;
                                                
                                                // Friendly action descriptions
                                                const getActionDescription = () => {
                                                    switch (actionName) {
                                                        case 'update_status_ticket':
                                                            return `Update ${args.statusTicketId} with ${args.logType} items`;
                                                        case 'log_daily_work':
                                                            return `Log ${args.logType} work for ${args.issueId}`;
                                                        case 'create_issue':
                                                            return `Create issue: ${args.title}`;
                                                        case 'create_sub_issue':
                                                            return `Create sub-issue under ${args.parentIssueId}`;
                                                        case 'post_comment':
                                                            return `Comment on ${args.issueId}`;
                                                        case 'update_issue_status':
                                                            return `Change ${args.issueId} to ${args.stateId}`;
                                                        case 'find_issue':
                                                            return `Search for: ${args.query}`;
                                                        default:
                                                            return actionName.replace(/_/g, ' ');
                                                    }
                                                };

                                                const getActionIcon = () => {
                                                    switch (actionName) {
                                                        case 'update_status_ticket':
                                                            return <ClipboardList className="h-4 w-4" />;
                                                        case 'create_issue':
                                                        case 'create_sub_issue':
                                                            return <MessageSquare className="h-4 w-4" />;
                                                        default:
                                                            return <Check className="h-4 w-4" />;
                                                    }
                                                };

                                                return (
                                                    <div key={toolIdx} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-200 text-sm shadow-sm">
                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                                                    {getActionIcon()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-gray-900 text-sm">{getActionDescription()}</p>
                                                                    <p className="text-xs text-gray-400 capitalize">{actionName.replace(/_/g, ' ')}</p>
                                                                </div>
                                                            </div>
                                                            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0 mt-2" />
                                                        </div>
                                                        
                                                        {/* Show key details based on action type */}
                                                        {args.description && (
                                                            <div className="bg-gray-100/50 p-3 rounded-xl mb-3 text-gray-600 text-xs line-clamp-3">
                                                                {args.description}
                                                            </div>
                                                        )}

                                                        {/* Create Issue Selectors */}
                                                        {actionName === 'create_issue' && (
                                                            <div className="space-y-3 mb-3">
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <div className="text-[11px] font-bold text-gray-500 mb-1">Status</div>
                                                                        <select
                                                                            className="w-full text-xs rounded-xl border border-gray-200 bg-white px-3 py-2"
                                                                            value={createIssueDrafts[tool.id]?.stateId || ''}
                                                                            onChange={(e) =>
                                                                                setCreateIssueDrafts((prev) => ({
                                                                                    ...prev,
                                                                                    [tool.id]: { ...(prev[tool.id] || {}), stateId: e.target.value },
                                                                                }))
                                                                            }
                                                                        >
                                                                            <option value="">Select status…</option>
                                                                            {states.map((s) => (
                                                                                <option key={s.id} value={s.id}>
                                                                                    {s.name}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[11px] font-bold text-gray-500 mb-1">Project</div>
                                                                        <select
                                                                            className="w-full text-xs rounded-xl border border-gray-200 bg-white px-3 py-2"
                                                                            value={createIssueDrafts[tool.id]?.projectId || ''}
                                                                            onChange={(e) =>
                                                                                setCreateIssueDrafts((prev) => ({
                                                                                    ...prev,
                                                                                    [tool.id]: { ...(prev[tool.id] || {}), projectId: e.target.value },
                                                                                }))
                                                                            }
                                                                        >
                                                                            <option value="">Select project…</option>
                                                                            {projects.map((p) => (
                                                                                <option key={p.id} value={p.id}>
                                                                                    {p.name}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <div className="text-[11px] font-bold text-gray-500 mb-1">Priority</div>
                                                                        <select
                                                                            className="w-full text-xs rounded-xl border border-gray-200 bg-white px-3 py-2"
                                                                            value={createIssueDrafts[tool.id]?.priority ?? ''}
                                                                            onChange={(e) =>
                                                                                setCreateIssueDrafts((prev) => ({
                                                                                    ...prev,
                                                                                    [tool.id]: {
                                                                                        ...(prev[tool.id] || {}),
                                                                                        priority: e.target.value ? Number(e.target.value) : undefined,
                                                                                    },
                                                                                }))
                                                                            }
                                                                        >
                                                                            <option value="">Select priority…</option>
                                                                            <option value="1">Urgent</option>
                                                                            <option value="2">High</option>
                                                                            <option value="3">Medium</option>
                                                                            <option value="4">Low</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[11px] font-bold text-gray-500 mb-1">Milestone</div>
                                                                        <select
                                                                            className="w-full text-xs rounded-xl border border-gray-200 bg-white px-3 py-2"
                                                                            value={createIssueDrafts[tool.id]?.milestoneId || ''}
                                                                            onChange={(e) =>
                                                                                setCreateIssueDrafts((prev) => ({
                                                                                    ...prev,
                                                                                    [tool.id]: { ...(prev[tool.id] || {}), milestoneId: e.target.value },
                                                                                }))
                                                                            }
                                                                        >
                                                                            <option value="">Select milestone…</option>
                                                                            {milestones.map((m) => (
                                                                                <option key={m.id} value={m.id}>
                                                                                    {m.name}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <div className="text-[11px] font-bold text-gray-500 mb-1">Due date</div>
                                                                        <input
                                                                            type="date"
                                                                            className="w-full text-xs rounded-xl border border-gray-200 bg-white px-3 py-2"
                                                                            value={createIssueDrafts[tool.id]?.dueDate || ''}
                                                                            onChange={(e) =>
                                                                                setCreateIssueDrafts((prev) => ({
                                                                                    ...prev,
                                                                                    [tool.id]: { ...(prev[tool.id] || {}), dueDate: e.target.value },
                                                                                }))
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[11px] font-bold text-gray-500 mb-1">Labels</div>
                                                                        <select
                                                                            multiple
                                                                            className="w-full text-xs rounded-xl border border-gray-200 bg-white px-3 py-2 h-[40px]"
                                                                            value={createIssueDrafts[tool.id]?.labelIds || []}
                                                                            onChange={(e) => {
                                                                                const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                                                                                setCreateIssueDrafts((prev) => ({
                                                                                    ...prev,
                                                                                    [tool.id]: { ...(prev[tool.id] || {}), labelIds: selected },
                                                                                }));
                                                                            }}
                                                                        >
                                                                            {labels.map((l) => (
                                                                                <option key={l.id} value={l.id}>
                                                                                    {l.name}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                    </div>
                                                    </div>
                                                        )}
                                                        
                                                    <button
                                                        onClick={() => handleToolConfirmation(tool)}
                                                            className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10 hover:shadow-xl flex items-center justify-center gap-2"
                                                    >
                                                            <Check className="h-4 w-4" />
                                                            Apply
                                                    </button>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0 mt-1">
                                        <User className="h-4 w-4 text-gray-500" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-4 justify-start">
                                <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Bot className="h-4 w-4 text-orange-500" />
                                </div>
                                <div className="bg-white border border-gray-100 rounded-3xl rounded-bl-none px-6 py-4 shadow-sm flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-500">Zeta is typing</span>
                                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-white border-t border-gray-100">
                        {/* Issue Selector Popover */}
                        {showIssueSelect && (
                            <div className="absolute bottom-24 left-6 w-[400px] max-h-[300px] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col z-20 animate-in zoom-in-95 duration-150">
                                <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search active issues..."
                                            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border-none text-sm focus:ring-2 focus:ring-orange-100 outline-none"
                                            autoFocus
                                            value={issueSearch}
                                            onChange={(e) => setIssueSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-1">
                                    {filteredIssues.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-gray-400">No issues found.</div>
                                    ) : (
                                        filteredIssues.map(issue => (
                                            <button
                                                key={issue.id}
                                                onClick={() => {
                                                    setInput(prev => prev + `[${issue.identifier}] `);
                                                    setShowIssueSelect(false);
                                                }}
                                                className="w-full text-left p-3 hover:bg-orange-50 rounded-xl transition-colors group flex items-start gap-3"
                                            >
                                                <div className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                                                    {issue.identifier}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-gray-900 truncate">{issue.title}</div>
                                                    <div className="text-xs text-gray-400 truncate mt-0.5">{issue.project_name || 'No Project'}</div>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="relative max-w-4xl mx-auto shadow-xl shadow-gray-200/50 rounded-[32px] bg-white border border-gray-100 flex flex-col transition-all hover:shadow-2xl hover:shadow-gray-200/60 visible">

                            {/* Live Context Preview */}
                            {(() => {
                                const issueIds = input.match(/\b([A-Z]+[A-Z0-9]*-\d+)\b/g);
                                const uniqueIds = Array.from(new Set(issueIds || []));

                                if (uniqueIds.length === 0) return null;

                                return (
                                    <div className="px-6 pt-4 pb-2 flex gap-2 flex-wrap items-center bg-gray-50/50 border-b border-gray-50">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-2 flex items-center gap-1">
                                            <Hash className="h-3 w-3" />
                                            References
                                        </span>
                                        {uniqueIds.map(id => (
                                            <IssueHoverCard
                                                key={id}
                                                identifier={id}
                                                onClick={() => handleViewIssue(id)}
                                            />
                                        ))}
                                    </div>
                                );
                            })()}

                            <div className="flex gap-2 p-1 items-center">
                                {/* Selector Toggle Button */}
                                <button
                                    onClick={() => setShowIssueSelect(!showIssueSelect)}
                                    className={`flex-shrink-0 p-3 ml-2 rounded-full transition-all ${showIssueSelect ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                                    title="Add Issue Context"
                                >
                                    <Hash className="h-5 w-5" />
                                </button>

                                {/* Status Update Mode Toggle */}
                                <button
                                    onClick={() => setChatMode(chatMode === 'status_update' ? 'general' : 'status_update')}
                                    className={`flex-shrink-0 p-3 rounded-full transition-all ${statusUpdateMode ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                                    title="Status Update Mode - Update ticket description"
                                >
                                    <ClipboardList className="h-5 w-5" />
                                </button>

                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                        placeholder={statusUpdateMode 
                                            ? "Describe your work log entry..." 
                                            : "Type your request here... (e.g. 'Update [LIN-123] status')"
                                        }
                                        className="w-full pl-3 pr-14 py-4 bg-transparent border-none text-gray-900 placeholder-gray-400 focus:ring-0 transition-all font-medium"
                                        disabled={isLoading}
                                    />
                                </div>

                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || isLoading}
                                    className="mr-2 p-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 transition-all hover:scale-105 shadow-md flex-shrink-0"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </main>


                {/* Issue Details Modal */}
                {isModalOpen && selectedIssue && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="bg-white rounded-[32px] max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
                            <div className="p-8 space-y-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xl font-bold text-gray-900">{selectedIssue.identifier}</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600`}>
                                                {selectedIssue.state.name}
                                            </span>
                                            {selectedIssue.priorityLabel && (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600">
                                                    {selectedIssue.priorityLabel}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedIssue.title}</h2>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="text-gray-400 hover:text-gray-900 transition-colors p-2 hover:bg-gray-50 rounded-full"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-2xl border border-gray-100 text-gray-600">
                                    <p className="whitespace-pre-wrap">{selectedIssue.description || 'No description provided.'}</p>
                                </div>

                                {selectedIssue.comments && selectedIssue.comments.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" />
                                            Recent Comments
                                        </h3>
                                        <div className="space-y-4">
                                            {selectedIssue.comments.map((comment: any, idx: number) => (
                                                <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-gray-900">{comment.user?.name || 'Unknown'}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{comment.body}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end pt-6 border-t border-gray-100">
                                    <a
                                        href={selectedIssue.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
                                    >
                                        Open in Linear
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
