import { useState, useEffect, useCallback, useRef } from "react";
import { getRandomPanelType, createInitialGrid } from "../utils/gridUtils";
import { handleGamepadInput } from "../utils/gamepadUtils";
import { processBotLogic } from "../utils/botUtils";
import { executePowerUp, activateColorZapper } from "../utils/powerUpUtils";
import { useKeyboardInput } from "./useKeyboardInput";
import {
  Grid,
  PanelData,
  PanelType,
  Position,
  Controls,
  PanelState,
  GameState,
  PowerUpInventory,
} from "../types";
import {
  GRID_WIDTH,
  GRID_HEIGHT,
  PANEL_TYPES,
  DEFAULT_CONTROLS,
  SWAP_DURATION,
  FLASH_DURATION,
  POP_DURATION,
  HOVER_DURATION,
  INITIAL_RISING_SPEED,
  DAS_DELAY,
  DAS_REPEAT,
  FALL_DELAY,
  LEVEL_SPEEDS,
  LEVEL_HOVER_MSEC,
  LEVEL_POP_MSEC,
  LEVEL_FLASH_MSEC,
  COMBO_SCORES,
  CHAIN_SCORES,
  COMBO_STOP_FRAMES,
  CHAIN_STOP_FRAMES,
} from "../constants";

