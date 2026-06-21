import React, { useEffect } from "react";
import { Controls, GameState, PowerUpInventory } from "../types";
import { DAS_DELAY } from "../constants";

type KeyboardActions = {
  moveCursor: (dx: number, dy: number) => void;
  swap: (x: number, y: number) => void;
  executePowerUp: (type: keyof PowerUpInventory, x: number, y: number) => void;
  forceUpdate: () => void;
};

export const useKeyboardInput = (
  controls: Controls,
  gameStateRef: React.MutableRefObject<GameState>,
  keysRef: React.MutableRefObject<{ [key: string]: { isDown: boolean; downTime: number; nextRepeat: number } }>,
  actions: KeyboardActions,
  isBotActive?: boolean
) => {
  const isBotActiveRef = React.useRef(isBotActive);
  const actionsRef = React.useRef(actions);

  React.useEffect(() => {
    isBotActiveRef.current = isBotActive;
    actionsRef.current = actions;
  }, [isBotActive, actions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (!keysRef.current[code]) {
        keysRef.current[code] = { isDown: false, downTime: 0, nextRepeat: 0 };
      }

      const keyState = keysRef.current[code];
      const state = gameStateRef.current;
      const currentActions = actionsRef.current;
      
      if (!keyState.isDown) {
        keyState.isDown = true;
        keyState.downTime = performance.now();
        keyState.nextRepeat = performance.now() + DAS_DELAY;

        if (code === "Escape") {
          state.isPaused = !state.isPaused;
        } else if (!isBotActiveRef.current) { // ONLY EXECUTED IF BOT IS INACTIVE
           if (code === controls.up) currentActions.moveCursor(0, 1);
           else if (code === controls.down) currentActions.moveCursor(0, -1);
           else if (code === controls.left) currentActions.moveCursor(-1, 0);
           else if (code === controls.right) currentActions.moveCursor(1, 0);
           else if (code === controls.swap1 || code === controls.swap2) {
             if (state.powerUpSelection) {
               currentActions.executePowerUp(state.powerUpSelection.type, state.powerUpSelection.x, state.powerUpSelection.y);
               state.powerUpSelection = null;
               currentActions.forceUpdate();
             } else {
               currentActions.swap(state.cursor.x, state.cursor.y);
             }
           }
           else if (code === controls.raise1 || code === controls.raise2) {
             if (state.powerUpSelection) {
               state.powerUpSelection = null;
               currentActions.forceUpdate();
             }
           }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keysRef.current[e.code]) {
        keysRef.current[e.code].isDown = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [controls, gameStateRef, keysRef]);
};
