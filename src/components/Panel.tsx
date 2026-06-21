import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { PanelType, PanelState } from "../types";
import { SWAP_DURATION, FLASH_DURATION } from "../constants";

interface PanelProps {
  type: PanelType;
  state: PanelState;
  stateTimer: number;
  isDanger?: boolean;
}

const PANEL_TYPE_MAP: Record<PanelType, number> = {
  heart: 1,
  circle: 2,
  triangle: 3,
  star: 4,
  diamond: 5,
  vtriangle: 6,
  shock: 8,
};

const FRAME_COUNT = 7; // Frames are 1 to 7

export const Panel: React.FC<PanelProps> = ({
  type,
  state,
  stateTimer,
  isDanger,
}) => {
  if (type === ("EMPTY" as any)) return null;
  const typeIdx = PANEL_TYPE_MAP[type];

  // Flashing animation uses frames 1 and 5 alternating
  // Danger uses frames 2, 3, 4 jumping
  // Face is 6, Popping is 6 (or whatever looks best)
  const getImagePath = () => {
    if (state === "MATCHED") {
      const elapsed = FLASH_DURATION - stateTimer;
      // In the last 200ms of MATCHED state, show the "face" graphic (frame 6)
      if (stateTimer < 200) {
        return `/panels/panel${typeIdx}6.png`;
      }
      // For the rest, cycle between flash states (5 and 1)
      const cycleFrames = [5, 1];
      const cycleIdx = Math.floor(elapsed / 50) % cycleFrames.length;
      return `/panels/panel${typeIdx}${cycleFrames[cycleIdx]}.png`;
    }
    if (state === "POPPING" || state === "POPPING_WAIT") {
      return `/panels/panel${typeIdx}6.png`;
    }
    if (state === "LANDING") {
      const elapsed = 200 - stateTimer;
      const cycleFrames = [4, 3, 2, 1];
      // 200ms total, 4 frames -> 50ms per frame
      const cycleIdx = Math.max(0, Math.min(3, Math.floor(elapsed / 50)));
      return `/panels/panel${typeIdx}${cycleFrames[cycleIdx]}.png`;
    }
    if (
      isDanger &&
      (state === "IDLE" ||
        state === "HOVERING" ||
        state === "FALLING" ||
        state === "LANDING")
    ) {
      const cycleFrames = [4, 1, 2, 3, 2, 1];
      const cycleIdx = Math.floor(Date.now() / 50) % cycleFrames.length; // Use Date.now() for synchronized jumping across column
      return `/panels/panel${typeIdx}${cycleFrames[cycleIdx]}.png`;
    }
    return `/panels/panel${typeIdx}1.png`; // Fallback to 1 (IDLE/FALLING/HOVERING)
  };

  let xOffset = 0;
  if (state === "SWAPPING_LEFT") {
    xOffset = (stateTimer / SWAP_DURATION) * 100;
  } else if (state === "SWAPPING_RIGHT") {
    xOffset = -(stateTimer / SWAP_DURATION) * 100;
  }

  if (state === "POPPED") {
    return null; // Don't render popped panels, they are waiting for the rest of the combo to finish
  }

  return (
    <div
      className="w-full h-full relative"
      style={{ transform: `translateX(${xOffset}%)` }}
    >
      <img
        src={getImagePath()}
        alt={type}
        className={`w-full h-full object-fill ${
          state === "MATCHED" ? "brightness-150" : ""
        }`}
        referrerPolicy="no-referrer"
      />
      {state === "POPPING" && (
        <motion.div
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 1.5, opacity: 0 }}
          className="absolute inset-0 bg-white rounded-full pointer-events-none"
        />
      )}
    </div>
  );
};
