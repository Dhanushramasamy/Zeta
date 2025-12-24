'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Ticket,
    AtSign,
    AlertCircle,
    Clock,
    Filter,
    Search,
    ExternalLink,
    CheckCircle2,
    Calendar,
    ChevronRight,
    Loader2,
    ArrowLeft,
    MessageSquare,
    Plus,
    Flame,
    Briefcase,
    AlertTriangle,
    Layers
} from 'lucide-react';
import Link from 'next/link';
import WorkflowModals from '@/components/WorkflowModals';
import { Sidebar } from '@/components/Sidebar';

interface Issue {
    id: string;
    identifier: string;
    title: string;
    description: string;
    state: string;
    priority: number;
    priority_label: string;
    assignee_name: string;
    project_name: string;
    due_date: string;
    url: string;
    mentions_dhanush: boolean;
    updated_at: string;
}

interface WorkflowStatus {
    client: string;
    ticket: {
        identifier: string;
        title: string;
        url: string;
        state: string;
    } | null;
}

export default function Dashboard() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [workflowModal, setWorkflowModal] = useState<'weekly' | 'daily' | null>(null);
    const [activeStatuses, setActiveStatuses] = useState<WorkflowStatus[]>([]);

    // New States for Filters and Dropdown
    const [activeDropdown, setActiveDropdown] = useState<'status' | 'project' | null>(null);
    const [filters, setFilters] = useState<{
        projects: string[];
        statuses: string[];
        priority: string;
        mentionsOnly: boolean;
        assignedToMe: boolean;
    }>({
        projects: [],
        statuses: [],
        priority: '',
        mentionsOnly: false,
        assignedToMe: true
    });

    const fetchIssues = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.projects.length > 0) params.append('projects', filters.projects.join(','));
            if (filters.statuses.length > 0) params.append('statuses', filters.statuses.join(','));
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.mentionsOnly) params.append('mentionsDhanush', 'true');
            if (filters.assignedToMe) params.append('assigneeName', 'Dhanush');

            const res = await fetch(`/api/tickets/search?${params.toString()}`);
            const data = await res.json();
            setIssues(data.issues || []);
        } catch (error) {
            console.error('Failed to fetch issues:', error);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    const fetchActiveStatuses = async () => {
        try {
            const res = await fetch('/api/workflows/active-tickets');
            const data = await res.json();
            setActiveStatuses(data.tickets || []);
        } catch (error) {
            console.error('Failed to fetch active statuses', error);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    useEffect(() => {
        fetchActiveStatuses();
    }, []);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await fetch('/api/projects');
                const data = await res.json();
                setProjects(data.projects || []);
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            }
        };
        fetchProjects();
    }, []);

    const filteredIssues = issues.filter(issue =>
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.identifier.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group issues by Project for "In Progress" view
    const groupedIssues: Record<string, Issue[]> = {};
    filteredIssues.forEach(issue => {
        const pName = issue.project_name || 'No Project';
        if (!groupedIssues[pName]) groupedIssues[pName] = [];
        groupedIssues[pName].push(issue);
    });

    const stats = {
        total: issues.length,
        mentions: issues.filter(i => i.mentions_dhanush).length,
        highPriority: issues.filter(i => i.priority <= 2).length,
        overdue: issues.filter(i => i.due_date && new Date(i.due_date) < new Date()).length,
        dueSoon: issues.filter(i => i.due_date && new Date(i.due_date) > new Date() && new Date(i.due_date).getTime() - new Date().getTime() < 86400000 * 3).length
    };

    return (
        <div className="min-h-screen bg-[#F2F4F8] text-gray-900 font-sans p-6 selection:bg-orange-200">
            {/* Background Decorative */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-100/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px]" />
            </div>

            {/* Backdrop for closing dropdowns */}
            {activeDropdown && (
                <div
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setActiveDropdown(null)}
                />
            )}

            <div className="flex gap-8 relative z-10 h-[calc(100vh-48px)]">

                <Sidebar onWorkflowOpen={(type) => setWorkflowModal(type)} />

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col min-w-0 pr-4">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">My Work</h1>
                            <div className="flex gap-4 text-sm font-medium text-gray-500">
                                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                <span>•</span>
                                <span>{stats.total} Active Tickets</span>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Filter issues..."
                                    className="bg-white border-none shadow-sm rounded-full pl-12 pr-6 py-3 text-sm w-64 focus:shadow-lg focus:ring-2 focus:ring-orange-100 outline-none transition-all placeholder:text-gray-400 font-medium"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden">

                        {/* Main Column: Project Based Issues */}
                        <div className="col-span-8 flex flex-col gap-8 h-full overflow-y-auto pr-2 pb-10">

                            {/* Weekly Status Quick Access */}
                            <div className="flex gap-4">
                                {activeStatuses.map((status) => (
                                    <div key={status.client} className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group cursor-pointer">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="h-4 w-4 text-gray-400" />
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{status.client}</span>
                                            </div>
                                            {status.ticket ? (
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-gray-300" />
                                            )}
                                        </div>
                                        {status.ticket ? (
                                            <a href={status.ticket.url} target="_blank" className="block">
                                                <div className="text-sm font-bold text-gray-900 truncate mb-0.5 group-hover:text-orange-500 transition-colors">
                                                    {status.ticket.identifier}
                                                </div>
                                                <div className="text-xs text-gray-400 truncate">Week Status Update</div>
                                            </a>
                                        ) : (
                                            <div className="text-center py-1">
                                                <button
                                                    onClick={() => setWorkflowModal('weekly')}
                                                    className="text-xs font-bold text-orange-500 hover:text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full"
                                                >
                                                    + Start Week
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Filters */}
                            <div className="flex items-center gap-3 relative z-20">
                                {/* Status Filter */}
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${filters.statuses.length > 0 ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <Filter className="h-4 w-4" />
                                        {filters.statuses.length > 0 ? `${filters.statuses.length} Statuses` : 'Status'}
                                    </button>

                                    {activeDropdown === 'status' && (
                                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                                            {['Todo', 'In Progress', 'Triage', 'Backlog', 'Done'].map(status => (
                                                <label key={status} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={filters.statuses.includes(status)}
                                                        onChange={(e) => {
                                                            const newStatuses = e.target.checked
                                                                ? [...filters.statuses, status]
                                                                : filters.statuses.filter(s => s !== status);
                                                            setFilters(f => ({ ...f, statuses: newStatuses }));
                                                        }}
                                                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-200"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">{status}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Project Filter */}
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveDropdown(activeDropdown === 'project' ? null : 'project')}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${filters.projects.length > 0 ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <Layers className="h-4 w-4" />
                                        {filters.projects.length > 0 ? `${filters.projects.length} Projects` : 'Project'}
                                    </button>

                                    {activeDropdown === 'project' && (
                                        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-30 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                                            {projects.map(project => (
                                                <label key={project.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={filters.projects.includes(project.name)}
                                                        onChange={(e) => {
                                                            const newProjects = e.target.checked
                                                                ? [...filters.projects, project.name]
                                                                : filters.projects.filter(p => p !== project.name);
                                                            setFilters(f => ({ ...f, projects: newProjects }));
                                                        }}
                                                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-200"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700 truncate">{project.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="h-6 w-[1px] bg-gray-200 mx-1" />

                                <button
                                    onClick={() => setFilters(f => ({ ...f, mentionsOnly: !f.mentionsOnly }))}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${filters.mentionsOnly ? 'bg-orange-500 text-white border-orange-500 shadow-orange-500/20' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <AtSign className="h-4 w-4" /> Mentions
                                </button>
                                <button
                                    onClick={() => setFilters(f => ({ ...f, assignedToMe: !f.assignedToMe }))}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${filters.assignedToMe ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <UserIcon /> Assigned to Me
                                </button>
                                <div className="h-6 w-[1px] bg-gray-200 mx-1" />
                                <span className="text-xs font-bold text-gray-400 uppercase">Grouped by Project</span>
                            </div>

                            {/* Project Groups */}
                            {isLoading ? (
                                <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
                            ) : Object.keys(groupedIssues).length === 0 ? (
                                <div className="p-10 text-center text-gray-400 bg-white rounded-[32px] border border-gray-100 border-dashed">No tickets found.</div>
                            ) : (
                                Object.entries(groupedIssues).map(([project, projIssues]) => (
                                    <div key={project} className="space-y-4">
                                        <div className="flex items-center gap-3 pl-2">
                                            <h3 className="text-lg font-bold text-gray-900">{project}</h3>
                                            <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">{projIssues.length}</span>
                                        </div>
                                        <div className="space-y-3">
                                            {projIssues.map((issue) => (
                                                <a key={issue.id} href={issue.url} target="_blank" className="block bg-white p-5 rounded-[20px] shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-100 transition-all group relative overflow-hidden">
                                                    {issue.mentions_dhanush && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />}

                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <span className="font-mono text-xs font-bold text-gray-400">{issue.identifier}</span>
                                                                <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${issue.state === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                                                                    issue.state === 'Done' ? 'bg-green-50 text-green-600' :
                                                                        issue.state === 'Todo' ? 'bg-gray-100 text-gray-700' :
                                                                            issue.state === 'Backlog' ? 'bg-gray-50 text-gray-400 dashed border border-gray-200' :
                                                                                issue.state === 'Triage' ? 'bg-amber-50 text-amber-600' :
                                                                                    'bg-gray-50 text-gray-600'
                                                                    }`}>
                                                                    {issue.state}
                                                                </div>
                                                                {issue.priority <= 2 && (
                                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                                                                        <AlertCircle className="h-3 w-3" />
                                                                        {issue.priority_label}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <h4 className="text-base font-bold text-gray-900 truncate group-hover:text-orange-600 transition-colors">{issue.title}</h4>
                                                        </div>

                                                        {issue.due_date && (
                                                            <div className={`flex flex-col items-end ${new Date(issue.due_date) < new Date() ? 'text-red-500' :
                                                                new Date(issue.due_date).getTime() - new Date().getTime() < 86400000 * 3 ? 'text-orange-500' : 'text-gray-400'
                                                                }`}>
                                                                <div className="flex items-center gap-1 text-xs font-bold bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                                                    <Calendar className="h-3.5 w-3.5" />
                                                                    {new Date(issue.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </div>
                                                                {new Date(issue.due_date) < new Date() && <span className="text-[10px] font-bold mt-1">Overdue</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Right Column: Stats & Due Soon */}
                        <div className="col-span-4 flex flex-col gap-6">

                            {/* Summary Stats Card */}
                            <div className="bg-[#1E1E2E] rounded-[32px] p-8 text-white shadow-xl shadow-blue-900/10">
                                <h3 className="font-bold mb-6 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                                    Summary
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                                                <Layers className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-400">Total</div>
                                                <div className="font-bold text-xl">{stats.total}</div>
                                            </div>
                                        </div>
                                        <div className="h-10 w-[1px] bg-white/10" />
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                                                <Flame className="h-5 w-5 text-orange-400" />
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-400">Due Soon</div>
                                                <div className="font-bold text-xl text-orange-400">{stats.dueSoon}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                            <div className="text-xs text-gray-400 mb-1">Overdue</div>
                                            <div className="font-bold text-red-400">{stats.overdue}</div>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                            <div className="text-xs text-gray-400 mb-1">Mentions</div>
                                            <div className="font-bold text-blue-400">{stats.mentions}</div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/10">
                                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                                            <span>Start Strong 🔥</span>
                                        </div>
                                        <div className="w-full bg-white/10 rounded-full h-1.5">
                                            <div className="bg-gradient-to-r from-orange-400 to-pink-500 h-1.5 rounded-full w-[70%]" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Upcoming / Due Soon List */}
                            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-orange-500" />
                                    Upcoming Deadlines
                                </h3>
                                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                                    {issues
                                        .filter(i => i.due_date && new Date(i.due_date) > new Date())
                                        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                                        .slice(0, 5) // Show top 5
                                        .map(issue => (
                                            <a key={issue.id} href={issue.url} target="_blank" className="block p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-orange-200 transition-colors">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] font-bold text-gray-400 font-mono">{issue.identifier}</span>
                                                    <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                                                        {new Date(issue.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight">{issue.title}</div>
                                            </a>
                                        ))
                                    }
                                    {issues.filter(i => i.due_date).length === 0 && (
                                        <div className="text-center text-gray-400 text-sm py-10">No upcoming deadlines. Chill mode on. 🌴</div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </main>

                <WorkflowModals
                    type={workflowModal}
                    onClose={() => setWorkflowModal(null)}
                    onSuccess={(msg) => {
                        alert(msg);
                        fetchIssues();
                        fetchActiveStatuses();
                    }}
                />
            </div>
        </div>
    );
}

function UserIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    )
}
