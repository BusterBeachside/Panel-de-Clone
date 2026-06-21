import React, { useRef } from "react";
import { Grid, Position, PanelData, FloatText } from "../types";
import { GRID_WIDTH, GRID_HEIGHT } from "../constants";
import { Panel } from "./Panel";
import { Cursor } from "./Cursor";
import { motion, AnimatePresence } from "motion/react";

interface GameBoardProps {
  grid: Grid;
  nextRow: (PanelData | null)[];
  cursor: Position;
  risingOffset: number;
  activeEffects: FloatText[];
  isPaused: boolean;
  mode?: "endless" | "tycoon";
  onTouchSwap?: (
    x: number,
    y: number,
    dx: -1 | 1,
    fast: boolean,
  ) => "SUCCESS" | "FAIL" | "RATE_LIMITED";
  onSetCursor?: (x: number, y: number) => void;
  onTouchRaise?: (active: boolean) => void;
  rowsRaised: number;
  powerUpSelection: { type: string; x: number; y: number } | null;
  powerUpTimers: { sloMo: number; scoreSurge: number; coinShower: number; colorZapper: number };
  stopTimer: number;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  grid,
  nextRow,
  cursor,
  risingOffset,
  activeEffects,
  isPaused,
  mode,
  onTouchSwap,
  onSetCursor,
  onTouchRaise,
  rowsRaised,
  powerUpSelection,
  powerUpTimers,
  stopTimer,
}) => {
  const columnDanger = Array(GRID_WIDTH).fill(false);
  if (mode !== "tycoon") {
    for (let x = 0; x < GRID_WIDTH; x++) {
      for (let y = GRID_HEIGHT - 2; y < GRID_HEIGHT; y++) {
        if (grid[y][x]) {
          columnDanger[x] = true;
          break;
        }
      }
    }
  }

  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    currentX: number;
    targetX: number;
    stealthSwaps: number;
    startRowsRaised: number;
    lastFrameTime: number;
  }>({
    active: false,
    pointerId: -1,
    startX: -1,
    startY: -1,
    currentX: -1,
    targetX: -1,
    stealthSwaps: 0,
    startRowsRaised: 0,
    lastFrameTime: 0,
  });

  const propsRef = useRef({ onTouchSwap, onSetCursor, rowsRaised });
  propsRef.current = { onTouchSwap, onSetCursor, rowsRaised };

  React.useEffect(() => {
    let frameId: number;
    const processDrag = (time: number) => {
      const { onTouchSwap, onSetCursor, rowsRaised } = propsRef.current;
      if (dragRef.current.active && onTouchSwap) {
        // Wait at least a small amount of time between swaps to allow state to settle, if we are rapidly sweeping
        if (time - dragRef.current.lastFrameTime > 16) {
          if (dragRef.current.targetX !== dragRef.current.currentX) {
            const dx =
              dragRef.current.targetX > dragRef.current.currentX ? 1 : -1;
            const fast = dragRef.current.stealthSwaps > 0;
            const currentTrackerY =
              dragRef.current.startY +
              (rowsRaised - dragRef.current.startRowsRaised);

            if (currentTrackerY >= GRID_HEIGHT) {
              dragRef.current.active = false;
            } else {
              const result = onTouchSwap(
                dragRef.current.currentX,
                currentTrackerY,
                dx,
                fast,
              );
              if (result === "SUCCESS") {
                if (dragRef.current.stealthSwaps > 0) {
                  dragRef.current.stealthSwaps--;
                }
                dragRef.current.currentX += dx;
                onSetCursor?.(
                  Math.min(
                    dragRef.current.currentX,
                    dragRef.current.currentX - dx,
                  ),
                  currentTrackerY,
                );
                dragRef.current.lastFrameTime = time;
              } else if (result === "FAIL") {
                dragRef.current.active = false;
              } else if (result === "RATE_LIMITED") {
                // Do nothing, wait for next frame
              }
            }
          }
        }
      }
      frameId = requestAnimationFrame(processDrag);
    };
    frameId = requestAnimationFrame(processDrag);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const getLogicalPosition = (clientX: number, clientY: number) => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const xPercent = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );
    const yPercent = Math.max(
      0,
      Math.min(1, (rect.bottom - clientY) / rect.height),
    ); // From bottom

    const x = Math.floor(xPercent * GRID_WIDTH);
    const y = Math.floor(yPercent * GRID_HEIGHT - risingOffset);
    return {
      x: Math.max(0, Math.min(x, GRID_WIDTH - 1)),
      y: Math.max(0, Math.min(y, GRID_HEIGHT - 1)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPaused) return;

    if (e.button === 2) {
      e.preventDefault();
      onTouchRaise?.(true);
      return;
    }

    const pos = getLogicalPosition(e.clientX, e.clientY);
    if (!pos) return;
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      targetX: pos.x,
      stealthSwaps: 2,
      startRowsRaised: propsRef.current.rowsRaised,
      lastFrameTime: performance.now(),
    };
    if (e.target instanceof HTMLElement) {
      e.target.setPointerCapture(e.pointerId);
    }
    onSetCursor?.(Math.min(pos.x, GRID_WIDTH - 2), pos.y);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || e.pointerId !== dragRef.current.pointerId)
      return;
    const pos = getLogicalPosition(e.clientX, e.clientY);
    if (!pos) return;

    // We update targetX to match the finger's absolute logical column!
    if (pos.x !== dragRef.current.targetX) {
      dragRef.current.targetX = pos.x;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      onTouchRaise?.(false);
      return;
    }

    if (dragRef.current.pointerId === e.pointerId) {
      dragRef.current.active = false;
      if (
        e.target instanceof HTMLElement &&
        e.target.hasPointerCapture(e.pointerId)
      ) {
        e.target.releasePointerCapture(e.pointerId);
      }
    }
  };

  return (
    <div
      className="relative bg-indigo-950 border-[12px] border-indigo-400 rounded-[2rem] shadow-2xl overflow-hidden aspect-[1/2] w-full max-w-[320px] lg:w-[320px] lg:h-[640px] flex items-end p-2 mx-auto touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="relative w-full h-full overflow-hidden pointer-events-none"
        ref={boardRef}
      >
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `translateY(calc(-${risingOffset} * 100% / 12))`,
          }}
        >
          {/* Visible Grid and Next Row */}
          {nextRow.map((panel, x) =>
            panel ? (
              <div
                key={panel.id}
                className="absolute opacity-50 contrast-50 grayscale-[0.5]"
                style={{
                  width: "calc(100%/6)",
                  height: "calc(100%/12)",
                  left: `${(x * 100) / 6}%`,
                  bottom: `calc(-100% / 12)`,
                }}
              >
                <Panel type={panel.type} state="IDLE" stateTimer={0} />
              </div>
            ) : null,
          )}

          {grid.flatMap((row, y) =>
            row.map((panel, x) =>
              panel ? (
                <div
                  key={panel.id}
                  className="absolute"
                  style={{
                    width: "calc(100%/6)",
                    height: "calc(100%/12)",
                    left: `${(x * 100) / 6}%`,
                    bottom: `calc(${y} * 100% / 12)`,
                    transition:
                      panel.state === "FALLING"
                        ? "bottom 0.05s linear"
                        : "none",
                    zIndex: panel.state === "FALLING" ? 10 : 1,
                  }}
                >
                  <Panel
                    type={panel.type}
                    state={panel.state}
                    stateTimer={panel.stateTimer}
                    isDanger={columnDanger[x]}
                  />
                </div>
              ) : null,
            ),
          )}

          <Cursor x={cursor.x} y={cursor.y} risingOffset={0} />

          {/* Power Up Selection Highlight */}
          {powerUpSelection && (
            <motion.div
              layoutId="power-up-highlight"
              className="absolute z-20 pointer-events-none"
              style={{
                width: powerUpSelection.type === "lineBomb" ? "100%" : "calc(100%/6 * 3)",
                height: powerUpSelection.type === "lineBomb" ? "calc(100%/12)" : "calc(100%/12 * 3)",
                left: powerUpSelection.type === "lineBomb" ? "0%" : `calc(${powerUpSelection.x} * 100% / 6)`,
                bottom: `calc(${powerUpSelection.y} * 100% / 12)`,
              }}
            >
              {powerUpSelection.type === "lineBomb" ? (
                <div className="w-full h-full bg-white/20 border-4 border-white animate-pulse relative">
                  <div className="absolute inset-0 bg-red-500/10 border-2 border-red-400" />
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-yellow-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-yellow-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-yellow-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-yellow-400" />
                </div>
              ) : (
                <div className="w-full h-full relative">
                  {/* staircase pattern: 6 blocks in 3x3 */}
                  {/* Row 2: (2,2) */}
                  <div className="absolute animate-pulse" style={{ width: '33.33%', height: '33.33%', left: '66.66%', bottom: '66.66%', backgroundColor: 'rgba(255,100,100,0.3)', border: '4px solid white' }} />
                  {/* Row 1: (1,1), (2,1) */}
                  <div className="absolute animate-pulse" style={{ width: '33.33%', height: '33.33%', left: '33.33%', bottom: '33.33%', backgroundColor: 'rgba(255,100,100,0.3)', border: '4px solid white' }} />
                  <div className="absolute animate-pulse" style={{ width: '33.33%', height: '33.33%', left: '66.66%', bottom: '33.33%', backgroundColor: 'rgba(255,100,100,0.3)', border: '4px solid white' }} />
                  {/* Row 0: (0,0), (1,0), (2,0) */}
                  <div className="absolute animate-pulse" style={{ width: '33.33%', height: '33.33%', left: '0%', bottom: '0%', backgroundColor: 'rgba(255,100,100,0.3)', border: '4px solid white' }} />
                  <div className="absolute animate-pulse" style={{ width: '33.33%', height: '33.33%', left: '33.33%', bottom: '0%', backgroundColor: 'rgba(255,100,100,0.3)', border: '4px solid white' }} />
                  <div className="absolute animate-pulse" style={{ width: '33.33%', height: '33.33%', left: '66.66%', bottom: '0%', backgroundColor: 'rgba(255,100,100,0.3)', border: '4px solid white' }} />
                  
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-yellow-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-yellow-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-yellow-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-yellow-400" />
                </div>
              )}
            </motion.div>
          )}

        </div>

        <AnimatePresence>
          {activeEffects.map((effect) => (
            <motion.div
              key={effect.id}
              initial={{ opacity: 0, y: 10, scale: 0.5 }}
              animate={{ opacity: 1, y: -20, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute ${effect.isCoin ? "z-40" : "z-30"} pointer-events-none flex flex-col items-center drop-shadow-md`}
              style={{
                left: `calc(${effect.x} * 100% / 6)`,
                bottom: `calc(${(effect.y + (effect.offset || 0) + (effect.isCoin ? 1.5 : 0))} * 100% / 12)`,
                width: "calc(100% / 6)",
              }}
            >
              {effect.chain > 0 && !effect.isCoin && (
                <div className="bg-[#00AA00] border-[2px] border-white text-yellow-300 font-black text-sm w-8 h-8 flex items-center justify-center shadow-md -mt-2 rounded-sm relative">
                  x{effect.chain}
                  <div className="absolute top-[2px] left-[2px] w-1 h-1 bg-white/70 rounded-full"></div>
                </div>
              )}
              {effect.combo > 3 && !effect.isCoin && (
                <div className="bg-[#DD0000] border-[2px] border-white text-yellow-300 font-black text-sm w-8 h-8 flex items-center justify-center shadow-md mt-1 rounded-sm relative">
                  +{effect.combo}
                  <div className="absolute top-[2px] left-[2px] w-1 h-1 bg-white/70 rounded-full"></div>
                </div>
              )}
              {effect.isCoin && (
                <div className="flex items-center justify-center animate-bounce">
                  <div className="relative w-10 h-10 bg-yellow-400 rounded-full border-4 border-yellow-600 shadow-lg flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-yellow-500 rounded-full flex items-center justify-center text-yellow-700 font-black text-xl">
                      P
                    </div>
                  </div>
                  {effect.amount && effect.amount > 1 ? (
                    <span className="text-sm bg-yellow-900 border border-yellow-500 text-yellow-300 font-bold ml-1 px-1 rounded-sm">
                      x{effect.amount}
                    </span>
                  ) : null}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isPaused && (
        <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center">
          <div className="text-white font-black text-4xl tracking-widest uppercase drop-shadow-xl animate-pulse">
            Paused
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-full h-12 flex items-center justify-center pointer-events-none"></div>

      {/* Power Up Timers */}
      <div className="absolute top-4 right-4 z-40 flex flex-row-reverse flex-wrap gap-2 pointer-events-none max-w-[90%]">
        {stopTimer > 0 && (
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-red-600/80 border border-red-400 text-white rounded-full px-3 py-1 flex items-center gap-2 shadow-lg backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-red-300 animate-pulse" />
            <span className="text-[10px] font-black uppercase">Stop</span>
            <span className="text-sm font-mono tracking-tighter">
              {(stopTimer / 1000).toFixed(1)}s
            </span>
          </motion.div>
        )}
        {powerUpTimers.sloMo > 0 && (
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-blue-600/80 border border-blue-400 text-white rounded-full px-3 py-1 flex items-center gap-2 shadow-lg backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />
            <span className="text-[10px] font-black uppercase">Slo-Mo</span>
            <span className="text-sm font-mono tracking-tighter">
              {(powerUpTimers.sloMo / 1000).toFixed(1)}s
            </span>
          </motion.div>
        )}
        {powerUpTimers.scoreSurge > 0 && (
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-purple-600/80 border border-purple-400 text-white rounded-full px-3 py-1 flex items-center gap-2 shadow-lg backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-purple-300 animate-pulse" />
            <span className="text-[10px] font-black uppercase">Score x2</span>
            <span className="text-sm font-mono tracking-tighter">
              {(powerUpTimers.scoreSurge / 1000).toFixed(1)}s
            </span>
          </motion.div>
        )}
        {powerUpTimers.coinShower > 0 && (
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-yellow-600/80 border border-yellow-400 text-black rounded-full px-3 py-1 flex items-center gap-2 shadow-lg backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-yellow-200 animate-pulse" />
            <span className="text-[10px] font-black uppercase font-bold">Coins x2</span>
            <span className="text-sm font-mono tracking-tighter font-bold">
              {(powerUpTimers.coinShower / 1000).toFixed(1)}s
            </span>
          </motion.div>
        )}
        {powerUpTimers.colorZapper > 0 && (
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-fuchsia-600/80 border border-fuchsia-400 text-white rounded-full px-3 py-1 flex items-center gap-2 shadow-lg backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-fuchsia-300 animate-pulse" />
            <span className="text-[10px] font-black uppercase font-bold">Zapped</span>
            <span className="text-sm font-mono tracking-tighter font-bold">
              {(powerUpTimers.colorZapper / 1000).toFixed(1)}s
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
};
