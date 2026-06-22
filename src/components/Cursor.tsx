import React from "react";
import { motion } from "motion/react";

interface CursorProps {
  x: number;
  y: number;
  risingOffset: number;
}

export const Cursor: React.FC<CursorProps> = ({ x, y, risingOffset }) => {
  return (
    <div
      className="absolute z-10 pointer-events-none flex flex-row items-center justify-center"
      style={{
        width: "calc(200% / 6)",
        height: "calc(100% / 12)",
        left: `calc(${x} * 100% / 6)`,
        bottom: `calc(${y} * 100% / 12 + ${risingOffset} * 100% / 12)`,
      }}
    >
      <img
        src="./p1_cursor.png"
        alt="cursor"
        className="w-[110%] h-[115%] object-fill scale-[1.15] drop-shadow-md"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
