import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ShoppingCart, TrendingUp, Zap, Lock, Info } from "lucide-react";
import { UpgradeLevels, PowerUpInventory } from "../types";

interface ShopMenuProps {
  coins: number;
  lifetimeCoins: number;
  upgradeLevels: UpgradeLevels;
  powerUpInventory: PowerUpInventory;
  onPurchaseUpgrade: (key: keyof UpgradeLevels, nextLevel: any) => void;
  onPurchasePowerUp: (key: keyof PowerUpInventory, nextCount: number) => void;
  onDeductCoins: (amount: number) => void;
  onClose: () => void;
}

type ShopTab = "upgrades" | "powerups";

export const ShopMenu: React.FC<ShopMenuProps> = ({
  coins,
  lifetimeCoins,
  upgradeLevels,
  powerUpInventory,
  onPurchaseUpgrade,
  onPurchasePowerUp,
  onDeductCoins,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ShopTab>("upgrades");

  const getUpgradeCost = (key: keyof UpgradeLevels) => {
    const level = upgradeLevels[key] as number;
    switch (key) {
      case "scoreMultiplier":
        return Math.floor(10 * Math.pow(2, level));
      case "coinMultiplier":
        return Math.floor(50 * Math.pow(2.5, level));
      case "savingsAccount":
        return 25;
      case "highROI":
        return Math.floor(15 * Math.pow(1.5, level));
      case "efficientInvesting":
        return Math.floor(15 * Math.pow(1.5, level));
      case "swapBot":
        return 100;
      case "logicProcessor":
        return Math.floor(30 * Math.pow(2, level));
      case "overclock":
        return Math.floor(20 * Math.pow(1.5, level));
      case "cooling":
        return Math.floor(20 * Math.pow(1.5, level));
      case "sloMoDuration":
      case "scoreSurgeDuration":
      case "coinShowerDuration":
      case "colorZapperDuration":
        return Math.floor(10 * Math.pow(1.5, level));
      default:
        return 0;
    }
  };

  const getPowerUpCost = (key: keyof PowerUpInventory) => {
    const basePrices: Record<keyof PowerUpInventory, number> = {
      lineBomb: 2,
      staircaseBomb: 3,
      sloMo: 4,
      colorZapper: 5,
      scoreSurge: 4,
      coinShower: 8,
    };
    const scaleFactor = Math.floor(lifetimeCoins / 200); // Increases every 200 lifetime coins
    return basePrices[key] + scaleFactor * 1;
  };

  const upgrades = [
    {
      id: "scoreMultiplier",
      name: "Score Multiplier",
      desc: "Increases Score gained by 10% per level (x1.1, x1.2, etc.)",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: "coinMultiplier",
      name: "Coin Multiplier",
      desc: "Gain +1 coin per 1,000 points. Major price scaling!",
      icon: <TrendingUp className="w-5 h-5 text-yellow-400" />,
    },
    {
      id: "savingsAccount",
      name: "Panel Coin Savings Account",
      desc: "One-time purchase. Lock coins for 24h for 10% interest.",
      isOneTime: true,
      icon: <Lock className="w-5 h-5" />,
    },
    {
      id: "highROI",
      name: "High-ROI Savings",
      desc: "Increases interest from locking up coins by another 10% per level.",
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: "efficientInvesting",
      name: "Efficient Investing",
      desc: "Lowers lock time by 1 hour per level.",
      icon: <Zap className="w-5 h-5 text-indigo-400" />,
    },
    {
      id: "swapBot",
      name: "SwapBot 9,000",
      desc: "One-time purchase. An AI player that can play for 30s (10m CD).",
      isOneTime: true,
      icon: <Zap className="w-5 h-5 text-rose-400" />,
    },
    {
      id: "logicProcessor",
      name: "Logic Processor",
      desc: "Upgrades SwapBot by one AI level per level (Max 9).",
      maxLevel: 9,
      icon: <Info className="w-5 h-5 text-blue-400" />,
    },
    {
      id: "overclock",
      name: "Overclock",
      desc: "Increases SwapBot play time by 10 seconds per level.",
      icon: <Zap className="w-5 h-5 text-orange-400" />,
    },
    {
      id: "cooling",
      name: "Cooling Upgrade",
      desc: "Reduces SwapBot's cooldown by 5% per level.",
      maxLevel: 20,
      icon: <Zap className="w-5 h-5 text-cyan-400" />,
    },
    {
      id: "sloMoDuration",
      name: "Slo-Mo Module",
      desc: "Increases Super Slo-Mo duration by 10 seconds per level.",
      icon: <Zap className="w-5 h-5 text-blue-400" />,
    },
    {
      id: "colorZapperDuration",
      name: "Zapper Module",
      desc: "Increases Color Zapper active duration by 10 seconds per level.",
      icon: <Zap className="w-5 h-5 text-fuchsia-400" />,
    },
    {
      id: "scoreSurgeDuration",
      name: "Surge Module",
      desc: "Increases Score Surge duration by 10 seconds per level.",
      icon: <Zap className="w-5 h-5 text-purple-400" />,
    },
    {
      id: "coinShowerDuration",
      name: "Shower Module",
      desc: "Increases Coin Shower duration by 10 seconds per level.",
      icon: <Zap className="w-5 h-5 text-yellow-400" />,
    },
  ];

  const powerUps = [
    {
      id: "lineBomb",
      name: "Line Bomb",
      desc: "Clears an entire selected row instantly.",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "staircaseBomb",
      name: "Staircase Bomb",
      desc: "Clears 6 panels in a staircase pattern instantly.",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "sloMo",
      name: "Super Slo-Mo",
      desc: `Slows down the game significantly for ${30 + (upgradeLevels.sloMoDuration || 0) * 10} seconds.`,
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "colorZapper",
      name: "Color Zapper",
      desc: `Eliminates all panels of one color temporarily and stops them from spawning for ${30 + (upgradeLevels.colorZapperDuration || 0) * 10} seconds.`,
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "scoreSurge",
      name: "Score Surge",
      desc: `Doubles your score gains for ${30 + (upgradeLevels.scoreSurgeDuration || 0) * 10} seconds.`,
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "coinShower",
      name: "Coin Shower",
      desc: `Doubles the amount of coins earned for ${30 + (upgradeLevels.coinShowerDuration || 0) * 10} seconds.`,
      icon: <Zap className="w-5 h-5" />,
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
        className="relative bg-indigo-900 border-4 border-yellow-500 rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-indigo-300 hover:text-white transition-colors"
        >
          <X className="w-8 h-8" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <ShoppingCart className="w-6 h-6 text-yellow-900" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">
              Tycoon Shop
            </h2>
            <div className="text-yellow-400 font-bold tracking-widest uppercase flex items-center gap-2 text-sm">
              <div className="w-5 h-5 bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center text-[10px] text-yellow-700 font-black">
                P
              </div>{" "}
              {coins} Panel Coins
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-indigo-950/50 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab("upgrades")}
            className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest transition-all ${activeTab === "upgrades" ? "bg-indigo-600 text-white shadow-lg" : "text-indigo-400 hover:text-indigo-200"}`}
          >
            Upgrades
          </button>
          <button
            onClick={() => setActiveTab("powerups")}
            className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest transition-all ${activeTab === "powerups" ? "bg-indigo-600 text-white shadow-lg" : "text-indigo-400 hover:text-indigo-200"}`}
          >
            Power-Ups
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {activeTab === "upgrades"
            ? upgrades.map((item) => {
                const currentLevel =
                  upgradeLevels[item.id as keyof UpgradeLevels];
                const cost = getUpgradeCost(item.id as keyof UpgradeLevels);
                const isPurchased =
                  typeof currentLevel === "boolean" && currentLevel;
                const isMaxed =
                  item.maxLevel && (currentLevel as number) >= item.maxLevel;

                const requiresSavingsAccount = item.id === "highROI" || item.id === "efficientInvesting";
                const requiresSwapBot = item.id === "logicProcessor" || item.id === "overclock" || item.id === "cooling";
                const isLocked = (requiresSavingsAccount && !upgradeLevels.savingsAccount) || (requiresSwapBot && !upgradeLevels.swapBot);

                return (
                  <div
                    key={item.id}
                    className={`bg-indigo-950/50 border border-indigo-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center ${isLocked ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                  >
                    <div className="w-12 h-12 bg-indigo-900 rounded-xl flex items-center justify-center flex-none">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-white uppercase tracking-tight">
                          {item.name}
                        </h3>
                        {typeof currentLevel === "number" && (
                          <span className="text-xs bg-indigo-800 text-indigo-300 px-2 py-0.5 rounded font-bold">
                            LVL {currentLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-indigo-300 mt-1">
                        {item.desc}
                      </p>
                    </div>
                    <div className="w-full sm:w-auto">
                      {isPurchased || isMaxed ? (
                        <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl font-bold text-sm uppercase tracking-widest text-center border border-emerald-500/30">
                          {isMaxed ? "MAXED" : "OWNED"}
                        </div>
                      ) : isLocked ? (
                        <div className="px-4 py-2 bg-rose-500/20 text-rose-400 rounded-xl font-bold text-sm uppercase tracking-widest text-center border border-rose-500/30">
                          LOCKED
                        </div>
                      ) : (
                        <button
                          className={`w-full px-6 py-2 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${coins >= cost ? "bg-yellow-500 text-yellow-900 hover:bg-yellow-400 shadow-lg" : "bg-indigo-800 text-indigo-400 cursor-not-allowed opacity-50"}`}
                          disabled={coins < cost}
                          onClick={() => {
                            onDeductCoins(cost);
                            onPurchaseUpgrade(
                              item.id as keyof UpgradeLevels,
                              typeof currentLevel === "boolean"
                                ? true
                                : (currentLevel as number) + 1,
                            );
                          }}
                        >
                          {cost}
                          <div className="w-4 h-4 bg-yellow-400 rounded-full border border-yellow-600 flex items-center justify-center text-[8px] text-yellow-700 font-black leading-none">
                            P
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            : powerUps.map((item) => {
                const currentCount =
                  powerUpInventory[item.id as keyof PowerUpInventory];
                const cost = getPowerUpCost(item.id as keyof PowerUpInventory);

                return (
                  <div
                    key={item.id}
                    className="bg-indigo-950/50 border border-indigo-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
                  >
                    <div className="w-12 h-12 bg-rose-900 rounded-xl flex items-center justify-center flex-none">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-white uppercase tracking-tight">
                          {item.name}
                        </h3>
                        {currentCount > 0 && (
                          <span className="text-xs bg-rose-800 text-rose-300 px-2 py-0.5 rounded font-bold">
                            x{currentCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-indigo-300 mt-1">
                        {item.desc}
                      </p>
                    </div>
                    <div className="w-full sm:w-auto">
                      <button
                        className={`w-full px-6 py-2 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${coins >= cost ? "bg-yellow-500 text-yellow-900 hover:bg-yellow-400 shadow-lg" : "bg-indigo-800 text-indigo-400 cursor-not-allowed opacity-50"}`}
                        disabled={coins < cost}
                        onClick={() => {
                          onDeductCoins(cost);
                          onPurchasePowerUp(
                            item.id as keyof PowerUpInventory,
                            currentCount + 1,
                          );
                        }}
                      >
                        {cost}
                        <div className="w-4 h-4 bg-yellow-400 rounded-full border border-yellow-600 flex items-center justify-center text-[8px] text-yellow-700 font-black leading-none">
                          P
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
        </div>

        <div className="mt-6 pt-4 border-t border-indigo-800 flex items-center justify-between text-xs text-indigo-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>Power-up prices scale with lifetime earnings.</span>
          </div>
          <div className="font-bold">Lifetime Earned: P {lifetimeCoins}</div>
        </div>
      </motion.div>
    </div>
  );
};
