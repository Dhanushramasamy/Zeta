import Link from 'next/link';
import { ArrowRight, MessageSquare, Layout } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F2F4F8] text-gray-900 font-sans p-6 selection:bg-orange-200 overflow-hidden relative">
      {/* Background Decorative */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-orange-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-48px)]">
        {/* Header */}
        <header className="flex items-center justify-between py-8 px-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 relative flex items-center justify-center">
              <img
                src="/zeta.png"
                alt="Zeta"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-widest">
              ZETA
            </h1>
          </div>
          <nav className="hidden md:flex gap-8 items-center bg-white/50 backdrop-blur-sm px-6 py-3 rounded-full border border-white/50 shadow-sm">
            <Link href="/dashboard" className="text-sm font-bold text-gray-500 hover:text-orange-500 transition-colors">Dashboard</Link>
            <Link href="/chat" className="text-sm font-bold text-gray-500 hover:text-orange-500 transition-colors">Chat</Link>
          </nav>
          <div className="w-12" /> {/* Spacer for balance */}
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-orange-100 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-xs font-bold text-gray-600 tracking-wide uppercase">AI-Powered Work Assistant</span>
          </div>

          <h2 className="text-6xl md:text-8xl font-black tracking-tight text-gray-900 mb-6 leading-[1.1] max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Work Smarter,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-600">Not Harder.</span>
          </h2>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Orchestrate your entire workflow from a single, beautiful interface. Zeta manages your tasks, updates your team, and keeps you focused.
          </p>

          {/* Feature Cards as Navigation */}
          <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl px-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">

            {/* Dashboard Card */}
            <Link href="/dashboard" className="group relative bg-white rounded-[40px] p-8 border border-white shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2 transition-all duration-300 flex flex-col items-start text-left overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-[100px] z-0 transition-transform group-hover:scale-110 origin-top-right" />
              <div className="relative z-10 w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
                <Layout className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="relative z-10 text-2xl font-bold text-gray-900 mb-2">Dashboard</h3>
              <p className="relative z-10 text-gray-500 font-medium mb-6">Your central command center for tasks and progress.</p>
              <div className="relative z-10 mt-auto flex items-center gap-2 text-orange-600 font-bold text-sm group-hover:gap-3 transition-all">
                Open Dashboard <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            {/* Chat Card */}
            <Link href="/chat" className="group relative bg-white rounded-[40px] p-8 border border-white shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-300 flex flex-col items-start text-left overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] z-0 transition-transform group-hover:scale-110 origin-top-right" />
              <div className="relative z-10 w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <MessageSquare className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="relative z-10 text-2xl font-bold text-gray-900 mb-2">AI Chat</h3>
              <p className="relative z-10 text-gray-500 font-medium mb-6">Talk to your codebase and manage issues naturally.</p>
              <div className="relative z-10 mt-auto flex items-center gap-2 text-blue-600 font-bold text-sm group-hover:gap-3 transition-all">
                Start Chatting <ArrowRight className="h-4 w-4" />
              </div>
            </Link>


          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 flex justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-400 font-medium bg-white/50 backdrop-blur px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            <span>Systems Operational</span>
            <span className="mx-2 text-gray-300">|</span>
            <span>Powered by Vercel AI SDK</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
