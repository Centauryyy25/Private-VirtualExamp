'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';

import { useExamStore, Exam } from '@/lib/store/examStore';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';

export default function UploadPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();
    const { setExam } = useExamStore();
    const [uploadedExam, setUploadedExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDark, setIsDark] = useState(false);
    const [uploadState, setUploadState] = useState<'default' | 'success' | 'invalid' | 'select-format'>('default');
    const [fileName, setFileName] = useState('');
    const [pdfFormat, setPdfFormat] = useState('ccna');
    const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);

    // Check for active session
    const activeExam = useExamStore(state => state.exam);
    const hasActiveSession = !!activeExam && !!useExamStore.getState().sessionId;

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

    // Check for active session



    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login?redirect=/upload');
        }
    }, [authLoading, isAuthenticated, router]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setFileName(file.name);

        try {
            // Validate file type
            const extension = '.' + file.name.split('.').pop()?.toLowerCase();
            if (!['.json', '.oef', '.pdf'].includes(extension)) {
                setUploadState('invalid');
                setError('Invalid file format. Please upload .OEF, .JSON, or .PDF files.');
                setIsLoading(false);
                return;
            }

            // Handle PDF files - show format selector first
            if (extension === '.pdf') {
                setPendingPdfFile(file);
                setUploadState('select-format');
                setIsLoading(false);
                return;
            }

            // Upload JSON/OEF to backend for persistence
            const response = await api.uploadExam(file, false);

            if (response.error) {
                throw new Error(response.error);
            }

            const examData = response.data as any;

            const exam: Exam = {
                id: examData.id,
                title: examData.title,
                description: examData.description,
                total_questions: examData.total_questions,
                pass_percentage: examData.pass_percentage,
                time_limit_minutes: examData.time_limit_minutes,
                domains: examData.domains,
                parsed_data: examData.parsed_data,
            };

            setUploadedExam(exam);
            setExam(exam); // Set to Zustand store for configure page
            setUploadState('success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse exam file');
            setUploadState('invalid');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePdfUpload = async (format: string) => {
        if (!pendingPdfFile) return;

        setIsLoading(true);
        setUploadState('default');
        setError(null);

        try {
            console.log(`PDF file detected, uploading with format: ${format}`);
            const response = await api.uploadExamPDF(pendingPdfFile, false, format);
            console.log('Backend response:', response);

            if (response.error) {
                console.error('Backend error:', response.error);
                throw new Error(response.error);
            }

            const examData = response.data;
            console.log('Exam data received:', examData);

            const exam: Exam = {
                id: examData.id || crypto.randomUUID(),
                title: examData.title,
                description: examData.description,
                total_questions: examData.total_questions,
                pass_percentage: examData.pass_percentage,
                time_limit_minutes: examData.time_limit_minutes,
                domains: examData.domains,
                parsed_data: examData.parsed_data,
            };

            setUploadedExam(exam);
            setExam(exam);
            setUploadState('success');
        } catch (pdfError) {
            console.error('PDF upload error:', pdfError);
            setError(pdfError instanceof Error ? pdfError.message : 'Failed to upload PDF file');
            setUploadState('invalid');
        } finally {
            setIsLoading(false);
            setPendingPdfFile(null);
        }
    };

    const resetUpload = () => {
        setUploadState('default');
        setUploadedExam(null);
        setFileName('');
        setError(null);
        setPendingPdfFile(null);
        setPdfFormat('ccna');
        const input = document.getElementById('file-input') as HTMLInputElement;
        if (input) input.value = '';
    };

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-slate-600 dark:text-slate-400">Loading...</p>
            </div>
        );
    }

    // Don't render if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-slate-900 min-h-screen flex flex-col transition-colors duration-200">
            {/* Header */}
            <header className="w-full py-6 px-8 flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-xl">description</span>
                    </div>
                    <Link href="/" className="text-xl font-bold tracking-tight text-gray-900 dark:text-white uppercase">
                        VirtualExamp
                    </Link>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                    >
                        <span className={`material-symbols-outlined ${isDark ? 'hidden' : 'block'}`}>dark_mode</span>
                        <span className={`material-symbols-outlined ${isDark ? 'block' : 'hidden'}`}>light_mode</span>
                    </button>
                    <nav className="hidden md:flex gap-6">
                        <Link href="/dashboard" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-700 transition-colors">
                            Dashboard
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center p-6">
                <div className="max-w-2xl w-full">
                    {/* Title */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Upload Exam File</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Import your simulation data to begin your professional certification practice session.
                        </p>
                    </div>

                    {/* Upload Zone */}
                    <div className="relative group">
                        <input
                            accept=".oef,.json,.pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            id="file-input"
                            onChange={handleFileSelect}
                            type="file"
                        />

                        {/* Default State */}
                        {!isLoading && uploadState === 'default' && (
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/50 rounded-2xl p-16 text-center transition-all group-hover:border-blue-700 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/10">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-500">file_upload</span>
                                </div>
                                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                    Drag and drop your file here
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    or <span className="text-blue-700 dark:text-blue-400 hover:underline font-medium">browse files</span> on your computer
                                </p>
                                <div className="flex justify-center gap-4 text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                    <span className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded">.OEF</span>
                                    <span className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded">.JSON</span>
                                    <span className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded">.PDF</span>
                                </div>
                            </div>
                        )}

                        {/* Loading State */}
                        {isLoading && (
                            <div className="border-2 border-blue-500 dark:border-blue-600 bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
                                {/* Simple CSS Spinner */}
                                <div className="inline-block w-16 h-16 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-6"></div>

                                {/* Main Message */}
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {fileName.endsWith('.pdf') ? 'Parsing PDF File...' : 'Processing File...'}
                                </h3>

                                {/* Sub Message */}
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    {fileName.endsWith('.pdf')
                                        ? 'Extracting questions from PDF, this may take a moment'
                                        : 'Analyzing exam content'}
                                </p>

                                {/* Warning Box */}
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 max-w-md mx-auto">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl flex-shrink-0 mt-0.5">warning</span>
                                        <div className="text-left">
                                            <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm mb-1">
                                                Please Wait
                                            </p>
                                            <p className="text-amber-800 dark:text-amber-300 text-xs">
                                                Do not refresh or navigate away from this page until the upload is complete.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Success State */}
                        {!isLoading && uploadState === 'success' && uploadedExam && (
                            <div className="border-2 border-green-500 bg-green-50/50 dark:bg-green-900/10 rounded-2xl p-16 text-center">
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
                                </div>
                                <p className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">Upload Successful</p>
                                <p className="text-gray-600 dark:text-gray-400 font-mono text-sm mb-2 italic">{fileName}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                                    Your exam has been uploaded successfully. Configure your simulation settings to get started.
                                </p>
                                <div className="flex flex-col sm:flex-row justify-center gap-3">
                                    <button
                                        onClick={() => router.push('/configure')}
                                        className="bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors z-20 flex items-center justify-center gap-2"
                                    >
                                        Configure Exam
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                    <button
                                        onClick={resetUpload}
                                        className="px-8 py-3 rounded-lg font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors z-20"
                                    >
                                        Choose Different File
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PDF Format Selection State */}
                        {!isLoading && uploadState === 'select-format' && (
                            <div className="border-2 border-blue-500 dark:border-blue-600 bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
                                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="material-symbols-outlined text-4xl text-blue-600 dark:text-blue-400">picture_as_pdf</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    Select Exam Format
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-2 font-mono text-sm italic">{fileName}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                                    Choose the parsing format that matches your PDF exam dump.
                                </p>

                                <div className="flex flex-col gap-3 max-w-sm mx-auto mb-8">
                                    <button
                                        onClick={() => { setPdfFormat('ccna'); handlePdfUpload('ccna'); }}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-gray-900 transition-all z-20 text-left"
                                    >
                                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">router</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">CCNA</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Cisco Certified Network Associate</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setPdfFormat('cc'); handlePdfUpload('cc'); }}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-gray-900 transition-all z-20 text-left"
                                    >
                                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">shield</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">CC - Certified in Cybersecurity</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">ISC2 Certified in Cybersecurity</p>
                                        </div>
                                    </button>
                                </div>

                                <button
                                    onClick={resetUpload}
                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors z-20"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Invalid State */}
                        {!isLoading && uploadState === 'invalid' && (
                            <div className="border-2 border-red-500 bg-red-50/50 dark:bg-red-900/10 rounded-2xl p-16 text-center">
                                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="material-symbols-outlined text-4xl text-red-600">error_outline</span>
                                </div>
                                <p className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Invalid File Format</p>
                                <p className="text-gray-600 dark:text-gray-400 mb-8">
                                    {error || 'Please upload only .oef or .json files. Check your file format and try again.'}
                                </p>
                                <button
                                    onClick={resetUpload}
                                    className="px-8 py-3 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors z-20"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Feature Cards */}
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center">
                            <span className="material-symbols-outlined text-gray-400 mb-2">lock</span>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-800 dark:text-gray-200">Secure</h3>
                            <p className="text-xs text-gray-500 mt-1">Files are processed locally and never stored.</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <span className="material-symbols-outlined text-gray-400 mb-2">verified</span>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-800 dark:text-gray-200">Validated</h3>
                            <p className="text-xs text-gray-500 mt-1">Automated syntax check on every import.</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <span className="material-symbols-outlined text-gray-400 mb-2">speed</span>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-800 dark:text-gray-200">Instant</h3>
                            <p className="text-xs text-gray-500 mt-1">Load thousands of questions in milliseconds.</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-8 px-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 dark:text-gray-600">
                <p>© 2024 VirtualExamp Simulation Platform. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                    <a href="#" className="hover:text-blue-700">Terms of Service</a>
                    <a href="#" className="hover:text-blue-700">Privacy Policy</a>
                    <a href="#" className="hover:text-blue-700">Compliance</a>
                </div>
            </footer>
        </div>
    );
}
