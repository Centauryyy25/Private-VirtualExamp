'use client';

import { useRouter } from 'next/navigation';
import { useExamStore, Exam } from '@/lib/store/examStore';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import Image from 'next/image';

// Sample demo exam data
const demoExam: Exam = {
    id: 'demo-exam-001',
    title: 'Sample Networking Exam',
    description: 'A comprehensive demo to test the VirtualExamp platform capabilities. Contains 10 varied networking questions covering protocols, security, and troubleshooting.',
    total_questions: 10,
    pass_percentage: 70,
    time_limit_minutes: 30,
    domains: {
        'network-basics': 30,
        'protocols': 25,
        'security': 25,
        'troubleshooting': 20,
    },
    parsed_data: {
        metadata: {
            title: 'Sample Networking Exam',
            pass_percentage: 70,
            time_limit_minutes: 30,
        },
        domains: [
            { id: 'network-basics', name: 'Network Basics', weight: 30 },
            { id: 'protocols', name: 'Protocols & Ports', weight: 25 },
            { id: 'security', name: 'Network Security', weight: 25 },
            { id: 'troubleshooting', name: 'Troubleshooting', weight: 20 },
        ],
        questions: [
            {
                id: 'q001',
                type: 'multiple_choice',
                domain_id: 'network-basics',
                text: 'What is the primary purpose of a default gateway in a network?',
                media: [],
                options: [
                    { id: 'a', text: 'To provide DNS resolution for domain names' },
                    { id: 'b', text: 'To route traffic between different networks' },
                    { id: 'c', text: 'To assign IP addresses to network devices' },
                    { id: 'd', text: 'To encrypt data transmitted over the network' },
                ],
                correct_answers: ['b'],
                explanation: 'The default gateway is a router that connects a local network to other networks or the internet.',
            },
            {
                id: 'q002',
                type: 'multiple_choice',
                domain_id: 'network-basics',
                text: 'Which OSI layer is responsible for logical addressing and routing?',
                media: [],
                options: [
                    { id: 'a', text: 'Data Link Layer (Layer 2)' },
                    { id: 'b', text: 'Network Layer (Layer 3)' },
                    { id: 'c', text: 'Transport Layer (Layer 4)' },
                    { id: 'd', text: 'Session Layer (Layer 5)' },
                ],
                correct_answers: ['b'],
                explanation: 'The Network Layer (Layer 3) is responsible for logical addressing (IP addresses) and routing.',
            },
            {
                id: 'q003',
                type: 'multiple_choice',
                domain_id: 'protocols',
                text: 'Which port does HTTPS use by default?',
                media: [],
                options: [
                    { id: 'a', text: 'Port 80' },
                    { id: 'b', text: 'Port 443' },
                    { id: 'c', text: 'Port 21' },
                    { id: 'd', text: 'Port 25' },
                ],
                correct_answers: ['b'],
                explanation: 'HTTPS uses port 443 by default. Port 80 is used by HTTP.',
            },
            {
                id: 'q004',
                type: 'multiple_choice',
                domain_id: 'protocols',
                text: 'Which protocol is used to automatically assign IP addresses to devices?',
                media: [],
                options: [
                    { id: 'a', text: 'DNS' },
                    { id: 'b', text: 'DHCP' },
                    { id: 'c', text: 'ARP' },
                    { id: 'd', text: 'ICMP' },
                ],
                correct_answers: ['b'],
                explanation: 'DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses.',
            },
            {
                id: 'q005',
                type: 'multiple_choice',
                domain_id: 'security',
                text: 'What type of attack involves intercepting communications between two parties?',
                media: [],
                options: [
                    { id: 'a', text: 'Denial of Service (DoS)' },
                    { id: 'b', text: 'Phishing' },
                    { id: 'c', text: 'Man-in-the-Middle (MITM)' },
                    { id: 'd', text: 'SQL Injection' },
                ],
                correct_answers: ['c'],
                explanation: 'A Man-in-the-Middle attack intercepts and possibly alters communications between two parties.',
            },
            {
                id: 'q006',
                type: 'multiple_choice',
                domain_id: 'security',
                text: 'Which security protocol is recommended for wireless networks over WEP?',
                media: [],
                options: [
                    { id: 'a', text: 'WPA2' },
                    { id: 'b', text: 'SSH' },
                    { id: 'c', text: 'SSL' },
                    { id: 'd', text: 'IPSec' },
                ],
                correct_answers: ['a'],
                explanation: 'WPA2 provides strong encryption for wireless networks and is recommended over WEP.',
            },
            {
                id: 'q007',
                type: 'multiple_choice',
                domain_id: 'troubleshooting',
                text: 'Which command is used to test connectivity by sending ICMP echo requests?',
                media: [],
                options: [
                    { id: 'a', text: 'traceroute' },
                    { id: 'b', text: 'nslookup' },
                    { id: 'c', text: 'ping' },
                    { id: 'd', text: 'netstat' },
                ],
                correct_answers: ['c'],
                explanation: 'The ping command sends ICMP echo request packets to test network connectivity.',
            },
            {
                id: 'q008',
                type: 'multiple_choice',
                domain_id: 'troubleshooting',
                text: 'What does the TTL (Time To Live) field in an IP packet indicate?',
                media: [],
                options: [
                    { id: 'a', text: 'The encryption strength of the packet' },
                    { id: 'b', text: 'The maximum number of hops before the packet is discarded' },
                    { id: 'c', text: 'The total time the packet has been in transit' },
                    { id: 'd', text: 'The priority level of the packet' },
                ],
                correct_answers: ['b'],
                explanation: 'TTL specifies the maximum number of router hops a packet can traverse.',
            },
            {
                id: 'q009',
                type: 'multiple_choice',
                domain_id: 'network-basics',
                text: 'What is the valid range for host addresses in a Class C network with default subnet mask?',
                media: [],
                options: [
                    { id: 'a', text: '1 to 255' },
                    { id: 'b', text: '0 to 254' },
                    { id: 'c', text: '1 to 254' },
                    { id: 'd', text: '0 to 255' },
                ],
                correct_answers: ['c'],
                explanation: 'In a Class C network, host addresses range from 1 to 254. 0 is network, 255 is broadcast.',
            },
            {
                id: 'q010',
                type: 'multiple_choice',
                domain_id: 'protocols',
                text: 'Which protocol provides reliable, ordered delivery at the Transport Layer?',
                media: [],
                options: [
                    { id: 'a', text: 'UDP' },
                    { id: 'b', text: 'IP' },
                    { id: 'c', text: 'TCP' },
                    { id: 'd', text: 'ICMP' },
                ],
                correct_answers: ['c'],
                explanation: 'TCP provides reliable, ordered, and error-checked delivery of data.',
            },
        ],
    },
};

