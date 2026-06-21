import React from "react";
import { GameState } from "../types";
import { findBestMove } from "./botAI";

export const processBotLogic = (
  state: GameState,
  realDeltaTime: number,
  optionsRef: React.MutableRefObject<any>,
  explodingLiftEnabled: boolean,
  swap: (x: number, y: number) => void,
) => {
  if (state.isPaused || state.isGameOver || !optionsRef.current?.swapBot) {
    return;
  }

  state.botActionTimer += realDeltaTime;

  // Base speed for level 1 (beginner)
  const baseSpeed = 250; // ms per action (move cursor or swap)
  // 1.35^9 is ~14.8, bringing baseSpeed down to ~16.8ms at skill level 10.
  const overclockMultiplier = Math.pow(1.35, optionsRef.current.overclock || 0);
  let interval = baseSpeed / overclockMultiplier;

  // Rate limit to 60 actions per second (1/60th of a second)
  interval = Math.max(1000 / 60, interval);

  if (state.botActionTimer >= interval) {
    // We only execute up to 1 action per 60FPS frame to strictly obey 60FPS timing.
    let actionsThisFrame = 0;
    let evaluatedThisFrame = false;
    while (state.botActionTimer >= interval && actionsThisFrame < 1) {
      state.botActionTimer -= interval;
      actionsThisFrame++;

      const skillLevel = Math.max(
        1,
        Math.min(10, (optionsRef.current.logicProcessor || 0) + 1),
      );

      if (!state.botTargetAction && !evaluatedThisFrame) {
        evaluatedThisFrame = true;
        const isTycoon = optionsRef.current?.mode === "tycoon";
        const bestMove = findBestMove(
          state, 
          skillLevel, 
          isTycoon, 
          state.botRecentSwaps, 
          state.botIdleFrames, 
          { explodingLift: explodingLiftEnabled }
        );
        if (bestMove) {
          state.botIdleFrames = 0;
          if (bestMove.type === "SWAP") {
            state.botTargetAction = {
              type: "SWAP",
              x: bestMove.x,
              y: bestMove.y,
            };
          } else {
            state.botTargetAction = { type: "RAISE" };
          }
        } else {
          state.botIdleFrames++;
        }
      }

      const isTycoon = optionsRef.current?.mode === "tycoon";

      if (state.botTargetAction) {
        if (state.botTargetAction.type === "SWAP") {
          const { x: tx, y: ty } = state.botTargetAction;

          // Navigate cursor towards target
          let dx = 0;
          let dy = 0;

          if (state.cursor.x < tx) dx = 1;
          else if (state.cursor.x > tx) dx = -1;

          if (state.cursor.y < ty) dy = 1;
          else if (state.cursor.y > ty) dy = -1;

          if (dx !== 0 || dy !== 0) {
            state.cursor.x = Math.max(0, Math.min(4, state.cursor.x + dx));
            state.cursor.y = Math.max(0, Math.min(11, state.cursor.y + dy));
          } else {
            // We are at the target swap!
            swap(tx, ty);
            // If the swap failed, or if we succeeded, we clear the target and evaluate again next time.
            state.botTargetAction = null;
            
            state.botRecentSwaps.push({ x: tx, y: ty });
            if (state.botRecentSwaps.length > 15) {
              state.botRecentSwaps.shift();
            }
          }
        } else if (state.botTargetAction.type === "RAISE") {
          // We'll let useGameLogic handle the actual raising by checking botTargetAction
          // The bot stops raising when an immediate match becomes very viable in danger or if the stack is too high.
          let maxHeight = 0;
          for (let c = 0; c < 6; c++) {
            for (let r = 0; r < 12; r++) {
              if (state.grid[r][c]) maxHeight = Math.max(maxHeight, r + 1);
            }
          }
          const stopRaiseThreshold = 10;

          if (
            maxHeight >= stopRaiseThreshold ||
            (state.isDanger && !isTycoon) ||
            state.isGameOver
          ) {
            state.botTargetAction = null;
          } else {
            // Drift cursor towards center so it looks alive and ready
            if (Math.random() < 0.3) {
              let dx = 0;
              let dy = 0;
              if (state.cursor.x < 2) dx = 1;
              else if (state.cursor.x > 3) dx = -1;
              if (state.cursor.y > 3) dy = -1;
              
              if (dx !== 0 || dy !== 0) {
                 state.cursor.x = Math.max(0, Math.min(4, state.cursor.x + dx));
                 state.cursor.y = Math.max(0, Math.min(11, state.cursor.y + dy));
              }
            }
          }
        }
      } else {
        // Idle Behavior: drift cursor down gracefully instead of flailing
        if (Math.random() < 0.2) {
          if (state.cursor.y > 1) state.cursor.y--;
        }
      }
    }
  }
};
