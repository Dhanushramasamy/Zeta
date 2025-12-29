'use client';

import {
    LayoutDashboard,
    ArrowLeft,
    MessageSquare,
    Flame
} from 'lucide-react';
import Link from 'next/link';

interface SidebarProps {
}

export function Sidebar({ }: SidebarProps) {
    return (
        <aside className="w-24 bg-[#1E1E2E] rounded-[40px] shadow-2xl shadow-blue-900/10 flex flex-col items-center py-10 flex-shrink-0 text-white justify-between">
            <div className="flex flex-col items-center gap-10">
                {/* Brand */}
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <Flame className="h-6 w-6 text-white fill-white" />
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-6 w-full px-4">
                    <Link href="/" className="w-full aspect-square flex items-center justify-center rounded-2xl hover:bg-white/10 text-gray-400 hover:text-white transition-all group" title="Landing">
                        <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
                    </Link>

                    <Link href="/dashboard" className="w-full aspect-square flex items-center justify-center rounded-2xl hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Dashboard">
                        <LayoutDashboard className="h-6 w-6" />
                    </Link>

                    <Link href="/chat" className="w-full aspect-square flex items-center justify-center rounded-2xl hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Zeta Chat">
                        <MessageSquare className="h-6 w-6" />
                    </Link>
                </nav>
            </div>
        </aside>
    );
}
