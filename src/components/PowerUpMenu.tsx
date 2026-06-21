import React from "react";
import { motion } from "motion/react";
import { X, Zap } from "lucide-react";
import { PowerUpInventory, UpgradeLevels } from "../types";

interface PowerUpMenuProps {
  inventory: PowerUpInventory;
  upgradeLevels: UpgradeLevels;
  onUse: (key: keyof PowerUpInventory) => void;
  onClose: () => void;
}

export const PowerUpMenu: React.FC<PowerUpMenuProps> = ({
  inventory,
  upgradeLevels,
  onUse,
  onClose,
}) => {
  const powerUps = [
    {
      id: "lineBomb",
      name: "Line Bomb",
      desc: "Clears an entire row at your cursor instantly.",
    },
    {
      id: "staircaseBomb",
      name: "Staircase Bomb",
      desc: "Clears 6 panels in a staircase pattern from your cursor instantly.",
    },
    {
      id: "colorZapper",
      name: "Color Zapper",
      desc: `Randomly eliminates all panels of one color temporarily and stops them from spawning for ${30 + (upgradeLevels.colorZapperDuration || 0) * 10} seconds.`,
    },
    {
      id: "sloMo",
      name: "Super Slo-Mo",
      desc: `Slows down the game significantly for ${30 + (upgradeLevels.sloMoDuration || 0) * 10} seconds.`,
    },
    {
      id: "scoreSurge",
      name: "Score Surge",
      desc: `Doubles your score gains for ${30 + (upgradeLevels.scoreSurgeDuration || 0) * 10} seconds.`,
    },
    {
      id: "coinShower",
      name: "Coin Shower",
      desc: `Doubles the amount of coins earned for ${30 + (upgradeLevels.coinShowerDuration || 0) * 10} seconds.`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
      <div
        className="absolute inset-0 bg-indigo-950/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-indigo-900 border-4 border-rose-500 rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-xl flex flex-col max-h-full"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-indigo-300 hover:text-white transition-colors"
        >
          <X className="w-8 h-8" />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-rose-500 justify-center rounded-2xl flex items-center shadow-lg shadow-rose-500/30">
            <Zap className="w-8 h-8 text-rose-900" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">
              Power-Ups
            </h2>
            <div className="text-rose-400 font-bold tracking-widest uppercase flex items-center gap-2 text-sm">
              Your Inventory
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {powerUps.map((item) => {
            const currentCount =
              inventory[item.id as keyof PowerUpInventory] || 0;

            return (
              <div
                key={item.id}
                className="bg-indigo-950/50 border border-indigo-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
              >
                <div className="w-12 h-12 bg-rose-900 rounded-xl flex items-center justify-center flex-none text-rose-300 font-black text-xl">
                  {currentCount > 0 ? `x${currentCount}` : "0"}
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-white uppercase tracking-tight">
                    {item.name}
                  </h3>
                  <p className="text-xs text-indigo-300 mt-1">{item.desc}</p>
                </div>
                <div className="w-full sm:w-auto">
                  <button
                    className={`w-full px-6 py-2 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${currentCount > 0 ? "bg-rose-500 text-white hover:bg-rose-400 shadow-lg" : "bg-indigo-800 text-indigo-400 cursor-not-allowed opacity-50"}`}
                    disabled={currentCount <= 0}
                    onClick={() => onUse(item.id as keyof PowerUpInventory)}
                  >
                    Use
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
