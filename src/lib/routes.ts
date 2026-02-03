import { FIELD_WIDTH_YARDS, TOTAL_LENGTH_YARDS, YARD_TO_PX } from '@/components/Field';
import type { Point } from '@/types';

export type RoutePreset =
    | 'hitch'
    | 'out-5'
    | 'in-5'
    | 'slant'
    | 'post'
    | 'corner'
    | 'go'
    | 'comeback';

export const ROUTE_PRESETS: { label: string; value: RoutePreset }[] = [
    { label: 'Stop', value: 'hitch' },
    { label: 'Out (5)', value: 'out-5' },
    { label: 'In (5)', value: 'in-5' },
    { label: 'Slant', value: 'slant' },
    { label: 'Post', value: 'post' },
    { label: 'Go', value: 'go' },
    { label: 'Comeback', value: 'comeback' },
    { label: 'Corner', value: 'corner' },
];

export const generateRoutePoints = (start: Point, preset: RoutePreset): Point[] => {
    const points: Point[] = [start];
    const S = YARD_TO_PX;
    const CENTER_X = (FIELD_WIDTH_YARDS * S) / 2;

    // LOS Calculations
    // LOS is 5 yards from bottom. Total 25. LOS Y = (25 - 5) * S = 20 * S.
    // SVG Y reduces as we go up field.
    const LOS_YARD_FROM_TOP = TOTAL_LENGTH_YARDS - 5;


    // Helper to get pixels for a target "Yards Gained" (positive is downfield)
    // Yard 5 = LOS - 5 yards = (20 - 5) * S = 15 * S.
    const getY = (yardsGained: number) => {
        return (LOS_YARD_FROM_TOP - yardsGained) * S;
    };

    // Determine side relative to center
    const isLeft = start.x < CENTER_X;
    const dirIn = isLeft ? 1 : -1;
    const dirOut = isLeft ? -1 : 1;

    // Helper to add point relative to LAST point
    const addRel = (dxYards: number, dyYards: number) => {
        const last = points[points.length - 1];
        points.push({
            x: last.x + (dxYards * S),
            y: last.y - (dyYards * S) // Y is inverted in SVG
        });
    };

    // Helper to add point at ABSOLUTE yards gained depth, but relative/absolute X
    // Uses last X as base, adds dxYards. Sets Y to exact yard line.
    const addAbsDepth = (dxYards: number, depthYards: number) => {
        const last = points[points.length - 1];
        points.push({
            x: last.x + (dxYards * S),
            y: getY(depthYards)
        });
    };

    switch (preset) {
        case 'hitch':
            // Go to 5 yards depth directly
            addAbsDepth(0, 6);
            addRel(1 * dirIn, -1);
            break;
        case 'out-5':
            addAbsDepth(0, 5); // To 5y line
            addRel(5 * dirOut, 0); // Cut out
            break;
        case 'in-5':
            addAbsDepth(0, 5); // To 5y line
            addRel(5 * dirIn, 0); // Cut in
            break;
        case 'slant':
            addAbsDepth(0, 1);
            addRel(3 * dirIn, 2); // Diagonal
            break;
        case 'post':
            addAbsDepth(0, 7); // Break at 7y (standard deep post break?)
            addRel(5 * dirIn, 7); // Deep middle
            break;
        case 'corner':
            addAbsDepth(0, 7);
            addRel(5 * dirOut, 5); // Deep corner
            break;
        case 'go':
            addAbsDepth(0, 7); // Just go deep
            addRel(1 * dirOut, 7); // Deep corner
            break;
        case 'comeback':
            addAbsDepth(0, 12); // Drive deep to 12
            addRel(2 * dirOut, 2); // 45 deg back to sideline? 
            // actually comeback is usually back towards LOS (+Y in svg).
            // addRel dy is "yards UP field". So -2 is back.
            const last = points[points.length - 1];
            points.push({
                x: last.x + (2 * dirOut * S),
                y: last.y + (2 * S) // +Y is down (back towards LOS)
            });
            break;
    }

    return points;
};
