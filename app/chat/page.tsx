'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, ArrowLeft, Eye, ExternalLink, X, MessageSquare } from 'lucide-react';
import Link from 'next/link';

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

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Issue Details Modal State
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingIssueId, setLoadingIssueId] = useState<string | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
                body: JSON.stringify({ messages: [...messages, userMessage] }),
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
        const action = {
            id: Math.random().toString(36).substr(2, 9),
            type: toolCall.function.name === 'post_comment' ? 'comment' : 'create_issue',
            issueIdentifier: args.issueId,
            title: args.title,
            description: args.description || args.body,
            reasoning: 'User requested via Chat',
        };

        try {
            const res = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions: [action] }),
            });

            if (!res.ok) throw new Error('Failed to execute action');

            const toolMessage: Message = {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `Successfully executed action: ${toolCall.function.name}`
            };
            setMessages(prev => [...prev, toolMessage]);

            // Optionally trigger a follow-up from the assistant to acknowledge the tool output
            // For now, we just show the tool output in the UI
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
                const linearUrl = `https://linear.app/issue/${part}`;
                return (
                    <span key={idx} className="inline-flex items-center gap-1 mx-1 bg-white/10 rounded-md px-2 py-0.5 align-middle border border-white/10">
                        <span className="font-mono font-bold text-cyan-400 text-sm">{part}</span>
                        <div className="flex items-center gap-1 border-l border-white/20 pl-1.5 ml-1">
                            <button
                                onClick={() => handleViewIssue(part)}
                                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-cyan-400 transition-colors"
                                title="View Details"
                            >
                                {loadingIssueId === part ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            <a
                                href={linearUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-cyan-400 transition-colors"
                                title="Open in Linear"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </div>
                    </span>
                );
            }
            return <span key={idx}>{part}</span>;
        });
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex flex-col font-sans relative">
            <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
                <Link href="/" className="text-gray-400 hover:text-cyan-400 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    ZETA Chat Assistant
                </h1>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-20">
                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg">How can I help you with your work today?</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role !== 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                        )}

                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-br-none'
                            : msg.role === 'tool'
                                ? 'bg-green-900/20 border border-green-500/30 text-green-200 italic'
                                : 'bg-white/5 backdrop-blur-sm border border-white/10 rounded-bl-none shadow-sm'
                            }`}>
                            {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{renderMessageWithLinks(msg.content)}</p>}

                            {msg.tool_calls && (
                                <div className="mt-3 space-y-2">
                                    {msg.tool_calls.map((tool, toolIdx) => (
                                        <div key={toolIdx} className="bg-white/5 rounded p-3 border border-white/10 text-sm">
                                            <p className="font-medium text-gray-300 mb-1">Proposed Action:</p>
                                            <p className="font-mono text-xs text-cyan-400 mb-2">{tool.function.name}</p>
                                            <pre className="text-xs bg-black/20 p-2 rounded overflow-x-auto mb-3 text-gray-300">
                                                {JSON.stringify(JSON.parse(tool.function.arguments), null, 2)}
                                            </pre>
                                            <button
                                                onClick={() => handleToolConfirmation(tool)}
                                                className="w-full py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                                            >
                                                Confirm & Execute
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-gray-300" />
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-5 w-5 text-white" />
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-black/20 backdrop-blur-sm border-t border-white/10 sticky bottom-0">
                <div className="max-w-3xl mx-auto relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask about issues or instruct to create tasks..."
                        className="w-full pl-4 pr-12 py-3 rounded-xl bg-white/5 border-white/10 text-white placeholder-gray-500 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-2 p-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Issue Details Modal */}
            {isModalOpen && selectedIssue && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 space-y-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-xl font-bold text-white">{selectedIssue.identifier}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-gray-300 border border-white/10`}>
                                            {selectedIssue.state.name}
                                        </span>
                                        {selectedIssue.priorityLabel && (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-cyan-300 border border-white/10">
                                                {selectedIssue.priorityLabel}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-lg font-medium text-gray-200">{selectedIssue.title}</h2>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="prose prose-invert prose-sm max-w-none bg-white/5 p-4 rounded-lg border border-white/5">
                                <p className="whitespace-pre-wrap text-gray-300">{selectedIssue.description || 'No description provided.'}</p>
                            </div>

                            {selectedIssue.comments && selectedIssue.comments.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        Recent Comments
                                    </h3>
                                    <div className="space-y-3">
                                        {selectedIssue.comments.map((comment: any, idx: number) => (
                                            <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/5">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-cyan-400">{comment.user?.name || 'Unknown'}</span>
                                                </div>
                                                <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.body}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 border-t border-white/10">
                                <a
                                    href={selectedIssue.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
                                >
                                    Open in Linear
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