export default function DemoPage() {
    const router = useRouter();
    const { setExam, startSession } = useExamStore();

    const handleStartDemo = (mode: 'timed' | 'training') => {
        setExam(demoExam);
        startSession(
            demoExam.id,
            mode,
            mode === 'timed' ? 30 : undefined
        );
        sessionStorage.removeItem('resultsSaved');
        router.push('/exam');
    };

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-[#0a0e1a] transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-all">
                                <span className="material-symbols-outlined text-xl">school</span>
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100">
                                Virtual<span className="text-primary-600 dark:text-primary-400">Examp</span>
                            </span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                        <Link href="/upload" className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">upload_file</span>
                            Upload Own
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-12">
                {/* Hero Card */}
                <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-xl mb-12 animate-fade-in-up">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"></div>
                    <div className="p-8 sm:p-12 relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            Interactive Demo
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                            {demoExam.title}
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                            {demoExam.description}
                        </p>
                    </div>

                    {/* Decorative Background Elements */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 opacity-5 dark:opacity-10 translate-y-1/3 translate-x-1/4">
                        <span className="material-symbols-outlined text-[250px] text-slate-400">assignment</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Stats Column */}
                    <div className="space-y-4 lg:col-span-1 animate-fade-in-up delay-100">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">Exam Details</h3>
                        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                            <div className="grid grid-cols-2 gap-y-6">
                                <div className="space-y-1">
                                    <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{demoExam.total_questions}</div>
                                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Questions</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{demoExam.pass_percentage}%</div>
                                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pass Score</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{demoExam.time_limit_minutes}</div>
                                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Minutes</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">4</div>
                                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Domains</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Domains Covered</h4>
                            <div className="flex flex-wrap gap-2">
                                {demoExam.parsed_data.domains.map((domain) => (
                                    <span
                                        key={domain.id}
                                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                                    >
                                        {domain.name}
                                        <span className="ml-1.5 opacity-50 text-[10px]">{domain.weight}%</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Modes Column */}
                    <div className="lg:col-span-2 space-y-4 animate-fade-in-up delay-200">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">Select Mode</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => handleStartDemo('training')}
                                className="group relative overflow-hidden bg-white dark:bg-[#1e293b] p-6 sm:p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-400/20 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
                                <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-2xl">school</span>
                                </div>
                                <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Training Mode</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Learn at your own pace with instant correct/incorrect feedback and detailed explanations.
                                </p>
                            </button>

                            <button
                                onClick={() => handleStartDemo('timed')}
                                className="group relative overflow-hidden bg-white dark:bg-[#1e293b] p-6 sm:p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-500 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-400/20 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
                                <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-2xl">timer</span>
                                </div>
                                <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Timed Exam</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Simulate real exam conditions with a 30-minute timer and results at the end.
                                </p>
                            </button>
                        </div>

                        <div className="mt-8 flex justify-center pt-8 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-sm text-slate-400 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">info</span>
                                All data in demo mode is local and temporary.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
