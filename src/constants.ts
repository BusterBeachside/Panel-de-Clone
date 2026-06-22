import { PanelType, Controls } from "./types";

export const GRID_WIDTH = 6;
export const GRID_HEIGHT = 12;

export const PANEL_TYPES: PanelType[] = [
  "heart",
  "circle",
  "triangle",
  "star",
  "diamond",
  "vtriangle",
];
// 'shock' is usually special or for garbage, we'll stick to 6 for standard play

export const DEFAULT_CONTROLS: Controls = {
  up: "KeyW",
  down: "KeyS",
  left: "KeyA",
  right: "KeyD",
  swap1: "KeyJ",
  swap2: "KeyK",
  raise1: "KeyL",
  raise2: "KeyO",
};

// Animation durations (ms)
export const SWAP_DURATION = 83; // 5 frames at 60fps (83.33ms)
export const FLASH_DURATION = 733; // 44 frames
export const POP_DURATION = 150; // 9 frames per panel
export const HOVER_DURATION = 200; // 12 frames
export const FALL_DELAY = 48; // 3 frames (48ms) per block for ultra-smooth physical transitions

export const INITIAL_RISING_SPEED = 0.002;

export const DAS_DELAY = 150;
export const DAS_REPEAT = 33;

export const LEVEL_SPEEDS = [
  0.001083, 0.001358, 0.001816, 0.00267, 0.003479, 0.004517, 0.005875, 0.007751,
  0.006699, 0.009888,
];
export const LEVEL_HOVER_MSEC = [200, 200, 183, 167, 150, 100, 83, 67, 50, 100];
export const LEVEL_POP_MSEC = [
  150, 150, 133, 133, 133, 133, 133, 117, 117, 117,
];
export const LEVEL_FLASH_MSEC = [
  733, 733, 700, 700, 633, 600, 567, 533, 500, 467,
];

// Panel Attack (TA) scoring tables
export const COMBO_SCORES = [
  0, 0, 0, 0, 20, 30, 50, 60, 70, 80, 100, 140, 170, 210, 250, 290, 340, 390,
  440, 490, 550, 610, 680, 750, 820, 900, 980, 1060, 1150, 1240, 1330,
];

export const CHAIN_SCORES = [
  0, 0, 50, 80, 150, 300, 400, 500, 700, 900, 1100, 1300, 1500, 1800,
];

// Stop frames (at 60fps) based on combo size
export const COMBO_STOP_FRAMES = [0, 0, 0, 0, 31, 42, 54, 67, 81, 96, 112, 129, 147, 166];
// Stop frames based on chain level (x2, x3, ...)
export const CHAIN_STOP_FRAMES = [0, 0, 112, 144, 176, 208, 240, 272, 304, 336, 368, 400, 432, 464];
