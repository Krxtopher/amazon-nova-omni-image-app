interface IconProps {
    className?: string;
    size?: number;
}

export function VerticalMasonryIcon({ className = '', size = 20 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Column 1 - Tall blocks */}
            <rect x="2" y="2" width="4" height="6" fill="currentColor" rx="0.5" />
            <rect x="2" y="9" width="4" height="4" fill="currentColor" rx="0.5" />
            <rect x="2" y="14" width="4" height="4" fill="currentColor" rx="0.5" />

            {/* Column 2 - Mixed heights */}
            <rect x="7" y="2" width="4" height="4" fill="currentColor" rx="0.5" />
            <rect x="7" y="7" width="4" height="7" fill="currentColor" rx="0.5" />
            <rect x="7" y="15" width="4" height="3" fill="currentColor" rx="0.5" />

            {/* Column 3 - Different pattern */}
            <rect x="12" y="2" width="4" height="5" fill="currentColor" rx="0.5" />
            <rect x="12" y="8" width="4" height="3" fill="currentColor" rx="0.5" />
            <rect x="12" y="12" width="4" height="6" fill="currentColor" rx="0.5" />
        </svg>
    );
}

export function HorizontalMasonryIcon({ className = '', size = 20 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Row 1 - Wide blocks */}
            <rect x="2" y="2" width="6" height="3" fill="currentColor" rx="0.5" />
            <rect x="9" y="2" width="4" height="3" fill="currentColor" rx="0.5" />
            <rect x="14" y="2" width="4" height="3" fill="currentColor" rx="0.5" />

            {/* Row 2 - Mixed widths */}
            <rect x="2" y="6" width="4" height="3" fill="currentColor" rx="0.5" />
            <rect x="7" y="6" width="7" height="3" fill="currentColor" rx="0.5" />
            <rect x="15" y="6" width="3" height="3" fill="currentColor" rx="0.5" />

            {/* Row 3 - Different pattern */}
            <rect x="2" y="10" width="5" height="3" fill="currentColor" rx="0.5" />
            <rect x="8" y="10" width="3" height="3" fill="currentColor" rx="0.5" />
            <rect x="12" y="10" width="6" height="3" fill="currentColor" rx="0.5" />

            {/* Row 4 - Bottom row */}
            <rect x="2" y="14" width="8" height="3" fill="currentColor" rx="0.5" />
            <rect x="11" y="14" width="7" height="3" fill="currentColor" rx="0.5" />
        </svg>
    );
}