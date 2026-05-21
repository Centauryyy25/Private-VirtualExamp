'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };


  return (


    <main className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300">
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 glass-effect border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl font-bold">fact_check</span>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">VirtualExamp</span>
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">How it works</a>
              <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">Features</a>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                {!isLoading && (
                  isAuthenticated ? (
                    <>
                      <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{user?.display_name || user?.email}</span>
                        <Link href="/dashboard" className="text-sm font-semibold text-primary hover:text-primary-600">Dashboard</Link>
                        <button onClick={logout} className="text-sm text-slate-500 hover:text-red-500 transition-colors">Logout</button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-4 pl-4 border-l border-slate-100 dark:border-slate-800">
                      <Link href="/login" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary">Log in</Link>
                      <Link href="/register" className="bg-primary text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-600 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">Sign Up</Link>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Mobile Menu Icon */}
            <div className="md:hidden flex items-center gap-4">
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Toggle Navigation"
              >
                <span className="material-symbols-outlined text-2xl">menu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div className={`fixed inset-y-0 right-0 w-[300px] bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl z-[60] shadow-2xl transition-transform duration-300 ease-out transform md:hidden ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl font-bold">fact_check</span>
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">VirtualExamp</span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Menu</p>
                <a
                  href="#how-it-works"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-4 p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-primary dark:hover:text-primary transition-all group"
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">info</span>
                  <span className="font-semibold text-lg">How it works</span>
                </a>
                <a
                  href="#features"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-4 p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-primary dark:hover:text-primary transition-all group"
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">featured_play_list</span>
                  <span className="font-semibold text-lg">Features</span>
                </a>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Settings</p>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">contrast</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Appearance</span>
                  </div>
                  <ThemeToggle />
                </div>
              </div>

              <div className="pt-2">
                {!isLoading && (
                  isAuthenticated ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                            {user?.display_name ? user.display_name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.display_name || 'User'}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                          </div>
                        </div>
                        <Link
                          href="/dashboard"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold text-sm rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 hover:border-primary hover:text-primary transition-all mb-2"
                        >
                          <span className="material-symbols-outlined text-lg">dashboard</span>
                          Dashboard
                        </Link>
                        <button
                          onClick={() => { logout(); setIsMenuOpen(false); }}
                          className="flex items-center justify-center gap-2 w-full py-2.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-sm rounded-xl transition-all"
                        >
                          <span className="material-symbols-outlined text-lg">logout</span>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <Link
                        href="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full py-3.5 px-4 text-center font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <p className="text-[10px] text-center text-slate-400 font-medium">
                © 2026 VirtualExamp <br /> Simulation Systems
              </p>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 lg:pt-48 h-screen lg:pb-32 bg-background-light dark:bg-background-dark overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 backdrop-blur-sm animate-fade-in-up shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-pulse-soft absolute inline-flex h-full w-full rounded-full bg-blue-500/40"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500/80"></span>
                </span>
                <span className="text-[11px] md:text-[12px] font-bold uppercase tracking-[0.05em] text-blue-700 dark:text-blue-300">
                  New: Support for VCE & PDF files
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-[1.1] animate-reveal-up delay-100">
                Practice Exams <br className="hidden sm:block" />
                <span className="text-primary">Anywhere, Anytime</span>
              </h1>
              <p className="text-base md:text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium animate-reveal-up delay-200">
                The ultimate professional simulation environment for serious test-takers. Upload your exam files and transform raw questions into a high-stakes certification experience.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start animate-reveal-up delay-300">
                <Link
                  href={isAuthenticated ? "/upload" : "/login?redirect=/upload"}
                  className="bg-blue-700 text-white px-8 py-3.5 md:py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <span className="material-symbols-outlined">upload_file</span>
                  Upload Exam
                </Link>
                <Link
                  href="/demo"
                  className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-8 py-3.5 md:py-4 rounded-xl font-bold text-lg hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">play_circle</span>
                  Try Demo
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-8 border-t border-slate-200 dark:border-slate-800 justify-center lg:justify-start">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white dark:border-slate-900 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wide animate-fade-in delay-500">
                  Trusted by <span className="text-slate-900 dark:text-white">12,000+</span> Pros
                </p>
              </div>
            </div>

            {/* Exam Simulator Preview */}
            <div className="relative mt-8 lg:mt-0 px-4 md:px-0 max-w-2xl mx-auto lg:max-w-none animate-fade-in delay-300">
              <div className="absolute inset-0 bg-primary/10 blur-[60px] md:blur-[100px] rounded-full"></div>
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-4 md:p-6 transition-all hover:shadow-primary/10">
                <div className="flex items-center justify-between mb-6 md:mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-400"></span>
                    <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-400"></span>
                    <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-400"></span>
                    <span className="ml-2 md:ml-4 text-[10px] md:text-xs font-semibold text-slate-400">Exam Simulator v4.2</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 bg-slate-100 dark:bg-slate-800 px-2 md:px-3 py-1 rounded-md">
                    <span className="material-symbols-outlined text-xs md:text-sm text-slate-500">timer</span>
                    <span className="text-[10px] md:text-xs font-mono font-bold text-slate-700 dark:text-slate-300">01:45:22</span>
                  </div>
                </div>
                <div className="space-y-4 md:space-y-6">
                  <div className="space-y-2">
                    <div className="h-1.5 md:h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full">
                      <div className="h-full w-1/3 bg-primary rounded-full"></div>
                    </div>
                    <div className="flex justify-between text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      <span>Question 14 of 45</span>
                      <span>31% Completed</span>
                    </div>
                  </div>
                  <div className="p-3 md:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <h3 className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 md:mb-4 leading-relaxed">
                      Which of the following routing protocols is considered a link-state protocol?
                    </h3>
                    <div className="space-y-2 md:space-y-3 font-medium">
                      <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-white dark:bg-slate-900 border border-primary/30 rounded-md shadow-sm">
                        <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-primary flex items-center justify-center">
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary"></div>
                        </div>
                        <span className="text-[10px] md:text-xs text-slate-700 dark:text-slate-300">OSPF (Open Shortest Path First)</span>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                        <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-slate-300"></div>
                        <span className="text-[10px] md:text-xs text-slate-600 dark:text-slate-400">RIP (Routing Information Protocol)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 md:gap-3">
                    <button className="px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold text-slate-400">Mark</button>
                    <button className="px-4 md:px-6 py-2 bg-primary text-white text-[10px] md:text-xs font-bold rounded-md shadow-lg shadow-primary/20">Next</button>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 md:-bottom-8 md:-left-8 bg-white dark:bg-slate-800 p-3 md:p-5 rounded-xl md:rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-700 flex items-center gap-3 md:gap-4 z-20 animate-bounce-subtle">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-green-100 dark:bg-green-900/40 rounded-lg md:rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 shadow-inner">
                  <span className="material-symbols-outlined text-xl md:text-2xl">analytics</span>
                </div>
                <div>
                  <p className="text-xs md:text-sm font-bold text-slate-900 dark:text-white leading-tight">Analytics</p>
                  <p className="text-[8px] md:text-xs font-medium text-slate-500 dark:text-slate-400">Real-time feedback</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 animate-reveal-up">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Serious Tools for Serious Candidates</h2>
            <p className="text-slate-600 dark:text-slate-400">Everything you need to simulate the high-pressure environment of certification exams including the official testing interface behavior.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all group animate-reveal-up delay-100">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">upload_file</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Seamless Upload</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Drag and drop VCE, PDF, or TXT files. Our engine parses complex question formats including images and multi-part answers.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all group animate-reveal-up delay-200">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">psychology</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Adaptive Practice</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Algorithmically focused sessions that prioritize questions you've previously missed or found difficult to master.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all group animate-reveal-up delay-300">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">history_edu</span>
                <span className="material-symbols-outlined text-3xl">history_edu</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Exam History</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Detailed reporting after every session. Track your progress over time and see exactly where you need improvement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-background-light dark:bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-12">Empowering professional success across industries</h2>
          <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center gap-2 font-bold text-2xl text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-primary">cloud</span> CLOUDNET
            </div>
            <div className="flex items-center gap-2 font-bold text-2xl text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-primary">security</span> SECUREX
            </div>
            <div className="flex items-center gap-2 font-bold text-2xl text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-primary">monitor_heart</span> MEDCORE
            </div>
            <div className="flex items-center gap-2 font-bold text-2xl text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-primary">gavel</span> LEGALITY
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl font-bold">fact_check</span>
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">VirtualExamp</span>
              </div>
              <p className="text-slate-500 text-sm max-w-sm">The leading provider of high-fidelity exam simulation technology for professional certifications in IT, Healthcare, and Finance.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/upload" className="hover:text-primary transition-colors">Exam Engine</Link></li>
                <li><Link href="/demo" className="hover:text-primary transition-colors">Try Demo</Link></li>
                <li><a href="#" className="hover:text-primary transition-colors">API Access</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-400">© 2026 VirtualExamp Simulation Systems. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">public</span></a>
              <a href="#" className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">alternate_email</span></a>
              <a href="#" className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">help</span></a>
            </div>
          </div>
        </div>
      </footer>
    </main>

  );
}
