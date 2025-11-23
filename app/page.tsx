import Link from 'next/link';
import { ArrowRight, Zap, MessageSquare, FileText, Sparkles, Brain, Network } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative">
      {/* Custom tech background */}
      <div
        className="fixed inset-0 opacity-30"
        style={{
          backgroundImage: `url('/bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(0px)'
        }}
      />

      {/* Animated gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-pink-950/60 via-slate-950/80 to-blue-950/60" />

      {/* Animated grid pattern */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(236, 72, 153, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59, 130, 246, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 100% 100% at 50% 50%, black 40%, transparent 100%)'
        }} />
      </div>

      {/* Floating particles/nodes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full opacity-30 animate-pulse ${i % 3 === 0 ? 'bg-pink-400' : i % 3 === 1 ? 'bg-blue-400' : 'bg-green-400'
              }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Large glowing orbs - BRIGHT colors */}
      <div className="fixed top-0 -left-1/4 w-[800px] h-[800px] bg-pink-500/30 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="fixed bottom-0 -right-1/4 w-[600px] h-[600px] bg-blue-500/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      <div className="fixed top-1/2 left-1/2 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '4s' }} />
      <div className="fixed top-1/3 right-1/4 w-[400px] h-[400px] bg-green-400/15 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '7s', animationDelay: '1s' }} />

      {/* Scanline effect */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(236, 72, 153, 0.3) 2px, rgba(236, 72, 153, 0.3) 4px)'
        }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-pink-500 blur-xl opacity-70 group-hover:opacity-100 transition-opacity animate-pulse" />
                <div className="relative bg-gradient-to-br from-pink-500 via-purple-600 to-blue-600 p-3 rounded-xl shadow-2xl shadow-pink-500/50">
                  <Brain className="h-8 w-8 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(236,72,153,0.5)]">
                  ZETA
                </h1>
                <p className="text-xs text-pink-400/60 font-mono">v1.0 ONLINE</p>
              </div>
            </div>
            <nav className="flex gap-8">
              <Link href="/linear" className="group relative text-gray-300 hover:text-pink-400 transition-all duration-300">
                <span className="relative z-10">Linear</span>
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link href="/chat" className="group relative text-gray-300 hover:text-blue-400 transition-all duration-300">
                <span className="relative z-10">Chat</span>
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-300" />
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-pink-500/10 border border-pink-500/30 backdrop-blur-xl shadow-lg shadow-pink-500/10">
              <Sparkles className="h-4 w-4 text-pink-400 animate-pulse" />
              <span className="text-sm text-pink-300 font-medium">Your Personal AI Work Assistant</span>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
            </div>

            {/* Main Heading */}
            <h2 className="text-7xl md:text-8xl font-black leading-tight">
              <span className="block bg-gradient-to-r from-white via-pink-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_50px_rgba(236,72,153,0.3)]">
                Work Smarter,
              </span>
              <span className="block mt-2 bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500 bg-clip-text text-transparent animate-pulse drop-shadow-[0_0_50px_rgba(236,72,153,0.5)]">
                Not Harder
              </span>
            </h2>

            {/* Subheading */}
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              ZETA is your intelligent work companion, automating Linear updates,
              answering questions, and helping you stay on top of your tasks with{' '}
              <span className="text-pink-400 font-semibold">AI-powered insights</span>.
            </p>

            {/* CTA Buttons */}
            <div className="flex gap-4 justify-center pt-8">
              <Link
                href="/chat"
                className="group relative px-8 py-4 overflow-hidden rounded-xl font-bold text-white transition-all duration-300 hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                <span className="relative flex items-center gap-2 z-10">
                  Start Chatting
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
                </span>
              </Link>
              <Link
                href="/linear"
                className="group relative px-8 py-4 bg-white/5 backdrop-blur-xl border-2 border-pink-500/30 rounded-xl font-bold text-white hover:bg-white/10 hover:border-pink-500/60 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.3)]"
              >
                Linear Assistant
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-32 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-2xl bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5 border border-pink-500/20 backdrop-blur-xl hover:border-pink-500/60 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_50px_rgba(236,72,153,0.3)]">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 via-pink-500/5 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:shadow-pink-500/60 transition-all">
                  <MessageSquare className="h-7 w-7 text-pink-400" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-pink-200 bg-clip-text text-transparent">AI Chat Assistant</h3>
                <p className="text-gray-400 leading-relaxed">
                  Ask questions about your work, get instant answers with full context from your Linear issues.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-2xl bg-gradient-to-br from-orange-500/5 via-transparent to-yellow-500/5 border border-orange-500/20 backdrop-blur-xl hover:border-orange-500/60 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_50px_rgba(249,115,22,0.3)]">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-orange-500/5 to-yellow-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/30 to-yellow-500/30 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/60 transition-all">
                  <FileText className="h-7 w-7 text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-orange-200 bg-clip-text text-transparent">Smart Updates</h3>
                <p className="text-gray-400 leading-relaxed">
                  Turn your daily notes into Linear updates automatically with AI-powered analysis.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-2xl bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 border border-green-500/20 backdrop-blur-xl hover:border-green-500/60 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_50px_rgba(34,197,94,0.3)]">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 via-green-500/5 to-emerald-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:shadow-green-500/60 transition-all">
                  <Zap className="h-7 w-7 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">Real-time Sync</h3>
                <p className="text-gray-400 leading-relaxed">
                  Stay up-to-date with instant synchronization between Linear and ZETA via webhooks.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-32 max-w-4xl mx-auto">
            <div className="grid grid-cols-3 gap-8 p-10 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
              <div className="text-center group cursor-default">
                <div className="text-5xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                  100%
                </div>
                <div className="text-sm text-gray-400 mt-2 font-medium">Automated</div>
              </div>
              <div className="text-center group cursor-default">
                <div className="text-5xl font-black bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                  AI
                </div>
                <div className="text-sm text-gray-400 mt-2 font-medium">Powered</div>
              </div>
              <div className="text-center group cursor-default">
                <div className="text-5xl font-black bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                  24/7
                </div>
                <div className="text-sm text-gray-400 mt-2 font-medium">Available</div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-12 mt-32 border-t border-white/10">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <p>© 2025 ZETA. Your Personal AI Work Assistant.</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
              <Network className="h-4 w-4 text-pink-400" />
              <span>Powered by AI</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
