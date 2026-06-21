import React from "react";
import { motion } from "motion/react";
import { Play, Grid, Settings } from "lucide-react";

interface MainMenuProps {
  onSelectMode: (mode: "endless" | "tycoon") => void;
  onOptions: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onSelectMode,
  onOptions,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-indigo-950 flex flex-col items-center justify-center p-8 grid-pattern">
      <motion.div
        key="menu"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-8 bg-white/10 backdrop-blur-md p-12 rounded-3xl border border-white/20 shadow-2xl max-w-lg w-full"
      >
        <div className="text-center mb-4">
          <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase mb-2">
            Panel de Clone
          </h1>
          <p className="text-indigo-200 font-bold uppercase tracking-widest text-lg">
            Select Mode
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <motion.button
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectMode("endless")}
            className="group relative flex items-center justify-between w-full py-5 px-6 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20 border border-indigo-500 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Play className="w-6 h-6 fill-white text-white" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-black text-white tracking-tight uppercase">
                  Endless Mode
                </div>
                <div className="text-indigo-200 text-sm font-bold uppercase tracking-wider">
                  Classic survival
                </div>
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectMode("tycoon")}
            className="group relative flex items-center justify-between w-full py-5 px-6 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-600/20 border border-emerald-500 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Grid className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-black text-white tracking-tight uppercase">
                  Panel Tycoon
                </div>
                <div className="text-emerald-200 text-sm font-bold uppercase tracking-wider">
                  Play infinitely
                </div>
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOptions}
            className="group relative flex items-center justify-between w-full py-5 px-6 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors mt-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xl font-black text-white tracking-tight uppercase">
                  Options
                </div>
                <div className="text-gray-400 text-sm font-bold uppercase tracking-wider">
                  Controls & Settings
                </div>
              </div>
            </div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
