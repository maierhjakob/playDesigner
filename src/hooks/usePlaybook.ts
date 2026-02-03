import { useState, useEffect } from 'react';
import type { Play, Player, Point, RouteSegment, RouteType } from '@/types';
import { POSITIONS, getPos, S, clampPoint } from '@/lib/constants';
import { generateRoutePoints } from '@/lib/routes';
import type { RoutePreset } from '@/lib/routes';

export function usePlaybook() {
    const [plays, setPlays] = useState<Play[]>(() => {
        const saved = localStorage.getItem('savedPlays');
        return saved ? JSON.parse(saved) : [];
    });
    const [currentPlayId, setCurrentPlayId] = useState<string | null>(null);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [isSettingMotion, setIsSettingMotion] = useState(false);

    const currentPlay = plays.find(p => p.id === currentPlayId) || null;
    const selectedPlayer = currentPlay?.players.find(p => p.id === selectedPlayerId) || null;

    useEffect(() => {
        localStorage.setItem('savedPlays', JSON.stringify(plays));
    }, [plays]);

    const updateCurrentPlay = (updatedPlay: Play) => {
        setPlays(prev => prev.map(p => p.id === updatedPlay.id ? updatedPlay : p));
    };

    const handleNewPlay = () => {
        const defaultPlayers: Player[] = [
            { id: crypto.randomUUID(), role: 'C', label: '', color: POSITIONS['C'].color, position: getPos(0, -1), routes: [] },
            { id: crypto.randomUUID(), role: 'QB', label: '', color: POSITIONS['QB'].color, position: getPos(0, -4), routes: [] },
            { id: crypto.randomUUID(), role: 'WR-L', label: '', color: POSITIONS['WR-L'].color, position: getPos(-10, -1), routes: [] },
            { id: crypto.randomUUID(), role: 'WR-R', label: '', color: POSITIONS['WR-R'].color, position: getPos(10, -1), routes: [] },
            { id: crypto.randomUUID(), role: 'SR', label: '', color: POSITIONS['SR'].color, position: getPos(5, -1), routes: [] },
        ];

        const newPlay: Play = {
            id: crypto.randomUUID(),
            name: `Play ${plays.length + 1}`,
            players: defaultPlayers
        };
        setPlays(prev => [...prev, newPlay]);
        setCurrentPlayId(newPlay.id);
        setSelectedPlayerId(null);
        return newPlay;
    };

    const handleDeletePlay = (id: string) => {
        setPlays(prev => prev.filter(p => p.id !== id));
        if (currentPlayId === id) {
            setCurrentPlayId(null);
            setSelectedPlayerId(null);
        }
    };

    const handleCopyPlay = (id: string) => {
        const playToCopy = plays.find(p => p.id === id);
        if (!playToCopy) return;

        const newPlay: Play = {
            ...playToCopy,
            id: crypto.randomUUID(),
            name: `${playToCopy.name} (Copy)`,
            players: playToCopy.players.map(player => ({
                ...player,
                id: crypto.randomUUID(),
                routes: player.routes.map(route => ({
                    ...route,
                    id: crypto.randomUUID()
                }))
            }))
        };

        setPlays(prev => [...prev, newPlay]);
        setCurrentPlayId(newPlay.id);
        setSelectedPlayerId(null);
    };

    const handleUpdatePlayName = (id: string, name: string) => {
        setPlays(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    };

    const handleAddPlayer = () => {
        if (!currentPlay) return;
        const newPlayer: Player = {
            id: crypto.randomUUID(),
            role: 'WR-L',
            label: '',
            color: '#3b82f6',
            position: getPos(-5, 0),
            routes: []
        };
        const updatedPlayers = [...currentPlay.players, newPlayer];
        updateCurrentPlay({ ...currentPlay, players: updatedPlayers });
        setSelectedPlayerId(newPlayer.id);
    };

    const handleUpdatePlayer = (id: string, updates: Partial<Player>) => {
        if (!currentPlay) return;

        let routeShift = { x: 0, y: 0 };
        const player = currentPlay.players.find(p => p.id === id);

        if (player && 'motion' in updates) {
            const oldStart = player.motion || player.position;
            const newMotion = updates.motion;

            if (newMotion) {
                const dx = newMotion.x - oldStart.x;
                const dy = newMotion.y - oldStart.y;
                routeShift = { x: dx, y: dy };
            } else if (newMotion === null && player.motion) {
                const dx = player.position.x - player.motion.x;
                const dy = player.position.y - player.motion.y;
                routeShift = { x: dx, y: dy };
            }
        }

        const updatedPlayers = currentPlay.players.map(p => {
            if (p.id !== id) return p;

            const updatedPlayer = { ...p, ...updates };

            if (routeShift.x !== 0 || routeShift.y !== 0) {
                updatedPlayer.routes = p.routes.map(r => ({
                    ...r,
                    points: r.points.map(pt => clampPoint({
                        x: pt.x + routeShift.x,
                        y: pt.y + routeShift.y
                    }))
                }));
            }

            return updatedPlayer;
        });

        updateCurrentPlay({ ...currentPlay, players: updatedPlayers });
    };

    const handleSetPosition = (roleKey: string) => {
        if (!selectedPlayer || !currentPlay) return;

        const targetPosDef = POSITIONS[roleKey as keyof typeof POSITIONS];
        if (!targetPosDef) return;

        const basePos = getPos(targetPosDef.x, targetPosDef.depth);
        let finalPos = { ...basePos };
        let collision = true;
        let attempts = 0;

        while (collision && attempts < 5) {
            const isOccupied = currentPlay.players.some(p =>
                p.id !== selectedPlayer.id &&
                Math.abs(p.position.x - finalPos.x) < 5 &&
                Math.abs(p.position.y - finalPos.y) < 5
            );

            if (isOccupied) {
                finalPos.x += (1.5 * S);
                attempts++;
            } else {
                collision = false;
            }
        }

        const updatedPlayers = currentPlay.players.map(p =>
            p.id === selectedPlayer.id ? {
                ...p,
                role: targetPosDef.role,
                label: targetPosDef.label,
                color: targetPosDef.color,
                position: finalPos
            } : p
        );
        updateCurrentPlay({ ...currentPlay, players: updatedPlayers });
    };

    const handleFormation = (type: 'strong-left' | 'strong-right') => {
        if (!currentPlay) return;

        const C = { role: 'C', label: 'C', position: getPos(0, -1) };
        const QB = { role: 'QB', label: 'QB', position: getPos(0, -4) };
        const WRL = { role: 'WR-L', label: 'L', position: getPos(-10, -1) };
        const WRR = { role: 'WR-R', label: 'R', position: getPos(10, -1) };
        const Slot = type === 'strong-left'
            ? { role: 'SL', label: 'SL', position: getPos(-5, -1) }
            : { role: 'SR', label: 'SR', position: getPos(5, -1) };

        const formations = [C, QB, WRL, WRR, Slot];

        const newPlayers = formations.map((f, i) => ({
            id: currentPlay.players[i]?.id || crypto.randomUUID(),
            role: f.role,
            label: '', // Reset labels to empty
            color: currentPlay.players[i]?.color || '#ef4444',
            position: f.position,
            routes: []
        }));

        updateCurrentPlay({ ...currentPlay, players: newPlayers });
    };

    const calculateRouteStart = (player: Player): Point => {
        return player.motion || player.position;
    };

    const handleApplyRoute = (preset: RoutePreset, activeRouteType: RouteType) => {
        if (!selectedPlayer || !currentPlay) return;

        const startPos = calculateRouteStart(selectedPlayer);
        const points = generateRoutePoints(startPos, preset);

        const newRoute: RouteSegment = {
            id: crypto.randomUUID(),
            type: activeRouteType,
            points: points
        };

        const updatedPlayers = currentPlay.players.map(p =>
            p.id === selectedPlayer.id
                ? { ...p, routes: [...p.routes.filter(r => r.type !== activeRouteType), newRoute] }
                : p
        );
        updateCurrentPlay({ ...currentPlay, players: updatedPlayers });
    };

    const clearRoutes = () => {
        if (!selectedPlayer || !currentPlay) return;
        const updatedPlayers = currentPlay.players.map(p =>
            p.id === selectedPlayer.id ? { ...p, routes: [] } : p
        );
        updateCurrentPlay({ ...currentPlay, players: updatedPlayers });
    };

    // Motion Logic
    const handleMotionSet = (targetId: string) => {
        if (!selectedPlayer || !currentPlay) return;
        const targetPlayer = currentPlay.players.find(p => p.id === targetId);
        if (!targetPlayer) return;

        const motionEnd: Point = {
            x: targetPlayer.position.x,
            y: selectedPlayer.position.y
        };

        const oldStart = selectedPlayer.motion || selectedPlayer.position;
        const dx = motionEnd.x - oldStart.x;
        const dy = motionEnd.y - oldStart.y;

        const updatedPlayers = currentPlay.players.map(p => {
            if (p.id !== selectedPlayer.id) return p;
            return {
                ...p,
                motion: motionEnd,
                routes: p.routes.map(r => ({
                    ...r,
                    points: r.points.map((pt) => clampPoint({ x: pt.x + dx, y: pt.y + dy }))
                }))
            };
        });

        updateCurrentPlay({ ...currentPlay, players: updatedPlayers });
        setIsSettingMotion(false);
    };

    const handleClearMotion = () => {
        if (!selectedPlayer || !currentPlay || !selectedPlayer.motion) return;

        const oldStart = selectedPlayer.motion;
        const newStart = selectedPlayer.position;
        const dx = newStart.x - oldStart.x;
        const dy = newStart.y - oldStart.y;

        const updatedPlayers = currentPlay.players.map(p => {
            if (p.id !== selectedPlayer.id) return p;
            return {
                ...p,
                motion: null,
                routes: p.routes.map(r => ({
                    ...r,
                    points: r.points.map(pt => clampPoint({ x: pt.x + dx, y: pt.y + dy }))
                }))
            };
        });
        updateCurrentPlay({ ...currentPlay, players: updatedPlayers });
    };

    // Import
    const handleImportPlaybook = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const rawPlays = JSON.parse(e.target?.result as string);
                if (Array.isArray(rawPlays)) {
                    const sanitizedPlays: Play[] = rawPlays.map(play => ({
                        ...play,
                        id: crypto.randomUUID(),
                        players: play.players.map((player: Player) => ({
                            ...player,
                            id: crypto.randomUUID(),
                            routes: player.routes.map(route => ({
                                ...route,
                                id: crypto.randomUUID()
                            }))
                        }))
                    }));

                    setPlays(prev => [...prev, ...sanitizedPlays]);
                    alert(`Successfully imported ${sanitizedPlays.length} plays!`);
                }
            } catch (err) {
                alert("Failed to import playbook. Invalid JSON file.");
            }
        };
        reader.readAsText(file);
    };


    return {
        plays,
        setPlays, // Exposed if needed, but perfer handlers
        currentPlayId,
        setCurrentPlayId,
        selectedPlayerId,
        setSelectedPlayerId,
        currentPlay,
        selectedPlayer,
        isSettingMotion,
        setIsSettingMotion,

        // Actions
        handleNewPlay,
        handleDeletePlay,
        handleCopyPlay,
        handleUpdatePlayName,
        handleAddPlayer,
        handleUpdatePlayer,
        handleSetPosition,
        handleFormation,
        handleApplyRoute,
        clearRoutes,
        handleMotionSet,
        handleClearMotion,
        handleImportPlaybook,
        updateCurrentPlay,
        calculateRouteStart
    };
}
