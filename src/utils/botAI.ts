import { GameState, Grid, PanelType } from "../types";
import { GRID_WIDTH, GRID_HEIGHT, FALL_DELAY, LEVEL_HOVER_MSEC } from "../constants";

export type BotAction =
  | { type: "SWAP"; x: number; y: number; score: number; isChainSetup: boolean }
  | { type: "RAISE"; score: number; isChainSetup: boolean }
  | { type: "IDLE"; x: number; y: number; score: number };

const validMoveStates = [
  "IDLE",
  "SWAPPING_LEFT",
  "SWAPPING_RIGHT",
  "FALLING",
  "LANDING",
];

const calculateStats = (grid: Grid) => {
  let matchSet = new Set<number>();
  let heights = Array(GRID_WIDTH).fill(0);
  let adjacencyScore = 0;

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const p = grid[y][x];
      if (p) {
        heights[x] = Math.max(heights[x], y + 1);
        if (validMoveStates.includes(p.state)) {
          // Check right and up for adjacency to avoid double counting
          if (x < GRID_WIDTH - 1 && grid[y][x + 1]?.type === p.type && validMoveStates.includes(grid[y][x + 1]?.state || "")) {
            adjacencyScore++;
          }
          if (y < GRID_HEIGHT - 1 && grid[y + 1][x]?.type === p.type && validMoveStates.includes(grid[y + 1][x]?.state || "")) {
            adjacencyScore++;
          }

          // Horizontal check
          if (x <= GRID_WIDTH - 3) {
            if (
              grid[y][x + 1]?.type === p.type &&
              grid[y][x + 2]?.type === p.type &&
              validMoveStates.includes(grid[y][x + 1]?.state || "") &&
              validMoveStates.includes(grid[y][x + 2]?.state || "")
            ) {
              matchSet.add(y * 100 + x);
              matchSet.add(y * 100 + x + 1);
              matchSet.add(y * 100 + x + 2);
            }
          }
          // Vertical check
          if (y <= GRID_HEIGHT - 3) {
            if (
              grid[y + 1][x]?.type === p.type &&
              grid[y + 2][x]?.type === p.type &&
              validMoveStates.includes(grid[y + 1][x]?.state || "") &&
              validMoveStates.includes(grid[y + 2][x]?.state || "")
            ) {
              matchSet.add(y * 100 + x);
              matchSet.add((y + 1) * 100 + x);
              matchSet.add((y + 2) * 100 + x);
            }
          }
        }
      }
    }
  }
  return { matchSize: matchSet.size, matchedKeys: matchSet, heights, adjacencyScore };
};

const applyGravity = (grid: Grid): Grid => {
  const newGrid: Grid = Array.from({ length: GRID_HEIGHT }, () =>
    Array(GRID_WIDTH).fill(null),
  );

  for (let x = 0; x < GRID_WIDTH; x++) {
    let writeY = 0;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const p = grid[y][x];
      if (p && !["MATCHED", "POPPING_WAIT", "POPPING", "POPPED"].includes(p.state)) {
        newGrid[writeY][x] = p.state === "IDLE" ? p : { ...p, state: "IDLE" };
        writeY++;
      }
    }
  }
  return newGrid;
};

const hasMatchAt = (grid: Grid, cx: number, cy: number): boolean => {
  const p = grid[cy][cx];
  if (!p || p.state !== "IDLE") return false;

  let hCount = 1;
  for (
    let x = cx - 1;
    x >= 0 && grid[cy][x]?.type === p.type && grid[cy][x]?.state === "IDLE";
    x--
  )
    hCount++;
  for (
    let x = cx + 1;
    x < GRID_WIDTH &&
    grid[cy][x]?.type === p.type &&
    grid[cy][x]?.state === "IDLE";
    x++
  )
    hCount++;
  if (hCount >= 3) return true;

  let vCount = 1;
  for (
    let y = cy - 1;
    y >= 0 && grid[y][cx]?.type === p.type && grid[y][cx]?.state === "IDLE";
    y--
  )
    vCount++;
  for (
    let y = cy + 1;
    y < GRID_HEIGHT &&
    grid[y][cx]?.type === p.type &&
    grid[y][cx]?.state === "IDLE";
    y++
  )
    vCount++;
  if (vCount >= 3) return true;

  return false;
};