export const useGameLogic = (options?: {
  mode?: "endless" | "tycoon";
  isStarted?: boolean;
  scoreMultiplier?: number;
  coinsPerThousand?: number;
  swapBot?: boolean;
  logicProcessor?: number;
  overclock?: number;
  cooling?: number;
  sloMoDuration?: number;
  colorZapperDuration?: number;
  scoreSurgeDuration?: number;
  coinShowerDuration?: number;
  onSoundEffect?: (effect: string, args?: any) => void;
  onCoinEarned?: (amount: number) => void;
  initialScore?: number;
  initialGrid?: Grid;
}) => {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const triggerSound = (effect: string, args?: any) => {
    optionsRef.current?.onSoundEffect?.(effect, args);
  };

  const gameStateRef = useRef<GameState>({
    grid: options?.initialGrid || createInitialGrid(1),
    cursor: { x: 2, y: 5 },
    score: options?.initialScore ?? 0,
    level: 1,
    speedLevel: 1,
    isGameOver: false,
    elapsedTime: 0,
    risingOffset: 0,
    risingSpeed: INITIAL_RISING_SPEED,
    stopTimer: 0,
    isPaused: false,
    manualRaiseActive: false,
    activeEffects: [],
    currentChain: 0,
    isDanger: false,
    rowsRaised: 0,
    botActionTimer: 0,
    botIdleFrames: 0,
    botTargetAction: null,
    botRecentSwaps: [],
    zappedColor: null,
    powerUpTimers: {
      sloMo: 0,
      scoreSurge: 0,
      coinShower: 0,
      colorZapper: 0,
    },
    powerUpSelection: null,
  });

  const [renderCount, setRenderCount] = useState(0);
  const forceUpdate = () => setRenderCount((n) => n + 1);

  const [controls, setControls] = useState<Controls>(() => {
    const saved = localStorage.getItem("pdp_controls");
    return saved ? JSON.parse(saved) : DEFAULT_CONTROLS;
  });

  const [explodingLift, setExplodingLift] = useState<boolean>(() => {
    const saved = localStorage.getItem("pdp_exploding_lift");
    return saved !== "false"; // Default to true
  });

  const explodingLiftRef = useRef(explodingLift);
  useEffect(() => {
    explodingLiftRef.current = explodingLift;
  }, [explodingLift]);

  const controlsRef = useRef(controls);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const [stopTimeEnabled, setStopTimeEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("pdp_stop_time");
    return saved !== "false"; // Default to true
  });

  const stopTimeEnabledRef = useRef(stopTimeEnabled);
  useEffect(() => {
    stopTimeEnabledRef.current = stopTimeEnabled;
  }, [stopTimeEnabled]);

  const lastUpdateRef = useRef<number>(0);
  const nextRowRef = useRef<(PanelData | null)[]>([]);
  const keysRef = useRef<{
    [key: string]: { isDown: boolean; downTime: number; nextRepeat: number };
  }>({});

  const generateNextRow = useCallback(() => {
    const row: (PanelData | null)[] = [];
    const state = gameStateRef.current;

    // Check for active zapped color timer
    const zappedColor =
      state && state.powerUpTimers.colorZapper > 0 ? state.zappedColor : null;

    for (let x = 0; x < GRID_WIDTH; x++) {
      let type = getRandomPanelType(zappedColor, state?.level);

      // Avoid immediate matches in the incoming row
      // 1. Horizontal match within the incoming row itself
      // 2. Vertical match with the current bottom 2 rows of the grid
      while (
        (x >= 2 && row[x - 1]?.type === type && row[x - 2]?.type === type) ||
        (state &&
          state.grid[0][x]?.type === type &&
          state.grid[1][x]?.type === type)
      ) {
        type = getRandomPanelType(zappedColor, state?.level);
      }

      row.push({
        id: crypto.randomUUID(),
        type,
        state: "IDLE",
        stateTimer: 0,
      });
    }
    nextRowRef.current = row;
  }, []);

  useEffect(() => {
    if (nextRowRef.current.length === 0) {
      generateNextRow();
    }
  }, [generateNextRow]);

  const touchRaiseRef = useRef(false);

  const handleExecutePowerUp = useCallback(
    (type: keyof PowerUpInventory, x: number, y: number) => {
      executePowerUp(
        gameStateRef.current,
        type,
        x,
        y,
        stopTimeEnabledRef.current,
        triggerSound,
      );
    },
    [triggerSound],
  );

  const swap = useCallback(
    (x: number, y: number): boolean => {
      if (x < 0 || x >= GRID_WIDTH - 1 || y < 0 || y >= GRID_HEIGHT)
        return false;

      const state = gameStateRef.current;
      if (state.isGameOver) return false;

      const next = state.grid;
      const left = next[y][x];
      const right = next[y][x + 1];

      // Can only swap if IDLE, LANDING, SWAPPING, or FALLING.
      // This allows back-to-back rapid swaps (Stealth).
      if (!left && !right) return false; // Cannot swap two empty spaces
      const canSwap = (p: PanelData | null) =>
        !p ||
        ([
          "IDLE",
          "LANDING",
          "SWAPPING_LEFT",
          "SWAPPING_RIGHT",
          "FALLING",
        ].includes(p.state) &&
          !p.dontSwap);
      if (!canSwap(left) || !canSwap(right)) return false;

      // You cannot swap if the panel directly above either the left or right panel is hovering
      // This prevents swapping under an unsupported panel
      if (y < GRID_HEIGHT - 1) {
        const aboveLeft = next[y + 1][x];
        const aboveRight = next[y + 1][x + 1];
        // Panel Attack only restricts swapping when panel above is hovering, NOT falling.
        const isHovering = (p: PanelData | null) =>
          p && ["HOVERING"].includes(p.state);
        if (isHovering(aboveLeft) || isHovering(aboveRight)) {
          return false;
        }
      }

      if (!left && right) {
        right.state = "SWAPPING_LEFT";
        right.stateTimer = SWAP_DURATION;
        next[y][x] = right;
        next[y][x + 1] = null;
      } else if (left && !right) {
        left.state = "SWAPPING_RIGHT";
        left.stateTimer = SWAP_DURATION;
        next[y][x] = null;
        next[y][x + 1] = left;
      } else if (left && right) {
        right.state = "SWAPPING_LEFT";
        right.stateTimer = SWAP_DURATION;
        left.state = "SWAPPING_RIGHT";
        left.stateTimer = SWAP_DURATION;
        next[y][x] = right;
        next[y][x + 1] = left;
      }

      const newLeft = next[y][x];
      const newRight = next[y][x + 1];

      // If you're swapping a panel into a position above an empty space or above a falling piece
      // then you can't take it back since it will start falling.
      if (y > 0) {
        if (
          newLeft &&
          (next[y - 1][x] === null || next[y - 1][x]?.state === "FALLING")
        ) {
          newLeft.dontSwap = true;
        }
        if (
          newRight &&
          (next[y - 1][x + 1] === null ||
            next[y - 1][x + 1]?.state === "FALLING")
        ) {
          newRight.dontSwap = true;
        }
      }

      // If you're swapping a blank space under a panel, then you can't swap it back
      // since the panel above should start falling.
      if (y < GRID_HEIGHT - 1) {
        if (newLeft === null && next[y + 1][x] !== null) {
          // We can't set dontSwap on null, so we represent "empty space is locked"
          // by checking the panel ABOVE during canSwap or by a flag?
          // Actually, in the engine, the color 0 panel (empty) gets the dont_swap flag.
          // Since we use null for empty, we'll mark the panel ABOVE as needing to fall instead.
          // But for consistency with the engine, let's ensure the swap simply becomes "locked".
          // One way is to create a pseudo-panel for the empty space if it needs to be locked.
          next[y][x] = {
            id: crypto.randomUUID(),
            type: "EMPTY" as any,
            state: "IDLE",
            stateTimer: 0,
            dontSwap: true,
          };
        }
        if (newRight === null && next[y + 1][x + 1] !== null) {
          next[y][x + 1] = {
            id: crypto.randomUUID(),
            type: "EMPTY" as any,
            state: "IDLE",
            stateTimer: 0,
            dontSwap: true,
          };
        }
      }

      state.grid = next;
      triggerSound("swap");
      forceUpdate();
      return true;
    },
    [triggerSound],
  );

  const moveCursor = useCallback(
    (dx: number, dy: number) => {
      const state = gameStateRef.current;
      if (state.isGameOver) return;

      if (state.powerUpSelection) {
        const type = state.powerUpSelection.type;
        let maxX = GRID_WIDTH - 1;
        let maxY = GRID_HEIGHT - 1;

        if (type === "lineBomb") {
          maxX = 0; // Fixed at 0, only y matters
        } else if (type === "staircaseBomb") {
          maxX = GRID_WIDTH - 3;
          maxY = GRID_HEIGHT - 3;
        }

        const nx = Math.min(Math.max(state.powerUpSelection.x + dx, 0), maxX);
        const ny = Math.min(Math.max(state.powerUpSelection.y + dy, 0), maxY);
        if (
          nx !== state.powerUpSelection.x ||
          ny !== state.powerUpSelection.y
        ) {
          state.powerUpSelection.x = nx;
          state.powerUpSelection.y = ny;
          triggerSound("move");
          forceUpdate();
        }
        return;
      }

      const nx = Math.min(Math.max(state.cursor.x + dx, 0), GRID_WIDTH - 2);
      const ny = Math.min(Math.max(state.cursor.y + dy, 0), GRID_HEIGHT - 1);
      if (nx !== state.cursor.x || ny !== state.cursor.y) {
        state.cursor = { x: nx, y: ny };
        triggerSound("move");
        forceUpdate();
      }
    },
    [triggerSound],
  );

  const handleSetCursor = useCallback(
    (x: number, y: number) => {
      const state = gameStateRef.current;
      if (state.isGameOver) return;

      if (state.powerUpSelection) {
        const type = state.powerUpSelection.type;
        let maxX = GRID_WIDTH - 1;
        let maxY = GRID_HEIGHT - 1;

        if (type === "lineBomb") {
          maxX = 0;
        } else if (type === "staircaseBomb") {
          maxX = GRID_WIDTH - 3;
          maxY = GRID_HEIGHT - 3;
        }

        const nx = Math.min(Math.max(x, 0), maxX);
        const ny = Math.min(Math.max(y, 0), maxY);
        if (
          nx === state.powerUpSelection.x &&
          ny === state.powerUpSelection.y
        ) {
          handleExecutePowerUp(state.powerUpSelection.type, nx, ny);
          state.powerUpSelection = null;
        } else {
          state.powerUpSelection.x = nx;
          state.powerUpSelection.y = ny;
          triggerSound("move");
        }
        forceUpdate();
        return;
      }

      const nx = Math.min(Math.max(x, 0), GRID_WIDTH - 2);
      const ny = Math.min(Math.max(y, 0), GRID_HEIGHT - 1);
      if (nx !== state.cursor.x || ny !== state.cursor.y) {
        state.cursor = { x: nx, y: ny };
        forceUpdate();
      }
    },
    [handleExecutePowerUp, triggerSound],
  );

  const handleTouchSwap = useCallback(
    (
      x: number,
      y: number,
      dx: -1 | 1,
      fast: boolean,
    ): "SUCCESS" | "FAIL" | "RATE_LIMITED" => {
      const swapX = dx === 1 ? x : x - 1;
      if (swapX < 0 || swapX >= GRID_WIDTH - 1 || y < 0 || y >= GRID_HEIGHT)
        return "FAIL";

      const state = gameStateRef.current;
      if (state.isGameOver || state.isPaused || optionsRef.current?.swapBot) return "FAIL";

      const left = state.grid[y][swapX];
      const right = state.grid[y][swapX + 1];

      if (!left && !right) return "FAIL";

      // Panel attack handles touch swapping rate-limiting by making panels immovable during SWAPPING
      // But ONLY for touch controls. Buttons can spam.
      const isSwapping = (p: PanelData | null) =>
        p && ["SWAPPING_LEFT", "SWAPPING_RIGHT"].includes(p.state);
      if (isSwapping(left) || isSwapping(right)) {
        if (!fast) {
          return "RATE_LIMITED";
        }
      }

      const canSwap = (p: PanelData | null) =>
        !p ||
        [
          "IDLE",
          "LANDING",
          "SWAPPING_LEFT",
          "SWAPPING_RIGHT",
          "FALLING",
        ].includes(p.state);
      if (!canSwap(left) || !canSwap(right)) return "FAIL";

      // Check hovering directly above swapped tiles
      if (y < GRID_HEIGHT - 1) {
        const aboveLeft = state.grid[y + 1][swapX];
        const aboveRight = state.grid[y + 1][swapX + 1];
        const isHovering = (p: PanelData | null) =>
          p && ["HOVERING"].includes(p.state);
        if (isHovering(aboveLeft) || isHovering(aboveRight)) return "FAIL";
      }

      // Pass the standard swap arguments. `swap` accepts the x which is the left panel of the swap pair.
      const success = swap(swapX, y);
      return success ? "SUCCESS" : "FAIL";
    },
    [swap],
  );

  const handleTouchRaise = useCallback((active: boolean) => {
    if (optionsRef.current?.swapBot) return;
    touchRaiseRef.current = active;
    if (active) {
      const state = gameStateRef.current;
      if (state.powerUpSelection) {
        state.powerUpSelection = null;
        forceUpdate();
      }
    }
  }, []);

  // Update Game Logic
  useEffect(() => {
    let animationFrameId: number;
    const matches = new Set<string>();

    const gameLoop = (timestamp: number) => {
      if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
      const realDeltaTime = timestamp - lastUpdateRef.current;
      lastUpdateRef.current = timestamp;

      const state = gameStateRef.current;

      if (!state.isPaused) {
        if (state.powerUpTimers.sloMo > 0) {
          state.powerUpTimers.sloMo -= realDeltaTime;
        }
        if (state.powerUpTimers.scoreSurge > 0) {
          state.powerUpTimers.scoreSurge -= realDeltaTime;
        }
        if (state.powerUpTimers.coinShower > 0) {
          state.powerUpTimers.coinShower -= realDeltaTime;
        }
        if (state.powerUpTimers.colorZapper > 0) {
          state.powerUpTimers.colorZapper -= realDeltaTime;
          if (state.powerUpTimers.colorZapper <= 0) {
            state.zappedColor = null;
          }
        }
      }

      let deltaTime =
        state.powerUpTimers.sloMo > 0 && !state.isPaused
          ? realDeltaTime * 0.3
          : realDeltaTime;

      // --- SWAP BOT LOGIC ---
      processBotLogic(state, realDeltaTime, optionsRef, explodingLiftRef.current, swap);

      // --- GAMEPAD SUPPORT ---
      handleGamepadInput(controls, keysRef, {
        moveCursor,
        onSwap1: () => {
          if (state.powerUpSelection) {
            handleExecutePowerUp(
              state.powerUpSelection.type,
              state.powerUpSelection.x,
              state.powerUpSelection.y,
            );
            state.powerUpSelection = null;
            forceUpdate();
          } else {
            swap(state.cursor.x, state.cursor.y);
          }
        },
        onSwap2: () => {
          if (state.powerUpSelection) {
            handleExecutePowerUp(
              state.powerUpSelection.type,
              state.powerUpSelection.x,
              state.powerUpSelection.y,
            );
            state.powerUpSelection = null;
            forceUpdate();
          } else {
            swap(state.cursor.x, state.cursor.y);
          }
        },
        onRaise: () => {
          if (state.powerUpSelection) {
            state.powerUpSelection = null;
            forceUpdate();
          }
        },
        onStart: () => {
          state.isPaused = !state.isPaused;
          forceUpdate();
        },
      });
      // -----------------------

      if (
        !state.isGameOver &&
        !state.isPaused &&
        optionsRef.current?.isStarted &&
        nextRowRef.current.length > 0
      ) {
        state.elapsedTime += deltaTime;
        const diffIdx = Math.min(Math.max(state.level - 1, 0), 9);
        const speedIdx = Math.min(Math.max(state.speedLevel - 1, 0), 9);

        const popMsec = LEVEL_POP_MSEC[diffIdx] ?? POP_DURATION;
        const hoverMsec = LEVEL_HOVER_MSEC[diffIdx] ?? HOVER_DURATION;

        // Only speedLevel determines the stack raising speed
        state.risingSpeed = LEVEL_SPEEDS[speedIdx] ?? 0;

        // advance speedLevel every 30 seconds for progression feel
        if (
          state.elapsedTime > state.speedLevel * 30000 &&
          state.speedLevel < 10
        ) {
          state.speedLevel++;
        }
        let landedThisFrame = false;

        // 0. Handle DAS
        const handleDas = (code: string, dx: number, dy: number) => {
          const keyState = keysRef.current[code];
          if (keyState && keyState.isDown) {
            if (timestamp >= keyState.nextRepeat) {
              moveCursor(dx, dy);
              keyState.nextRepeat = timestamp + DAS_REPEAT;
            }
          }
        };

        handleDas(controlsRef.current.up, 0, 1);
        handleDas(controlsRef.current.down, 0, -1);
        handleDas(controlsRef.current.left, -1, 0);
        handleDas(controlsRef.current.right, 1, 0);

        // 0. Game Over check for top row touching ceiling
        const topRow = state.grid[GRID_HEIGHT - 1];
        const isCeilingReached = topRow.some(
          (p) => p !== null && (p.state === "IDLE" || p.state === "FALLING"),
        );
        const isTopRowOccupied = topRow.some((p) => p !== null);

        if (isCeilingReached) {
          if (optionsRef.current?.mode === "tycoon") {
            // In tycoon, reaching the top doesn't end the game or reset the board.
            // We just stop it from raising further.
          } else {
            state.isGameOver = true;
            triggerSound("gameover");
          }
        }

        // Danger check (2 rows from top) - Disabled in Tycoon mode
        state.isDanger = false;
        if (optionsRef.current?.mode !== "tycoon") {
          for (let y = GRID_HEIGHT - 2; y < GRID_HEIGHT; y++) {
            if (state.grid[y].some((p) => p !== null)) {
              state.isDanger = true;
              break;
            }
          }
        }

        if (!state.isGameOver) {
          const isClearing = state.grid.some((row) =>
            row.some(
              (p) =>
                p !== null &&
                (p.state === "MATCHED" ||
                  p.state === "POPPING_WAIT" ||
                  p.state === "POPPING" ||
                  p.state === "POPPED"),
            ),
          );

          // Countdown stop timer only if not clearing
          if (state.stopTimer > 0 && !isClearing) {
            state.stopTimer -= deltaTime;
          }

          if (!optionsRef.current?.swapBot && state.botTargetAction) {
            state.botTargetAction = null;
          }

          const isRaiseDown =
            (keysRef.current[controlsRef.current.raise1]?.isDown ||
              keysRef.current[controlsRef.current.raise2]?.isDown ||
              touchRaiseRef.current ||
              (optionsRef.current?.swapBot && state.botTargetAction?.type === "RAISE")) &&
            !state.powerUpSelection;

          const manualBlocked = !explodingLiftRef.current && isClearing;
          const autoBlocked =
            isClearing || (stopTimeEnabledRef.current && state.stopTimer > 0);

          if (isRaiseDown && !state.isGameOver && !state.isPaused) {
            if (!isTopRowOccupied && !manualBlocked) {
              state.manualRaiseActive = true;
              state.stopTimer = 0;
            } else {
              state.manualRaiseActive = false;
            }
          } else if (!isRaiseDown) {
            state.manualRaiseActive = false;
          }

          // 1. Process raising offset
          if (isTopRowOccupied) {
            // If the ceiling is occupied (even by popping blocks), stop the auto-raise and manual raise.
            state.manualRaiseActive = false;
            state.risingOffset = Math.min(state.risingOffset, 0.99); // Stay at the top
          } else {
            if (state.manualRaiseActive || !autoBlocked) {
              const speed = state.manualRaiseActive
                ? 0.1
                : state.risingSpeed * (deltaTime / 16.6666);
              state.risingOffset += speed;
              if (state.risingOffset >= 1) {
                // Final check before shifting: if any non-null panel is in row 11, we CANNOT shift.
                const canShift = !state.grid[GRID_HEIGHT - 1].some(
                  (p) => p !== null,
                );
                if (canShift) {
                  const newGrid = state.grid.slice(0, GRID_HEIGHT - 1);
                  newGrid.unshift(nextRowRef.current);
                  state.grid = newGrid;
                  generateNextRow();
                  state.cursor.y = Math.min(
                    state.cursor.y + 1,
                    GRID_HEIGHT - 1,
                  );
                  state.rowsRaised += 1;
                  state.risingOffset = 0;

                  // Only stop manual raising if the button is not held
                  if (!isRaiseDown) {
                    state.manualRaiseActive = false;
                  }
                } else {
                  state.manualRaiseActive = false;
                  state.risingOffset = 0.99;
                }
              }
            }
          }

          const nextGrid = state.grid;

          // Process timers
          for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
              const panel = nextGrid[y][x];
              if (panel) {
                const needsTransition = [
                  "SWAPPING_LEFT",
                  "SWAPPING_RIGHT",
                  "MATCHED",
                  "POPPING_WAIT",
                  "POPPING",
                  "POPPED",
                  "HOVERING",
                  "FALLING",
                  "LANDING",
                ].includes(panel.state);

                if (needsTransition) {
                  panel.stateTimer -= deltaTime;
                  if (panel.stateTimer <= 0) {
                    if (
                      panel.state === "SWAPPING_LEFT" ||
                      panel.state === "SWAPPING_RIGHT"
                    ) {
                      // Finish swap. If it was flagged as unsupported (dontSwap), enter HOVERING immediately.
                      if (panel.dontSwap) {
                        panel.state = "HOVERING";
                        panel.stateTimer = hoverMsec;
                        panel.dontSwap = false; // Reset for next time it might land
                      } else {
                        panel.state = "IDLE";
                        panel.stateTimer = 0;
                      }
                    } else if (panel.state === "MATCHED") {
                      // After flash, transition to either POPPING (if first) or WAITING
                      if (panel.comboIndex === 1) {
                        panel.state = "POPPING";
                        panel.stateTimer = popMsec;
                        triggerSound("pop", {
                          set: panel.chainSet || 1,
                          index: panel.comboIndex || 1,
                        });
                      } else {
                        panel.state = "POPPING_WAIT";
                        panel.stateTimer = (panel.comboIndex! - 1) * popMsec;
                      }
                    } else if (panel.state === "POPPING_WAIT") {
                      panel.state = "POPPING";
                      panel.stateTimer = popMsec;
                      triggerSound("pop", {
                        set: panel.chainSet || 1,
                        index: panel.comboIndex || 1,
                      });
                    } else if (panel.state === "POPPING") {
                      const cSize = panel.comboSize || 0;
                      const cIdx = panel.comboIndex || 1;
                      if (cSize === cIdx) {
                        // The last panel finishes popping and vanishes instantly
                        nextGrid[y][x] = null;
                        if (y + 1 < GRID_HEIGHT && nextGrid[y + 1][x]) {
                          console.log(
                            "Giving chaining tag to block above popped:",
                            x,
                            y + 1,
                          );
                          nextGrid[y + 1][x]!.isChaining = true;
                        }
                      } else {
                        panel.state = "POPPED";
                        panel.stateTimer = (cSize - cIdx) * popMsec;
                      }
                    } else if (panel.state === "POPPED") {
                      nextGrid[y][x] = null;
                      if (y + 1 < GRID_HEIGHT && nextGrid[y + 1][x]) {
                        console.log(
                          "Giving chaining tag to block above popped:",
                          x,
                          y + 1,
                        );
                        nextGrid[y + 1][x]!.isChaining = true;
                      }
                    } else if (panel.state === "HOVERING") {
                      panel.state = "FALLING";
                      panel.stateTimer = 0;
                    } else if (panel.state === "LANDING") {
                      panel.state = "IDLE";
                      panel.stateTimer = 0;
                    }
                  }
                }
              }
            }
          }

          // 3. Handle Gravity
          for (let x = 0; x < GRID_WIDTH; x++) {
            // Check floor hits for bottom row
            if (nextGrid[0][x]?.state === "FALLING") {
              nextGrid[0][x]!.state = "LANDING";
              nextGrid[0][x]!.stateTimer = 200; // 12 frames at 60fps = 200ms
              if (!landedThisFrame) {
                triggerSound("land");
                landedThisFrame = true;
              }
            } else if (nextGrid[0][x]?.state === "IDLE") {
              nextGrid[0][x]!.isChaining = false;
            }

            for (let y = 1; y < GRID_HEIGHT; y++) {
              const panel = nextGrid[y][x];
              if (
                panel &&
                (panel.state === "IDLE" ||
                  panel.state === "HOVERING" ||
                  panel.state === "FALLING" ||
                  panel.state === "LANDING")
              ) {
                const below = nextGrid[y - 1][x];
                // Panel should fall or hover if there is nothing below, or if the panel below is also falling/hovering.
                // MATCHED, POPPING, POPPED, LANDING physically support panels above them!
                const isBelowEmpty = !below || (below as any).type === "EMPTY";
                const isUnsupported =
                  isBelowEmpty ||
                  ["FALLING", "HOVERING"].includes(below!.state);

                // Chain propagation logic: Falling blocks and hovering blocks resting on other hovering blocks share chaining tags
                if (
                  below &&
                  below.type !== ("EMPTY" as any) &&
                  below.isChaining &&
                  [
                    "HOVERING",
                    "FALLING",
                    "LANDING",
                    "SWAPPING_LEFT",
                    "SWAPPING_RIGHT",
                  ].includes(below.state)
                ) {
                  panel.isChaining = true;
                }

                if (isUnsupported) {
                  if (panel.state === "IDLE" || panel.state === "LANDING") {
                    panel.state = "HOVERING";
                    // Hover duration before dropping
                    panel.stateTimer = hoverMsec;
                  } else if (
                    panel.state === "FALLING" &&
                    panel.stateTimer <= 0
                  ) {
                    if (isBelowEmpty) {
                      nextGrid[y - 1][x] = panel;
                      nextGrid[y][x] = null;
                      panel.stateTimer = FALL_DELAY;
                    }
                  }
                } else {
                  if (panel.state === "FALLING") {
                    panel.state = "LANDING";
                    panel.stateTimer = 200;
                    if (!landedThisFrame) {
                      triggerSound("land");
                      landedThisFrame = true;
                    }
                  } else if (panel.state === "HOVERING") {
                    panel.state = "IDLE";
                    panel.stateTimer = 0;
                  }
                }
              }
            }
          }

          // Cleanup EMPTY placeholders
          for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
              if (
                nextGrid[y][x]?.type === ("EMPTY" as any) &&
                nextGrid[y][x]?.state === "IDLE"
              ) {
                nextGrid[y][x] = null;
              }
            }
          }

          // 4. Finding matches (IDLE and LANDING panels match)
          matches.clear();
          const isMatchable = (p: PanelData | null) =>
            p &&
            p.type !== ("EMPTY" as any) &&
            ["IDLE", "LANDING"].includes(p.state);

          for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH - 2; x++) {
              const p1 = nextGrid[y][x];
              const p2 = nextGrid[y][x + 1];
              const p3 = nextGrid[y][x + 2];
              if (isMatchable(p1) && isMatchable(p2) && isMatchable(p3)) {
                if (p1!.type === p2!.type && p2!.type === p3!.type) {
                  matches.add(`${x},${y}`);
                  matches.add(`${x + 1},${y}`);
                  matches.add(`${x + 2},${y}`);
                }
              }
            }
          }
          for (let x = 0; x < GRID_WIDTH; x++) {
            for (let y = 0; y < GRID_HEIGHT - 2; y++) {
              const p1 = nextGrid[y][x];
              const p2 = nextGrid[y + 1][x];
              const p3 = nextGrid[y + 2][x];
              if (isMatchable(p1) && isMatchable(p2) && isMatchable(p3)) {
                if (p1!.type === p2!.type && p2!.type === p3!.type) {
                  matches.add(`${x},${y}`);
                  matches.add(`${x},${y + 1}`);
                  matches.add(`${x},${y + 2}`);
                }
              }
            }
          }

          if (matches.size > 0) {
            // Sort matches to give them an ordered comboIndex
            // Bottom-to-top, left-to-right
            const sortedMatches = Array.from(matches)
              .map((coord) => {
                const [x, y] = coord.split(",").map(Number);
                return { x, y };
              })
              .sort((a, b) => {
                if (a.y !== b.y) return a.y - b.y; // Bottom to top (lower Y first)
                return a.x - b.x; // Left to right
              });

            // Check if this match continues a chain
            let isChainMatch = false;
            sortedMatches.forEach((pos) => {
              const p = nextGrid[pos.y][pos.x];
              if (p && p.isChaining) {
                isChainMatch = true;
              }
            });

            if (isChainMatch) {
              console.log("Adding to chain! previous:", state.currentChain);
              if (state.currentChain === 0) {
                state.currentChain = 2; // In Panel Attack, 2 is the first chain text shown
              } else {
                state.currentChain++;
              }
              triggerSound("chain", state.currentChain);
            } else if (sortedMatches.length > 3) {
              triggerSound("combo");
            }

            // Apply Panel Attack stop time calculations
            if (stopTimeEnabledRef.current) {
              const comboFrames =
                COMBO_STOP_FRAMES[
                  Math.min(sortedMatches.length, COMBO_STOP_FRAMES.length - 1)
                ] || 0;
              const chainLevel =
                isChainMatch && state.currentChain > 0 ? state.currentChain : 0;
              const chainFrames =
                CHAIN_STOP_FRAMES[
                  Math.min(chainLevel, CHAIN_STOP_FRAMES.length - 1)
                ] || 0;

              const totalStopFrames = Math.max(comboFrames, chainFrames);
              if (totalStopFrames > 0) {
                // 1 frame ~ 16.6667ms
                state.stopTimer = Math.max(
                  state.stopTimer,
                  totalStopFrames * 16.6667,
                );
              }
            }

            // Spawn float text for combo/chain
            const isCombo = sortedMatches.length > 3;
            const isChain = isChainMatch && state.currentChain > 1;
            if (isCombo || isChain) {
              const topMost = sortedMatches[0];
              state.activeEffects.push({
                id: Math.random().toString(),
                x: topMost.x,
                y: topMost.y,
                offset: state.risingOffset,
                combo: sortedMatches.length,
                chain: isChain ? state.currentChain : 0,
                life: 2000, // 2 seconds float duration
              });
            }

            const rawMatchScore =
              sortedMatches.length * 10 +
              COMBO_SCORES[
                Math.min(sortedMatches.length, COMBO_SCORES.length - 1)
              ] +
              CHAIN_SCORES[
                Math.min(
                  isChainMatch ? state.currentChain : 0,
                  CHAIN_SCORES.length - 1,
                )
              ];

            let scoreMultiplier = optionsRef.current?.scoreMultiplier ?? 1;
            if (state.powerUpTimers.scoreSurge > 0) {
              scoreMultiplier *= 2;
            }
            const matchScore = Math.floor(rawMatchScore * scoreMultiplier);

            let coinsPerThousand = optionsRef.current?.coinsPerThousand ?? 1;
            if (state.powerUpTimers.coinShower > 0) {
              coinsPerThousand *= 2;
            }

            const oldEarned = Math.floor(state.score / 1000);
            state.score += matchScore;
            const newEarned = Math.floor(state.score / 1000);

            if (
              optionsRef.current?.mode === "tycoon" &&
              newEarned > oldEarned
            ) {
              const thousandsCrossed = newEarned - oldEarned;
              const coinsToGrant = thousandsCrossed * coinsPerThousand;
              optionsRef.current?.onCoinEarned?.(coinsToGrant);
              triggerSound("coin");

              const topMost = sortedMatches[0];
              state.activeEffects.push({
                id: Math.random().toString(),
                x: topMost.x,
                y: topMost.y,
                offset: state.risingOffset,
                combo: 0,
                chain: 0,
                life: 2000,
                isCoin: true,
                amount: coinsToGrant,
              });
            }

            const chainSet = (state.currentChain || 1) % 4 || 4; // Use chain level to pick pop set
            const diffIdx = Math.min(Math.max(state.level - 1, 0), 9);
            const flashMsec = LEVEL_FLASH_MSEC[diffIdx] ?? FLASH_DURATION;

            sortedMatches.forEach((pos, idx) => {
              const p = nextGrid[pos.y][pos.x];
              if (p && ["IDLE", "LANDING"].includes(p.state)) {
                p.state = "MATCHED";
                p.stateTimer = flashMsec;
                p.comboIndex = idx + 1; // 1-indexed for logic
                p.comboSize = sortedMatches.length;
                p.chainSet = chainSet;
                if (isChainMatch) {
                  p.isChaining = true;
                }
              }
            });
          }

          // 5. Clear chaining flags from eligible blocks that didn't match
          // Panel Attack clears the chain tag on the VERY FIRST FRAME a panel lands or is idle
          // as long as it's not being supported by a swap.
          for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
              const panel = nextGrid[y][x];
              if (panel && panel.isChaining) {
                // Only clear if panel is in a matchable state (IDLE or LANDING)
                if (["IDLE", "LANDING"].includes(panel.state)) {
                  if (!matches.has(`${x},${y}`)) {
                    const below = y > 0 ? nextGrid[y - 1][x] : null;
                    // If NOTHING below, it will hover/fall next frame, keep chaining?
                    // No, if nothing below it's already matchable for 1 frame before hovering.
                    if (
                      below &&
                      ["SWAPPING_LEFT", "SWAPPING_RIGHT"].includes(below.state)
                    ) {
                      // Keep isChaining for slides
                    } else {
                      console.log("Clearing chain flag at", x, y, panel.state);
                      panel.isChaining = false;
                    }
                  }
                }
              }
            }
          }

          // 6. Check for end of chain
          let hasChaining = false;
          for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
              if (nextGrid[y][x]?.isChaining) {
                hasChaining = true;
                break;
              }
            }
            if (hasChaining) break;
          }
          if (state.currentChain > 0 && !hasChaining) {
            console.log(
              "hasChaining became false, breaking chain from",
              state.currentChain,
            );
            triggerSound("fanfare", state.currentChain);
            state.currentChain = 0;
          }

          // Process active effects
          state.activeEffects = state.activeEffects.filter((effect) => {
            effect.life -= deltaTime;
            return effect.life > 0;
          });

          state.grid = nextGrid;
        }
      }

      forceUpdate();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [generateNextRow]);

  // Input Handling
  useKeyboardInput(controls, gameStateRef, keysRef, {
    moveCursor,
    swap,
    executePowerUp: handleExecutePowerUp,
    forceUpdate,
  }, options?.swapBot);

  const {
    grid,
    cursor,
    risingOffset,
    score,
    isGameOver,
    isPaused,
    activeEffects,
    isDanger,
    powerUpTimers,
    powerUpSelection,
    stopTimer,
  } = gameStateRef.current;

  return {
    grid,
    nextRow: nextRowRef.current,
    cursor,
    risingOffset,
    score,
    isGameOver,
    isPaused,
    isDanger,
    activeEffects,
    powerUpTimers,
    powerUpSelection,
    stopTimer,
    controls,
    setControls,
    explodingLift,
    setExplodingLift,
    stopTimeEnabled,
    setStopTimeEnabled,
    rowsRaised: gameStateRef.current.rowsRaised,
    handleSetCursor,
    handleTouchSwap,
    handleTouchRaise,
    togglePause: () => {
      gameStateRef.current.isPaused = !gameStateRef.current.isPaused;
      forceUpdate();
    },
    activatePowerUp: (type: keyof PowerUpInventory) => {
      const state = gameStateRef.current;
      const { x, y } = state.cursor;

      if (type === "lineBomb" || type === "staircaseBomb") {
        state.powerUpSelection = { type, x: 0, y: 5 }; // Center-ish start for selection
        triggerSound("move");
        forceUpdate();
        return;
      }

      triggerSound("combo");

      if (type === "colorZapper") {
        activateColorZapper(state, stopTimeEnabledRef.current, optionsRef);
      } else if (type === "sloMo") {
        state.powerUpTimers.sloMo =
          30000 + (optionsRef.current?.sloMoDuration ?? 0) * 10000;
      } else if (type === "scoreSurge") {
        state.powerUpTimers.scoreSurge =
          30000 + (optionsRef.current?.scoreSurgeDuration ?? 0) * 10000;
      } else if (type === "coinShower") {
        state.powerUpTimers.coinShower =
          30000 + (optionsRef.current?.coinShowerDuration ?? 0) * 10000;
      }
      forceUpdate();
    },
    restart: (
      startingLevel?: number,
      initialGrid?: Grid,
      initialScore?: number,
    ) => {
      const newLevel = startingLevel ?? gameStateRef.current.level;
      gameStateRef.current = {
        grid: initialGrid || createInitialGrid(newLevel),
        cursor: { x: 2, y: 5 },
        score: initialScore ?? optionsRef.current?.initialScore ?? 0,
        level: newLevel,
        speedLevel: 1,
        isGameOver: false,
        elapsedTime: 0,
        risingOffset: 0,
        stopTimer: 0,
        risingSpeed: INITIAL_RISING_SPEED,
        isPaused: false,
        manualRaiseActive: false,
        activeEffects: [],
        currentChain: 0,
        isDanger: false,
        rowsRaised: 0,
        botActionTimer: 0,
        botIdleFrames: 0,
        botTargetAction: null,
        botRecentSwaps: [],
        zappedColor: null,
        powerUpTimers: {
          sloMo: 0,
          scoreSurge: 0,
          coinShower: 0,
          colorZapper: 0,
        },
        powerUpSelection: null,
      };
      forceUpdate();
    },
  };
};
