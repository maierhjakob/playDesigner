import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Player } from '@/types';

interface PlayerTokenProps {
    player: Player;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
}

export const PlayerToken: React.FC<PlayerTokenProps> = ({ player, isSelected, onSelect }) => {
    return (
        <motion.div
            initial={{ x: player.position.x, y: player.position.y }}
            animate={{ x: player.position.x, y: player.position.y }}
            // Drag handling removed
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.(player.id);
            }}
            className={cn(
                "absolute w-8 h-8 rounded-full border-2 border-slate-700 flex items-center justify-center text-xs font-bold shadow-md cursor-pointer z-20 text-white transition-all -translate-x-1/2 -translate-y-1/2",
                isSelected ? "ring-2 ring-cyan-400 border-white" : ""
            )}
            style={{
                backgroundColor: player.color,
            }}
            title={`${player.role} - ${player.label}`}
        >
            {player.label}
        </motion.div>
    );
};
