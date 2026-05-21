'use client';

import { useRef, useState, useCallback } from 'react';

interface UploadZoneProps {
    onFileSelect: (file: File) => void;
    accept?: string;
    maxSizeMB?: number;
}

export default function UploadZone({
    onFileSelect,
    accept = '.oef,.json',
    maxSizeMB = 50
}: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateFile = (file: File): string | null => {
        // Check file size
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            return `File size must be less than ${maxSizeMB}MB`;
        }

        // Check file extension
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        const allowedExtensions = accept.split(',').map(e => e.trim().toLowerCase());
        if (!allowedExtensions.includes(extension)) {
            return `Invalid file type. Allowed: ${accept}`;
        }

        return null;
    };

    const handleFile = useCallback((file: File) => {
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);
        onFileSelect(file);
    }, [onFileSelect, accept, maxSizeMB]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div>
            <div
                className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    onChange={handleInputChange}
                    className="hidden"
                />

                <svg
                    className="upload-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>

                <div className="upload-title">
                    Drop your exam file here
                </div>
                <div className="upload-description">
                    or click to browse. Supports .oef and .json files (max {maxSizeMB}MB)
                </div>
            </div>

            {error && (
                <div className="input-error mt-4 text-center">
                    {error}
                </div>
            )}
        </div>
    );
}
