import React from 'react';
import type { RouteSegment } from '@/types';

interface RoutePathProps {
    segment: RouteSegment;
    color: string;
    isSelected?: boolean;
}

export const RoutePath: React.FC<RoutePathProps> = ({ segment, color, isSelected }) => {
    if (segment.points.length < 2) return null;

    // Arrowhead calculations helpers
    const lastPoint = segment.points[segment.points.length - 1];
    const secondLast = segment.points[segment.points.length - 2];

    // Calculate angle for marker
    const dx = lastPoint.x - secondLast.x;
    const dy = lastPoint.y - secondLast.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const length = Math.sqrt(dx * dx + dy * dy);

    // Trim the line path so it doesn't poke through the arrow tip
    // Retract 5px from the end
    const trim = 5;
    let visualPoints = [...segment.points];

    if (length > trim) {
        // Normalize vector
        const ux = dx / length;
        const uy = dy / length;
        // New end point
        visualPoints[visualPoints.length - 1] = {
            x: lastPoint.x - (ux * trim),
            y: lastPoint.y - (uy * trim)
        };
    }

    const pathData = visualPoints.map((p, i) =>
        i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
    ).join(' ');

    // Styles based on route type
    const strokeDasharray = segment.type === 'primary' ? 'none' : segment.type === 'option' ? '10,5' : '2,2'; // Check is dot
    const strokeWidth = isSelected ? 4 : 3;
    const strokeOpacity = segment.type === 'check' ? 0.7 : 1;



    return (
        <g className="pointer-events-none">
            <path
                d={pathData}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={strokeDasharray}
                opacity={strokeOpacity}
            />
            {/* Arrowhead */}
            <path
                d="M -20 -10 L 0 0 L -20 10"
                fill={color}
                transform={`translate(${lastPoint.x}, ${lastPoint.y}) rotate(${angle})`}
            />
        </g>
    );
};
