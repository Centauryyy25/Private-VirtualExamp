'use client';

interface ScoreGaugeProps {
    score: number;
    passPercentage?: number;
    size?: number;
}

export default function ScoreGauge({
    score,
    passPercentage = 70,
    size = 200
}: ScoreGaugeProps) {
    const passed = score >= passPercentage;
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const primaryColor = passed ? '#10b981' : '#ef4444';
    const bgColor = '#e5e7eb';

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg
                width={size}
                height={size}
                style={{ transform: 'rotate(-90deg)' }}
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={bgColor}
                    strokeWidth="12"
                />

                {/* Score circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{
                        transition: 'stroke-dashoffset 1s ease-out',
                    }}
                />

                {/* Pass threshold marker */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="4"
                    strokeDasharray={`2 ${circumference - 2}`}
                    strokeDashoffset={circumference - (passPercentage / 100) * circumference}
                    opacity={0.5}
                />
            </svg>

            {/* Center text */}
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                }}
            >
                <div style={{
                    fontSize: size / 4,
                    fontWeight: 700,
                    color: primaryColor,
                    lineHeight: 1,
                }}>
                    {Math.round(score)}%
                </div>
                <div style={{
                    fontSize: size / 14,
                    color: '#6b7280',
                    marginTop: 4,
                }}>
                    {passed ? 'PASSED' : 'FAILED'}
                </div>
            </div>
        </div>
    );
}
