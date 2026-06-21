import { Grid, PanelData, PanelType } from "../types";
import { GRID_WIDTH, GRID_HEIGHT, PANEL_TYPES } from "../constants";

export const getRandomPanelType = (zappedColor?: PanelType | null, level?: number): PanelType => {
  let types = [...PANEL_TYPES];
  
  if (level === undefined || level < 9) {
    types = types.filter(t => t !== "vtriangle");
  }

  if (zappedColor) {
    types = types.filter(t => t !== zappedColor);
  }
  return types[Math.floor(Math.random() * types.length)];
};

export const createEmptyGrid = (): Grid => {
  const grid: Grid = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const row: (PanelData | null)[] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      row.push(null);
    }
    grid.push(row);
  }
  return grid;
};

export const createInitialGrid = (level?: number): Grid => {
  const grid = createEmptyGrid();
  // Fill initial 5 rows
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      let type = getRandomPanelType(null, level);
      // Avoid immediate matches during initialization
      while (
        (x >= 2 &&
          grid[y][x - 1]?.type === type &&
          grid[y][x - 2]?.type === type) ||
        (y >= 2 &&
          grid[y - 1][x]?.type === type &&
          grid[y - 2][x]?.type === type)
      ) {
        type = getRandomPanelType(null, level);
      }
      grid[y][x] = {
        id: crypto.randomUUID(),
        type,
        state: "IDLE",
        stateTimer: 0,
      };
    }
  }
  return grid;
};
