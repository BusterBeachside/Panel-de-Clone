import React from "react";
import { GameState, PowerUpInventory, PanelType } from "../types";
import { GRID_WIDTH, GRID_HEIGHT, LEVEL_FLASH_MSEC, FLASH_DURATION } from "../constants";

export const executePowerUp = (
  state: GameState,
  type: keyof PowerUpInventory,
  x: number,
  y: number,
  stopTimeEnabled: boolean,
  triggerSound: (effect: string) => void
) => {
  const positions: {x: number, y: number}[] = [];

  if (type === "lineBomb") {
    for (let i = 0; i < GRID_WIDTH; i++) {
      if (state.grid[y][i]) {
        positions.push({ x: i, y });
      }
    }
  } else if (type === "staircaseBomb") {
    const offsets = [[0, 0], [1, 0], [2, 0], [1, 1], [2, 1], [2, 2]];
    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
        if (state.grid[ny][nx]) {
          positions.push({ x: nx, y: ny });
        }
      }
    }
  }

  if (positions.length > 0) {
    const diffIdx = Math.min(Math.max(state.level - 1, 0), 9);
    const flashMsec = LEVEL_FLASH_MSEC[diffIdx] ?? FLASH_DURATION;
    
    positions.forEach((pos, idx) => {
      const p = state.grid[pos.y][pos.x];
      if (p) {
        p.state = "MATCHED";
        p.stateTimer = flashMsec;
        p.comboIndex = idx + 1;
        p.comboSize = positions.length;
      }
    });
    
    if (stopTimeEnabled) {
      state.stopTimer = Math.max(state.stopTimer, 1000 + positions.length * 150);
    }
    triggerSound("combo");
  }
};

export const activateColorZapper = (
  state: GameState,
  stopTimeEnabled: boolean,
  optionsRef: React.MutableRefObject<any>
) => {
  const colors = new Set<PanelType>();
  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      if (state.grid[row][col] && state.grid[row][col]?.type !== ("EMPTY" as any)) {
        colors.add(state.grid[row][col]!.type);
      }
    }
  }
  let chosenColor: PanelType | null = null;
  if (colors.size > 0) {
    const colorArray = Array.from(colors);
    chosenColor = colorArray[Math.floor(Math.random() * colorArray.length)];
    const positions: {x: number, y: number}[] = [];
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        if (state.grid[row][col] && state.grid[row][col]?.type === chosenColor) {
          positions.push({ x: col, y: row });
        }
      }
    }
    if (positions.length > 0) {
      const diffIdx = Math.min(Math.max(state.level - 1, 0), 9);
      const flashMsec = LEVEL_FLASH_MSEC[diffIdx] ?? FLASH_DURATION;
      positions.forEach((pos, idx) => {
        const p = state.grid[pos.y][pos.x];
        if (p) {
          p.state = "MATCHED";
          p.stateTimer = flashMsec;
          p.comboIndex = idx + 1;
          p.comboSize = positions.length;
        }
      });
      if (stopTimeEnabled) {
        state.stopTimer = Math.max(state.stopTimer, 1000 + positions.length * 150);
      }
    }
  }
  state.zappedColor = chosenColor;
  state.powerUpTimers.colorZapper = chosenColor ? (30000 + (optionsRef.current?.colorZapperDuration ?? 0) * 10000) : 0;
};