export const findBestMove = (
  state: GameState,
  skillLevel: number,
  isTycoon: boolean = false,
  recentSwaps: { x: number, y: number }[] = [],
  idleFrames: number = 0,
  options?: any
): BotAction | null => {
  const moves: BotAction[] = [];
  const grid = state.grid;

  let totalPanels = 0;
  let isChainActive = false;
  const { heights } = calculateStats(grid);

  moves.push({ type: "IDLE", x: state.cursor.x, y: state.cursor.y, score: 1 });

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const p = grid[y][x];
      if (p) {
        totalPanels++;
        if (
          ["MATCHED", "POPPING_WAIT", "POPPING", "POPPED", "HOVERING", "FALLING"].includes(p.state) ||
          p.comboIndex > 0
        ) {
          isChainActive = true;
        }
      }
    }
  }

  const maxHeight = Math.max(...heights);
  const dangerColumns = heights.filter((h) => h >= GRID_HEIGHT - 3).length;
  const isDanger = state.isDanger || dangerColumns > 0 || maxHeight >= 10;

  const origFutureGrid = applyGravity(grid);
  const origFutureStats = calculateStats(origFutureGrid);

  const hasFutureChain = isChainActive && origFutureStats.matchSize > 0;

  // 3. Evaluate Raising
  const explodingLiftEnabled = options?.explodingLift ?? true;
  const hoardPanels = skillLevel >= 5 && (!isChainActive || explodingLiftEnabled);

  if (!isDanger) {
    if (hoardPanels && maxHeight < 9 && totalPanels < 50) {
      // Evaluate flatness to determine if we should raise or flatten first
      const minHeight = Math.min(...heights);
      const heightDifference = maxHeight - minHeight;
      const isRelativelyFlat = heightDifference <= 3 || (isChainActive && explodingLiftEnabled);
      
      if (isRelativelyFlat || maxHeight <= 4) {
        moves.push({
          type: "RAISE",
          // Base score 600, scales up if it's very flat. Spike the score heavily if extending a chain with exploding lift
          score: (isChainActive && explodingLiftEnabled) ? 1200 : (600 + (3 - heightDifference) * 100), 
          isChainSetup: false,
        });
      }
    } else if (skillLevel >= 4 && maxHeight < 4) {
      moves.push({
        type: "RAISE",
        score: 200,
        isChainSetup: false,
      });
    }
  }

  // Track critical chain panels to avoid ruining deep setups
  const criticalGrid = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(false));
  for (let x = 0; x < GRID_WIDTH; x++) {
    // Collect the Y indices of all non-popping panels in original grid
    const nonPoppingYs: number[] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const p = grid[y][x];
      if (p && !["MATCHED", "POPPING_WAIT", "POPPING", "POPPED"].includes(p.state)) {
        nonPoppingYs.push(y);
      }
    }
    
    // Now check if any of these became part of a match in origFutureGrid
    let maxCriticalOriginalY = -1;
    for (let newY = 0; newY < nonPoppingYs.length; newY++) {
      if (origFutureStats.matchedKeys.has(newY * 100 + x)) {
        maxCriticalOriginalY = Math.max(maxCriticalOriginalY, nonPoppingYs[newY]);
      }
    }

    // Anything AT or BELOW the max critical panel must not be disturbed,
    // otherwise the critical panel will fall into a different Y coordinate and miss the timing/altitude.
    if (maxCriticalOriginalY !== -1) {
      for (let y = maxCriticalOriginalY; y >= 0; y--) { 
         if (grid[y][x]) {
           criticalGrid[y][x] = true;
         }
      }
    }
  }

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let sx = 0; sx < GRID_WIDTH; sx++) {
      for (let ex = 0; ex < GRID_WIDTH; ex++) {
        if (sx === ex) continue;

        const dist = Math.abs(sx - ex);
        const relaxedDist = idleFrames >= 3 ? 2 : 0; // Add +2 distance if dragging
        if (skillLevel <= 3 && dist > 1 + relaxedDist) continue;
        if (skillLevel <= 6 && dist > 2 + relaxedDist) continue;
        if (skillLevel <= 8 && dist > 4 + (relaxedDist > 0 ? 10 : 0)) continue;

        let pathValid = true;
        const step = sx < ex ? 1 : -1;
        let tempGrid = [...grid];
        tempGrid[y] = [...grid[y]];
        let intermediateMatch = false;

        for (let ix = sx; ix !== ex + step; ix += step) {
          if (ix !== sx) {
            // Swap step by step
            const prevX = ix - step;
            const p1 = tempGrid[y][prevX];
            const p2 = tempGrid[y][ix];
            
            // Match `canSwap` logic
            if (!p1 && !p2) {
              pathValid = false;
              break;
            }
            if ((p1 && (!validMoveStates.includes(p1.state) || p1.dontSwap)) || 
                (p2 && (!validMoveStates.includes(p2.state) || p2.dontSwap))) {
              pathValid = false;
              break;
            }
            
            // Cannot swap if panel above is hovering
            if (y < GRID_HEIGHT - 1) {
              const above1 = tempGrid[y + 1][prevX];
              const above2 = tempGrid[y + 1][ix];
              if ((above1 && above1.state === "HOVERING") || 
                  (above2 && above2.state === "HOVERING")) {
                pathValid = false;
                break;
              }
            }

            if (p2) tempGrid[y][prevX] = { ...p2, state: "IDLE" };
            else tempGrid[y][prevX] = null;

            if (p1) tempGrid[y][ix] = { ...p1, state: "IDLE" };
            else tempGrid[y][ix] = null;

            if (ix !== ex) {
              if (
                hasMatchAt(tempGrid, prevX, y) ||
                hasMatchAt(tempGrid, ix, y)
              ) {
                intermediateMatch = true;
                break;
              }
            }
          } else {
             // For the very first square (sx), check if it's currently valid to move at all.
             const p = tempGrid[y][ix];
             if (p && (!validMoveStates.includes(p.state) || p.dontSwap)) {
               pathValid = false;
               break;
             }
             if (y < GRID_HEIGHT - 1) {
               const above = tempGrid[y + 1][ix];
               if (above && above.state === "HOVERING") {
                 pathValid = false;
                 break;
               }
             }
          }
        }

        if (!pathValid) continue;
        if (intermediateMatch) continue; // Prevent dragging through a match
        if (!grid[y][sx] && !grid[y][ex]) continue; // Skip moving empty spaces into empty spaces
        if (grid[y][sx]?.type === grid[y][ex]?.type) continue;

        const firstSwapX = sx < ex ? sx : sx - 1;
        const minX = Math.min(sx, ex);
        const maxX = Math.max(sx, ex);

        // Chain Timing Check ("Too Late" Insert detection)
        let timingTooTight = false;
        const cursorSteps = Math.abs(state.cursor.x - firstSwapX) + Math.abs(state.cursor.y - y);
        const botInterval = options?.interval ?? 150; // Milliseconds per action for the CPU
        const requiredMs = (cursorSteps + dist) * botInterval;

        const diffIdx = Math.max(0, Math.min(9, state.level - 1));
        const hoverMsec = LEVEL_HOVER_MSEC[diffIdx] ?? 200;

        for (let checkX = minX; checkX <= maxX; checkX++) {
          const p = tempGrid[y][checkX];
          if (p) {
            const isGrounded = y === 0 || tempGrid[y - 1][checkX] !== null;
            if (isGrounded) {
              let msToLand = 0;
              let foundBlock = null;
              let gap = 0;
              let popDelay = 0;

              for (let aboveY = y + 1; aboveY < GRID_HEIGHT; aboveY++) {
                const aboveP = grid[aboveY][checkX];
                if (!aboveP) {
                  if (foundBlock === null) gap++;
                } else if (
                  ["MATCHED", "POPPING_WAIT", "POPPING", "POPPED"].includes(aboveP.state)
                ) {
                  popDelay += aboveP.stateTimer;
                } else {
                  if (foundBlock === null) {
                    foundBlock = aboveP;
                  }
                }
              }

              if (foundBlock) {
                let blockSelfDelay = hoverMsec;
                if (foundBlock.state === "HOVERING" || foundBlock.state === "FALLING") {
                  blockSelfDelay = foundBlock.stateTimer;
                }
                msToLand = popDelay + gap * FALL_DELAY + blockSelfDelay;

                if (requiredMs > msToLand) {
                  timingTooTight = true;
                }
              }
            }
          }
        }
        if (timingTooTight) continue;

        let touchesCritical = false;
        for (let ix = minX; ix <= maxX; ix++) {
          if (criticalGrid[y][ix]) touchesCritical = true;
        }

        const swappedGrid = tempGrid;

        let score = 0;
        let isChainSetup = false;

        // Penalize recent swaps to prevent repetitive loops (spam-swapping in the same spot)
        const recentCount = recentSwaps.filter((s) => s.x === firstSwapX && s.y === y).length;
        if (recentCount > 0) {
          score -= recentCount * 5000;
          
          // Absolute blacklist if stuck in a tight loop of identical moves
          if (recentCount >= 2) {
            score -= 100000;
          }
        }

        // Heavily penalize moves that ruin the chain structure logic,
        // but can be overcome if they create immediate score or an even better chain.
        if (touchesCritical) {
           score -= 20000;
        }

        const immStats = calculateStats(swappedGrid);
        let immediateMatches = immStats.matchSize;

        let involvesDanger = false;
        immStats.matchedKeys.forEach((k) => {
          const mx = k % 100;
          if (heights[mx] >= 9) involvesDanger = true;
        });

        let immediateScore = 0;
        if (immediateMatches > 0) {
          immediateScore += 100 * immediateMatches;
          immediateScore -= dist * 20;

          immStats.matchedKeys.forEach((k) => {
            const my = Math.floor(k / 100);
            immediateScore += Math.pow(my, 1.5) * 5;
          });

          if (involvesDanger) immediateScore += 5000;
        }

        let gridForGravity = swappedGrid;
        if (immediateMatches > 0) {
          gridForGravity = swappedGrid.map((row) => [...row]);
          for (const k of immStats.matchedKeys) {
            gridForGravity[Math.floor(k / 100)][k % 100] = null;
          }
        }

        const futureGrid = applyGravity(gridForGravity);
        const futStats = calculateStats(futureGrid);

        if (futStats.matchSize < origFutureStats.matchSize) {
          score -= 5000; // Do not break expected future chains
          continue; // Always skip moves that break chains
        }

        if (futStats.matchSize > origFutureStats.matchSize) {
          const newMatches = futStats.matchSize - origFutureStats.matchSize;

          score += 1000 + newMatches * 200;
          score -= dist * 10;
          isChainSetup = true;

          futStats.matchedKeys.forEach((k) => {
            const mx = k % 100;
            if (heights[mx] >= 9) involvesDanger = true;
          });
          if (involvesDanger) score += 5000;
        }

        // Apply immediate match rules AFTER checking for chains
        if (immediateMatches > 0) {
          let skipIsolatedMatch = false;

          if (hoardPanels && !isDanger && !involvesDanger && !isChainSetup) {
             skipIsolatedMatch = true; // Skip isolated matches to hoard panels, but allow chains
          } 
          
          if (skillLevel >= 9 && isChainActive && !isChainSetup && !isDanger && !involvesDanger) {
              const explodingLiftEnabled = options?.explodingLift ?? true;
              if (hasFutureChain) {
                  if (!explodingLiftEnabled) {
                      skipIsolatedMatch = true; // Never do regular clears if we have a chain to preserve
                  } else {
                      score -= 2000; // Penalize it
                  }
              }
          }

          if (skipIsolatedMatch) {
            continue;
          }

          score += immediateScore;
          if (skillLevel >= 7 && skillLevel < 9 && isChainActive && !isChainSetup && !isDanger && !involvesDanger) {
             score -= 500;
          }
        }

        // Reward grouping same colors together for future setups
        if (skillLevel >= 5 && immediateMatches === 0 && !isChainSetup) {
          const adjacencyDiff = futStats.adjacencyScore - origFutureStats.adjacencyScore;
          if (adjacencyDiff > 0) {
            let mult = 80;
            if (isChainActive && !hasFutureChain) {
              mult = 1500; // Desperate for a setup, heavily reward 2-swap groupings!
            }
            score += adjacencyDiff * mult; 
            score -= dist * 2; 
          }
        }

        // Downstacking & Flattening
        if (skillLevel >= 2) {
          let heightReductionScore = 0;
          let originalDangerCols = 0;
          let newDangerCols = 0;

          for (let i = 0; i < GRID_WIDTH; i++) {
            if (origFutureStats.heights[i] >= 9) originalDangerCols++;
            if (futStats.heights[i] >= 9) newDangerCols++;

            const origSq = origFutureStats.heights[i] * origFutureStats.heights[i];
            const newSq = futStats.heights[i] * futStats.heights[i];
            // Tycoon gets lower multiplier for flattening
            // Hoarding increases multiplier to prioritize flattening before raising
            const multiplier = isTycoon ? 0.5 : (hoardPanels ? 10 : 2);
            heightReductionScore += (origSq - newSq) * multiplier;

            if (origFutureStats.heights[i] < futStats.heights[i]) {
              if (futStats.heights[i] >= 9) {
                heightReductionScore -= isTycoon ? 50 : 200;
              }
            }
          }

          if (newDangerCols > originalDangerCols) {
            heightReductionScore -= isTycoon ? 200 : 1000;
          }
          if (newDangerCols < originalDangerCols) {
            heightReductionScore += isTycoon ? 100 : 2000;
          }

          if (heightReductionScore > 0) {
            score += heightReductionScore;
            score -= dist * 5;
          }
        }

        if (skillLevel <= 3) {
          score += Math.random() * 200 - 100;
        }

        if (score > 0) {
          moves.push({
            type: "SWAP",
            x: firstSwapX,
            y,
            score,
            isChainSetup,
          });
        }
      }
    }
  }

  moves.sort((a, b) => b.score - a.score);

  const variance = Math.max(0, 10 - skillLevel);
  const randIndex =
    skillLevel >= 9
      ? 0
      : Math.floor(Math.random() * Math.min(moves.length, 1 + variance));

  const bestMove = moves[randIndex] || moves[0];
  if (bestMove.type === "IDLE") return null;
  return bestMove;
};
