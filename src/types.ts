export type PanelType =
  | "heart"
  | "circle"
  | "triangle"
  | "star"
  | "diamond"
  | "vtriangle"
  | "shock";

export type PanelState =
  | "IDLE"
  | "SWAPPING_LEFT"
  | "SWAPPING_RIGHT"
  | "HOVERING"
  | "FALLING"
  | "LANDING"
  | "MATCHED"
  | "POPPING_WAIT"
  | "POPPING"
  | "POPPED";

export interface PanelData {
  id: string;
  type: PanelType;
  state: PanelState;
  stateTimer: number; // For animations
  comboIndex?: number;
  comboSize?: number;
  isChaining?: boolean;
  chainSet?: number;
  dontSwap?: boolean;
}

export interface SavingsState {
  lockedAmount: number;
  lockEndTime: number;
}

export interface FloatText {
  id: string;
  x: number;
  y: number;
  offset?: number;
  combo: number;
  chain: number;
  life: number;
  isCoin?: boolean;
  amount?: number;
}

export type Grid = (PanelData | null)[][];

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  grid: Grid;
  cursor: Position;
  score: number;
  level: number;
  speedLevel: number;
  isGameOver: boolean;
  elapsedTime: number;
  risingOffset: number; // 0 to 1
  risingSpeed: number;
  stopTimer: number; // Halts rising
  isPaused: boolean;
  manualRaiseActive: boolean;
  activeEffects: FloatText[];
  currentChain: number;
  isDanger: boolean;
  rowsRaised: number;
  botActionTimer: number;
  botIdleFrames: number;
  botTargetAction: { type: "SWAP", x: number, y: number } | { type: "RAISE" } | null;
  botRecentSwaps: { x: number, y: number }[];
  zappedColor: PanelType | null;
  powerUpTimers: {
    sloMo: number;
    scoreSurge: number;
    coinShower: number;
    colorZapper: number;
  };
  powerUpSelection: {
    type: keyof PowerUpInventory;
    x: number;
    y: number;
  } | null;
}

export interface Controls {
  up: string;
  down: string;
  left: string;
  right: string;
  swap1: string;
  swap2: string;
  raise1: string;
  raise2: string;
}

export interface UpgradeLevels {
  scoreMultiplier: number;
  coinMultiplier: number;
  savingsAccount: boolean;
  highROI: number;
  efficientInvesting: number;
  swapBot: boolean;
  logicProcessor: number;
  overclock: number;
  cooling: number;
  sloMoDuration: number;
  scoreSurgeDuration: number;
  coinShowerDuration: number;
  colorZapperDuration: number;
}

export interface PowerUpInventory {
  lineBomb: number;
  staircaseBomb: number;
  sloMo: number;
  colorZapper: number;
  scoreSurge: number;
  coinShower: number;
}
