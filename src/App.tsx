import { useState, useEffect } from 'react'
import { Field } from '@/components/Field'
import { PlaybookSidebar } from '@/components/PlaybookSidebar'
import { PlayerToken } from '@/components/PlayerToken'
import { RoutePath } from '@/components/RoutePath'
import type { Point, RouteType, RouteSegment } from '@/types'
import { usePlaybook } from '@/hooks/usePlaybook'
import { S, clampPoint } from '@/lib/constants'

function App() {
  const {
    plays,
    currentPlay,
    currentPlayId,
    setCurrentPlayId,
    selectedPlayer,
    selectedPlayerId,
    setSelectedPlayerId,
    isSettingMotion,
    setIsSettingMotion,
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
  } = usePlaybook();

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeRouteType, setActiveRouteType] = useState<RouteType>('primary');
  const [drawingType, setDrawingType] = useState<RouteType>('primary');
  const [activeRoutePoints, setActiveRoutePoints] = useState<Point[]>([]);

  const startDrawing = () => {
    if (!selectedPlayer) return;
    setDrawingType(activeRouteType);
    setIsDrawing(true);
    // Start from motion end if exists, else position
    const startPos = calculateRouteStart(selectedPlayer);
    setActiveRoutePoints([startPos]);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setActiveRoutePoints([]);
    setIsSettingMotion(false);
  };

  const addToRoute = (point: Point) => {
    if (!isDrawing) return;
    setActiveRoutePoints([...activeRoutePoints, clampPoint(point)]);
  };

  const finishDrawing = () => {
    if (!isDrawing || !selectedPlayer || !currentPlay) return;
    const newRoute: RouteSegment = {
      id: crypto.randomUUID(),
      type: drawingType,
      points: activeRoutePoints
    };
    const updatedPlayers = currentPlay.players.map(p =>
      p.id === selectedPlayer.id
        ? { ...p, routes: [...p.routes.filter(r => r.type !== drawingType), newRoute] }
        : p
    );
    updateCurrentPlay({ ...currentPlay, players: updatedPlayers });
    setIsDrawing(false);
    setActiveRoutePoints([]);
  };

  const handleFieldClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) {
      if (selectedPlayerId) setSelectedPlayerId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    addToRoute({ x, y });
  };

  const handleExportPlaybook = () => {
    const data = JSON.stringify(plays, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `playbook-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isDrawing) finishDrawing();
      if (e.key === 'Escape') {
        if (isDrawing) cancelDrawing();
        else setSelectedPlayerId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, activeRoutePoints, setSelectedPlayerId]);

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden text-slate-100 font-sans select-none">
      <PlaybookSidebar
        plays={plays}
        currentPlayId={currentPlayId}
        selectedPlayer={selectedPlayer}
        onSelectPlay={(id) => {
          setCurrentPlayId(id);
          setSelectedPlayerId(null);
          cancelDrawing();
        }}
        onNewPlay={handleNewPlay}
        onSavePlay={() => localStorage.setItem('savedPlays', JSON.stringify(plays))}
        onDeletePlay={handleDeletePlay}
        onUpdatePlayName={handleUpdatePlayName}
        onStartDrawing={startDrawing}
        onClearRoutes={clearRoutes}
        onAddPlayer={handleAddPlayer}
        onUpdatePlayer={handleUpdatePlayer}
        onSetFormation={handleFormation}
        onApplyRoute={(preset) => handleApplyRoute(preset, activeRouteType)}
        onSetPosition={handleSetPosition}
        onExportPlaybook={handleExportPlaybook}
        onImportPlaybook={handleImportPlaybook}
        onCopyPlay={handleCopyPlay}
        activeRouteType={activeRouteType}
        onSetActiveRouteType={setActiveRouteType}
        isDrawing={isDrawing}
        onFinishDrawing={finishDrawing}
        // Motion props
        isSettingMotion={isSettingMotion}
        onSetMotionMode={() => setIsSettingMotion(!isSettingMotion)}
        onClearMotion={handleClearMotion}
      />

      <main className="flex-1 flex flex-col items-center justify-center bg-slate-900 p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-950 z-0">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-950 to-slate-950"></div>
        </div>

        <div className="z-10 flex flex-col items-center gap-4 h-full w-full justify-center">
          <div className="text-slate-300 font-mono text-sm flex gap-4 items-center">
            <span>{currentPlay ? currentPlay.name : "Select or create a play"}</span>
            {currentPlay && <span className="text-slate-500">| {currentPlay.players.length} Players</span>}
            {isDrawing && (
              <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded text-xs animate-pulse border border-yellow-500/30">
                DRAWING MODE (Click to add points, Enter to finish)
              </span>
            )}
            {isSettingMotion && (
              <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs animate-pulse border border-purple-500/30">
                SELECT MOTION TARGET (Click another player)
              </span>
            )}
          </div>

          <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-700 p-1 bg-slate-800 relative">
            <Field onClick={handleFieldClick} className={isDrawing ? 'cursor-crosshair' : isSettingMotion ? 'cursor-alias' : 'cursor-default'}>
              {/* Render Routes */}
              <svg className="absolute inset-0 pointer-events-none z-0" width="100%" height="100%">
                {/* 0. Render Motion Lines */}
                {currentPlay?.players.map(player => {
                  if (!player.motion) return null;
                  const start = player.position;
                  const end = player.motion;
                  const offset = S; // 1 yard back 
                  // U-shaped path back -> across -> forward
                  const points = [
                    `${start.x},${start.y}`,
                    `${start.x},${start.y + offset}`,
                    `${end.x},${end.y + offset}`,
                    `${end.x},${end.y}`
                  ].join(' ');

                  return (
                    <polyline
                      key={`motion-${player.id}`}
                      points={points}
                      stroke={player.color}
                      strokeWidth={4}
                      strokeOpacity={0.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}

                {/* 1. Render Background Routes (Option, Check) */}
                {currentPlay?.players.map(player => (
                  player.routes.filter(r => r.type !== 'primary').map(route => (
                    <RoutePath
                      key={route.id}
                      segment={route}
                      color={player.color}
                      isSelected={selectedPlayerId === player.id}
                    />
                  ))
                ))}
                {/* 2. Render Foreground Routes (Primary) */}
                {currentPlay?.players.map(player => (
                  player.routes.filter(r => r.type === 'primary').map(route => (
                    <RoutePath
                      key={route.id}
                      segment={route}
                      color={player.color}
                      isSelected={selectedPlayerId === player.id}
                    />
                  ))
                ))}
                {/* Active Drawing Route (Always top) */}
                {isDrawing && activeRoutePoints.length > 0 && (
                  <RoutePath
                    segment={{ id: 'drawing', type: drawingType, points: activeRoutePoints }}
                    color={selectedPlayer?.color || '#000'} // Ensure visible on white field
                    isSelected={true}
                  />
                )}
              </svg>

              {currentPlay?.players.map(player => (
                <PlayerToken
                  key={player.id}
                  player={player}
                  isSelected={selectedPlayerId === player.id}
                  onSelect={(id) => {
                    if (isSettingMotion) {
                      handleMotionSet(id);
                    } else if (!isDrawing) {
                      setSelectedPlayerId(id);
                    }
                  }}
                />
              ))}
            </Field>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
