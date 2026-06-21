import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { X, Lock, Unlock, TrendingUp } from "lucide-react";
import { SavingsState, UpgradeLevels } from "../types";

interface SavingsAccountMenuProps {
  coins: number;
  savings: SavingsState | null;
  upgradeLevels: UpgradeLevels;
  onDeposit: (amount: number, lockTimeHours: number) => void;
  onWithdraw: (amount: number) => void;
  onClose: () => void;
}

export const SavingsAccountMenu: React.FC<SavingsAccountMenuProps> = ({
  coins,
  savings,
  upgradeLevels,
  onDeposit,
  onWithdraw,
  onClose,
}) => {
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  const [canWithdraw, setCanWithdraw] = useState<boolean>(false);

  const interestRate = 0.1 + upgradeLevels.highROI * 0.1; // 10% base + 10% per level
  const lockTimeHours = Math.max(1, 24 - upgradeLevels.efficientInvesting);

  useEffect(() => {
    if (!savings) {
      setCanWithdraw(false);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      if (now >= savings.lockEndTime) {
        setCanWithdraw(true);
        setTimeLeftStr("Ready to Withdraw!");
      } else {
        setCanWithdraw(false);
        const diff = savings.lockEndTime - now;
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeftStr(`${h}h ${m}m ${s}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [savings]);

  const projectedReturn = Math.floor(depositAmount * (1 + interestRate));
  const currentReturn = savings ? Math.floor(savings.lockedAmount * (1 + interestRate)) : 0;

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
        className="relative bg-indigo-900 border-4 border-emerald-500 rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-xl flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-indigo-300 hover:text-white transition-colors"
        >
          <X className="w-8 h-8" />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-emerald-500 justify-center rounded-2xl flex items-center shadow-lg shadow-emerald-500/30">
            <Lock className="w-8 h-8 text-emerald-900" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">
              Bank of De Pon
            </h2>
            <div className="text-emerald-400 font-bold tracking-widest uppercase flex items-center gap-2 text-sm">
              <div className="w-5 h-5 bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center text-[10px] text-yellow-700 font-black">
                P
              </div>{" "}
              {coins} Coins Available
            </div>
          </div>
        </div>

        {savings ? (
          <div className="bg-indigo-950/50 border border-indigo-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <Unlock className="w-12 h-12 text-indigo-400 mb-4" />
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">
              Active Investment
            </h3>
            <div className="text-indigo-200 mb-6 font-medium">
              You have locked away{" "}
              <span className="text-yellow-400 font-bold">
                {savings.lockedAmount}
              </span>{" "}
              coins.
              <br />
              Total payout:{" "}
              <span className="text-emerald-400 font-bold text-lg">
                {currentReturn}
              </span>{" "}
              coins
            </div>

            <div
              className={`text-2xl font-black uppercase tracking-widest p-4 rounded-xl mb-6 w-full ${canWithdraw ? "bg-emerald-900/50 text-emerald-300 border border-emerald-500" : "bg-indigo-900/50 text-indigo-300 border border-indigo-600"}`}
            >
              {timeLeftStr}
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => onWithdraw(currentReturn)}
                disabled={!canWithdraw}
                className={`w-full py-4 rounded-xl font-black text-xl uppercase tracking-widest transition-all ${canWithdraw ? "bg-emerald-500 text-emerald-900 hover:bg-emerald-400 shadow-xl shadow-emerald-500/30" : "bg-indigo-800 text-indigo-400 opacity-50 cursor-not-allowed"}`}
              >
                Withdraw
              </button>
              
              {!canWithdraw && (
                <button
                  onClick={() => {
                    const penaltyAmount = Math.floor(savings.lockedAmount * 0.9);
                    onWithdraw(penaltyAmount);
                  }}
                  className="w-full py-2 rounded-xl font-bold text-sm uppercase tracking-widest text-rose-400 hover:text-rose-300 transition-colors border border-rose-500/30 hover:bg-rose-500/10"
                >
                  Withdraw Now (10% Fee: {savings.lockedAmount - Math.floor(savings.lockedAmount * 0.9)} coins)
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-indigo-950/50 border border-indigo-700 rounded-2xl p-6 flex flex-col">
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-4 border-b border-indigo-800 pb-2 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" /> New Investment
            </h3>
            <p className="text-indigo-300 text-sm mb-6">
              Lock your Panel Coins safely in the bank for <span className="text-emerald-400 font-bold">{lockTimeHours} hours</span> to earn a <span className="text-yellow-400 font-bold">{Math.round(interestRate * 100)}%</span> return on your investment!
            </p>

            <div className="mb-6">
              <label className="block text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2">
                Amount to Deposit
              </label>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setDepositAmount(Math.max(0, depositAmount - 100))}
                  className="w-10 sm:w-12 h-12 shrink-0 bg-indigo-800 rounded-xl flex items-center justify-center text-white font-black hover:bg-indigo-700 active:bg-indigo-600"
                >
                  -
                </button>
                <input
                  type="number"
                  value={depositAmount || ""}
                  placeholder="0"
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setDepositAmount(Math.min(coins, Math.max(0, val)));
                  }}
                  className="flex-1 min-w-0 bg-indigo-900 border-2 border-indigo-600 rounded-xl h-12 text-center text-xl sm:text-2xl font-black text-yellow-400 focus:outline-none focus:border-yellow-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setDepositAmount(Math.min(coins, depositAmount + 100))}
                  className="w-10 sm:w-12 h-12 shrink-0 bg-indigo-800 rounded-xl flex items-center justify-center text-white font-black hover:bg-indigo-700 active:bg-indigo-600"
                >
                  +
                </button>
                <button
                  onClick={() => setDepositAmount(coins)}
                  className="px-2 sm:px-4 h-12 shrink-0 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black hover:bg-emerald-500 active:bg-emerald-400 uppercase text-xs tracking-wider"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="bg-indigo-900 border border-indigo-700 rounded-xl p-4 flex justify-between items-center mb-6">
              <div className="text-indigo-200 text-sm font-bold uppercase">
                Projected Payout
              </div>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                <div className="w-5 h-5 bg-emerald-400 rounded-full border-2 border-emerald-600 flex items-center justify-center text-[10px] text-emerald-900 font-black">
                  P
                </div>{" "}
                {projectedReturn}
              </div>
            </div>

            <button
              onClick={() => onDeposit(depositAmount, lockTimeHours)}
              disabled={depositAmount <= 0}
              className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all ${depositAmount > 0 ? "bg-emerald-500 text-emerald-900 hover:bg-emerald-400 shadow-xl shadow-emerald-500/30" : "bg-indigo-800 text-indigo-400 opacity-50 cursor-not-allowed"}`}
            >
              Deposit & Lock
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
