/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useGameLogic } from "./hooks/useGameLogic";
import { useAudio } from "./hooks/useAudio";
import { GameBoard } from "./components/GameBoard";
import { Settings } from "./components/Settings";
import {
  Settings as SettingsIcon,
  RotateCcw,
  Trophy,
  Play,
  Pause,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PANEL_TYPES } from "./constants";
import { UpgradeLevels, PowerUpInventory, SavingsState } from "./types";

import { LoadingScreen } from "./components/LoadingScreen";
import { MainMenu } from "./components/MainMenu";
import { ShopMenu } from "./components/ShopMenu";
import { SavingsAccountMenu } from "./components/SavingsAccountMenu";
import { PowerUpMenu } from "./components/PowerUpMenu";

const PANEL_TYPE_MAP: Record<string, number> = {
  heart: 1,
  circle: 2,
  triangle: 3,
  star: 4,
  diamond: 5,
  vtriangle: 6,
  shock: 8,
};

export default function App() {
  const {
    playSound,
    playChain,
    playPop,
    playFanfare,
    setMusic,
    stopMusic,
    pauseMusic,
    resumeMusic,
    setMusicVolume,
    setSfxVolume,
  } = useAudio();

  const [musicVolume, setMusicVolumeState] = useState(() => 
    parseFloat(localStorage.getItem("pdp_music_volume") || "0.7")
  );
  const [sfxVolume, setSfxVolumeState] = useState(() => 
    parseFloat(localStorage.getItem("pdp_sfx_volume") || "0.7")
  );

  useEffect(() => {
    setMusicVolume(musicVolume);
    setSfxVolume(sfxVolume);
  }, [musicVolume, sfxVolume, setMusicVolume, setSfxVolume]);

  const [currentScreen, setCurrentScreen] = useState<
    "loading" | "menu" | "game"
  >("loading");
  const [gameMode, setGameMode] = useState<"endless" | "tycoon">("endless");
  const [showSettings, setShowSettings] = useState(false);
  const [startLevel, setStartLevel] = useState(1);
  const [endlessBotEnabled, setEndlessBotEnabled] = useState(false);
  const [endlessBotSkillLevel, setEndlessBotSkillLevel] = useState(5);

  const isGameStarted = currentScreen === "game";

  const handleSoundEffect = useCallback(
    (effect: string, args?: any) => {
      if (!isGameStarted) return;
      switch (effect) {
        case "move":
          playSound("move");
          break;
        case "swap":
          playSound("swap");
          break;
        case "land":
          playSound("land");
          break;
        case "combo":
          playSound("combo");
          break;
        case "chain":
          playChain(args);
          break;
        case "pop":
          playPop(args.set, args.index);
          break;
        case "fanfare":
          playFanfare(args);
          break;
        case "gameover":
          playSound("gameover");
          break;
        case "coin":
          playSound("coin");
          break;
      }
    },
    [playSound, playChain, playPop, playFanfare, isGameStarted],
  );

  const [coins, setCoins] = useState(() =>
    parseInt(localStorage.getItem("tycoon_coins") || "0", 10),
  );
  const [lifetimeCoins, setLifetimeCoins] = useState(() =>
    parseInt(localStorage.getItem("tycoon_lifetime_coins") || "0", 10),
  );
  const [upgradeLevels, setUpgradeLevels] = useState<UpgradeLevels>(() => {
    const saved = localStorage.getItem("tycoon_upgrades");
    return saved
      ? {
          sloMoDuration: 0,
          scoreSurgeDuration: 0,
          coinShowerDuration: 0,
          colorZapperDuration: 0,
          ...JSON.parse(saved),
        }
      : {
          scoreMultiplier: 0,
          coinMultiplier: 0,
          savingsAccount: false,
          highROI: 0,
          efficientInvesting: 0,
          swapBot: false,
          logicProcessor: 0,
          overclock: 0,
          cooling: 0,
          sloMoDuration: 0,
          scoreSurgeDuration: 0,
          coinShowerDuration: 0,
          colorZapperDuration: 0,
        };
  });
  const [powerUpInventory, setPowerUpInventory] = useState<PowerUpInventory>(
    () => {
      const saved = localStorage.getItem("tycoon_powerups");
      return saved
        ? JSON.parse(saved)
        : {
            lineBomb: 0,
            staircaseBomb: 0,
            sloMo: 0,
            colorZapper: 0,
            scoreSurge: 0,
            coinShower: 0,
          };
    },
  );
  const [savings, setSavings] = useState<SavingsState | null>(() => {
    const saved = localStorage.getItem("tycoon_savings");
    return saved ? JSON.parse(saved) : null;
  });

  const [showShop, setShowShop] = useState(false);
  const [showSavings, setShowSavings] = useState(false);
  const [showPowerUps, setShowPowerUps] = useState(false);

  const [botStatus, setBotStatus] = useState<{ activeUntil: number; cooldownUntil: number }>(() => {
    const saved = localStorage.getItem("tycoon_bot_status");
    return saved ? JSON.parse(saved) : { activeUntil: 0, cooldownUntil: 0 };
  });
  const [currentBotState, setCurrentBotState] = useState<"READY" | "ACTIVE" | "COOLDOWN">("READY");
  const [botTimeRemaining, setBotTimeRemaining] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
       const now = Date.now();
       if (botStatus.activeUntil > now) {
          setCurrentBotState("ACTIVE");
          setBotTimeRemaining(botStatus.activeUntil - now);
       } else if (botStatus.cooldownUntil > now) {
          setCurrentBotState("COOLDOWN");
          setBotTimeRemaining(botStatus.cooldownUntil - now);
       } else {
          setCurrentBotState("READY");
          setBotTimeRemaining(0);
       }
    }, 100);
    return () => clearInterval(interval);
  }, [botStatus]);

  const handleSwapBotToggle = () => {
    const now = Date.now();
    const cooldownBaseSec = 600; // 10 minutes
    const cooldownSec = Math.max(0, cooldownBaseSec * (1 - 0.05 * upgradeLevels.cooling));

    if (currentBotState === "READY") {
       const durationMs = (30 + upgradeLevels.overclock * 10) * 1000;
       const nextStatus = { 
           activeUntil: now + durationMs, 
           cooldownUntil: now + durationMs + cooldownSec * 1000 
       };
       setBotStatus(nextStatus);
       localStorage.setItem("tycoon_bot_status", JSON.stringify(nextStatus));
    } else if (currentBotState === "ACTIVE") {
       const nextStatus = { 
           activeUntil: 0, 
           cooldownUntil: now + cooldownSec * 1000 
       };
       setBotStatus(nextStatus);
       localStorage.setItem("tycoon_bot_status", JSON.stringify(nextStatus));
    }
  };

  const formatBotTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCoinEarned = useCallback((amount: number) => {
    setCoins((prev) => {
      const next = prev + amount;
      localStorage.setItem("tycoon_coins", next.toString());
      return next;
    });
    setLifetimeCoins((prev) => {
      const next = prev + amount;
      localStorage.setItem("tycoon_lifetime_coins", next.toString());
      return next;
    });
  }, []);

  const scoreMultiplier =
    gameMode === "tycoon" ? 1 + upgradeLevels.scoreMultiplier * 0.1 : 1;
  const coinsPerThousand =
    gameMode === "tycoon" ? 1 + upgradeLevels.coinMultiplier : 0;

  const initialTycoonScore = parseInt(
    localStorage.getItem("tycoon_lifetime_score") || "0",
    10,
  ) || 0;
  const initialTycoonGrid = localStorage.getItem("tycoon_grid")
    ? JSON.parse(localStorage.getItem("tycoon_grid")!)
    : null;

  const {
    grid,
    nextRow,
    cursor,
    risingOffset,
    score,
    isGameOver,
    isPaused,
    togglePause,
    controls,
    setControls,
    explodingLift,
    setExplodingLift,
    stopTimeEnabled,
    setStopTimeEnabled,
    restart,
    activeEffects,
    isDanger,
    handleTouchSwap,
    handleSetCursor,
    rowsRaised,
    handleTouchRaise,
    activatePowerUp,
    powerUpTimers,
    powerUpSelection,
    stopTimer,
  } = useGameLogic({
    mode: gameMode,
    isStarted: isGameStarted,
    scoreMultiplier,
    coinsPerThousand,
    onSoundEffect: handleSoundEffect,
    onCoinEarned: handleCoinEarned,
    initialScore: gameMode === "tycoon" ? initialTycoonScore : 0,
    initialGrid: gameMode === "tycoon" ? initialTycoonGrid : undefined,
    swapBot: gameMode === "tycoon" ? currentBotState === "ACTIVE" : endlessBotEnabled,
    logicProcessor: gameMode === "tycoon" ? upgradeLevels.logicProcessor : endlessBotSkillLevel - 1,
    overclock: gameMode === "tycoon" ? upgradeLevels.overclock : Math.max(0, endlessBotSkillLevel - 1),
    cooling: gameMode === "tycoon" ? upgradeLevels.cooling : 0,
    sloMoDuration: gameMode === "tycoon" ? upgradeLevels.sloMoDuration : 0,
    scoreSurgeDuration: gameMode === "tycoon" ? upgradeLevels.scoreSurgeDuration : 0,
    coinShowerDuration: gameMode === "tycoon" ? upgradeLevels.coinShowerDuration : 0,
    colorZapperDuration: gameMode === "tycoon" ? upgradeLevels.colorZapperDuration : 0,
  });

  useEffect(() => {
    if (!isGameStarted) return;

    if (isGameOver || isPaused) {
      if (isGameOver) stopMusic();
      else pauseMusic();
    } else {
      setMusic(isDanger ? "danger" : "normal");
    }
  }, [
    isGameOver,
    isPaused,
    isDanger,
    setMusic,
    stopMusic,
    pauseMusic,
    isGameStarted,
  ]);

  const lastSaveTimeRef = useRef(0);
  const saveTimeoutRef = useRef<number>();

  useEffect(() => {
    if (gameMode === "tycoon") {
      const now = performance.now();
      const saveToStorage = () => {
        localStorage.setItem("tycoon_lifetime_score", score.toString());
        localStorage.setItem("tycoon_grid", JSON.stringify(grid));
        lastSaveTimeRef.current = performance.now();
      };

      if (now - lastSaveTimeRef.current > 1000) {
        saveToStorage();
      } else {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = window.setTimeout(saveToStorage, 1000);
      }
    }
    
    return () => clearTimeout(saveTimeoutRef.current);
  }, [score, grid, gameMode]);

  const handleStartMode = (mode: "endless" | "tycoon") => {
    setGameMode(mode);
    setCurrentScreen("game");
    const saveGrid = mode === "tycoon" ? initialTycoonGrid : undefined;
    const saveScore = mode === "tycoon" ? initialTycoonScore : 0;
    restart(startLevel, saveGrid, saveScore);
    
    // Resume if paused
    if (isPaused) {
      togglePause();
    }
  };

  if (currentScreen === "loading") {
    return <LoadingScreen onStart={() => setCurrentScreen("menu")} />;
  }

  if (currentScreen === "menu") {
    return (
      <>
        <MainMenu
          onSelectMode={handleStartMode}
          onOptions={() => setShowSettings(true)}
        />
        <AnimatePresence>
          {showSettings && (
            <Settings
              controls={controls}
              explodingLift={explodingLift}
              stopTimeEnabled={stopTimeEnabled}
              musicVolume={musicVolume}
              sfxVolume={sfxVolume}
              onSaveOptions={(val) => {
                setExplodingLift(val.explodingLift);
                localStorage.setItem("pdp_exploding_lift", val.explodingLift.toString());
                setStopTimeEnabled(val.stopTimeEnabled);
                localStorage.setItem("pdp_stop_time", val.stopTimeEnabled.toString());
                setMusicVolumeState(val.musicVolume);
                localStorage.setItem("pdp_music_volume", val.musicVolume.toString());
                setSfxVolumeState(val.sfxVolume);
                localStorage.setItem("pdp_sfx_volume", val.sfxVolume.toString());
              }}
              onSave={setControls}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="min-h-screen text-white font-sans selection:bg-indigo-500/30 grid-pattern flex flex-col items-center justify-center p-2 sm:p-4">
      <main className="w-full h-full max-w-[1200px] flex flex-col lg:flex-row p-2 lg:p-8 gap-4 lg:gap-8 items-stretch justify-center">
        {/* Left Sidebar */}
        <div className="hidden lg:flex w-72 flex-col justify-start h-full bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl order-1 gap-6">
          <div className="space-y-4 text-white">
            <button
              onClick={() => {
                if (!isPaused) togglePause();
                setCurrentScreen("menu");
                stopMusic();
              }}
              className="flex items-center gap-2 text-indigo-200 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-sm">
                Main Menu
              </span>
            </button>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">
              {gameMode === "tycoon" ? "Panel Tycoon" : "Panel de Clone"}
            </h1>
          </div>

          {/* Desktop HUD */}
          <div className="flex flex-col gap-4">
            <div className="bg-indigo-900/50 p-4 rounded-2xl border border-indigo-500/30">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-indigo-300 uppercase">Score</span>
                <span className="text-xl font-black text-white">{score.toLocaleString()}</span>
              </div>
              {gameMode === "tycoon" && (
                <div className="flex justify-between items-center pt-2 border-t border-indigo-700/50">
                  <span className="text-xs font-bold text-indigo-300 uppercase">Coins</span>
                  <span className="text-lg font-black text-yellow-400 flex items-center gap-1">
                    <div className="w-4 h-4 bg-yellow-400 rounded-full border border-yellow-600 flex items-center justify-center text-[8px] text-yellow-700 font-black leading-none uppercase">P</div>
                    {coins.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Pause/Unpause Button */}
            <button
              onClick={togglePause}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black uppercase text-sm tracking-wider transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] border-b-4 ${
                isPaused
                  ? "bg-emerald-500 text-emerald-950 border-emerald-700 hover:bg-emerald-400"
                  : "bg-amber-500 text-amber-950 border-amber-700 hover:bg-amber-400"
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Resume Game
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  Pause Game
                </>
              )}
            </button>

            {gameMode === "tycoon" && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowShop(true)}
                  className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-yellow-900 py-2 rounded-xl font-black uppercase hover:bg-yellow-400 transition-colors shadow-lg"
                >
                  Shop
                </button>
                {upgradeLevels.savingsAccount && (
                  <button
                    onClick={() => setShowSavings(true)}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-emerald-900 py-2 rounded-xl font-black uppercase hover:bg-emerald-400 transition-colors shadow-lg"
                  >
                    Bank
                  </button>
                )}
                <button
                  onClick={() => setShowPowerUps(true)}
                  className="w-full flex items-center justify-center gap-2 bg-rose-500 text-white py-2 rounded-xl font-black uppercase hover:bg-rose-400 transition-colors shadow-lg"
                >
                  Power-Ups
                </button>
                {upgradeLevels.swapBot && (
                  <button
                    onClick={handleSwapBotToggle}
                    disabled={currentBotState === "COOLDOWN"}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm rounded-xl font-black uppercase transition-colors shadow-lg ${
                       currentBotState === "ACTIVE" ? "bg-cyan-500 text-cyan-950 hover:bg-cyan-400" :
                       currentBotState === "COOLDOWN" ? "bg-indigo-900/50 text-indigo-400 cursor-not-allowed border border-indigo-500/30" :
                       "bg-indigo-600 text-white hover:bg-indigo-500"
                    }`}
                  >
                    <span>SwapBot AI</span>
                    <span>
                      {currentBotState === "READY" ? "Ready" :
                       currentBotState === "ACTIVE" ? `Active (${formatBotTime(botTimeRemaining)})` :
                       `Wait (${formatBotTime(botTimeRemaining)})`}
                    </span>
                  </button>
                )}
              </div>
            )}
            
            {gameMode === "endless" && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 bg-indigo-900/40 p-3 rounded-xl border border-indigo-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-200">AI Bot</span>
                    <button
                      onClick={() => setEndlessBotEnabled(!endlessBotEnabled)}
                      className={`w-12 h-6 rounded-full border-2 transition-colors relative ${endlessBotEnabled ? 'bg-emerald-500 border-emerald-400' : 'bg-rose-500 border-rose-400'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${endlessBotEnabled ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  {endlessBotEnabled && (
                    <div className="flex flex-col gap-1 border-t border-indigo-500/30 pt-2 mt-1">
                      <span className="text-xs font-bold text-indigo-300 uppercase">Skill Level</span>
                      <select
                        value={endlessBotSkillLevel}
                        onChange={(e) => setEndlessBotSkillLevel(Number(e.target.value))}
                        className="bg-indigo-950 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400 text-sm font-bold w-full border border-indigo-500/30"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => (
                          <option key={l} value={l}>Level {l}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />
          
          {/* Controls List (Reduced in size) */}
          <div className="bg-white/5 p-4 rounded-2xl text-xs">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-indigo-300 uppercase">
                  Difficulty
                </label>
                <select
                  value={startLevel}
                  onChange={(e) => setStartLevel(Number(e.target.value))}
                  className="bg-indigo-950/50 border border-indigo-500/30 text-white rounded-lg px-2 py-1.5 font-bold focus:outline-none focus:border-indigo-400"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((l) => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  if (gameMode === "tycoon") localStorage.removeItem("tycoon_grid");
                  restart(startLevel, undefined, gameMode === "tycoon" ? score : 0);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg active:scale-95"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Game
              </button>
            </div>

            <h3 className="text-white font-black uppercase mb-2">Controls</h3>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-indigo-200">
               <span>Move</span> <span className="text-white font-bold">Arrows</span>
               <span>Swap</span> <span className="text-white font-bold">Z/X</span>
               <span>Raise</span> <span className="text-white font-bold">Shift</span>
            </div>
            <button
                onClick={() => setShowSettings(true)}
                className="mt-3 w-full text-indigo-300 hover:text-white font-bold underline"
              >
                Settings
            </button>
          </div>
        </div>

        {/* Center: Game Board */}
        <div className="order-2 flex flex-col gap-2 sm:gap-4 lg:gap-6 items-center w-full lg:w-auto">
          <div className="flex flex-col items-center w-full px-2 max-w-[400px]">
            <div className="w-full flex justify-between items-center mb-2">
              <button
                onClick={() => {
                  if (!isPaused) togglePause();
                  setCurrentScreen("menu");
                  stopMusic();
                }}
                className="flex items-center gap-1 text-indigo-200 hover:text-white transition-colors lg:hidden"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-bold uppercase tracking-wider text-xs">
                  Menu
                </span>
              </button>
            </div>
            
            {/* Mobile-only HUD */}
            <div className="lg:hidden flex flex-col gap-2 w-full mt-3 mb-2 px-4 py-3 bg-indigo-900/50 rounded-2xl border border-indigo-500/30">
              <div className="flex justify-between items-center w-full">
                <span className="text-sm font-bold text-indigo-200 uppercase">Score</span>
                <span className="text-2xl font-black text-white">{score.toLocaleString()}</span>
              </div>
              {gameMode === "tycoon" && (
                <>
                  <div className="flex justify-between items-center w-full border-t border-indigo-700/50 pt-2">
                    <span className="text-sm font-bold text-indigo-200 uppercase">Coins</span>
                    <span className="text-xl font-black text-yellow-400 flex items-center gap-2">
                      <div className="w-5 h-5 bg-yellow-400 rounded-full border border-yellow-600 flex items-center justify-center text-[10px] text-yellow-700 font-black leading-none uppercase">P</div>
                      {coins.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2 w-full mt-1">
                    <button
                      onClick={() => setShowShop(true)}
                      className="flex-1 bg-yellow-500 text-yellow-900 py-1.5 rounded-lg font-black uppercase text-[10px] hover:bg-yellow-400 transition-colors shadow-lg"
                    >
                      Shop
                    </button>
                    {upgradeLevels.savingsAccount && (
                      <button
                        onClick={() => setShowSavings(true)}
                        className="flex-1 bg-emerald-500 text-emerald-900 py-1.5 rounded-lg font-black uppercase text-[10px] hover:bg-emerald-400 transition-colors shadow-lg"
                      >
                        Bank
                      </button>
                    )}
                    <button
                      onClick={() => setShowPowerUps(true)}
                      className="flex-1 bg-rose-500 text-white py-1.5 rounded-lg font-black uppercase text-[10px] hover:bg-rose-400 transition-colors shadow-lg"
                    >
                      Power
                    </button>
                  </div>
                  {upgradeLevels.swapBot && (
                    <div className="flex flex-col gap-1 w-full mt-1 border-t border-indigo-700/50 pt-2">
                       <button
                          onClick={handleSwapBotToggle}
                          disabled={currentBotState === "COOLDOWN"}
                          className={`w-full py-1.5 rounded-lg font-black uppercase text-[10px] transition-colors shadow-lg flex justify-between items-center px-3 ${
                             currentBotState === "ACTIVE" ? "bg-cyan-500 text-cyan-950 hover:bg-cyan-400" :
                             currentBotState === "COOLDOWN" ? "bg-indigo-900/50 text-indigo-400 cursor-not-allowed border border-indigo-500/30" :
                             "bg-indigo-600 text-white hover:bg-indigo-500"
                          }`}
                       >
                         <span>SwapBot AI</span>
                         <span>
                           {currentBotState === "READY" ? "Ready" :
                            currentBotState === "ACTIVE" ? `Active (${formatBotTime(botTimeRemaining)})` :
                            `Wait (${formatBotTime(botTimeRemaining)})`}
                         </span>
                       </button>
                    </div>
                  )}
                </>
              )}
              {gameMode === "endless" && (
                <div className="flex flex-col gap-2 w-full mt-1 border-t border-indigo-700/50 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-200">AI Bot</span>
                    <div className="flex items-center gap-2">
                      {endlessBotEnabled && (
                        <select
                          value={endlessBotSkillLevel}
                          onChange={(e) => setEndlessBotSkillLevel(Number(e.target.value))}
                          className="bg-indigo-950 text-white rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400 text-xs font-bold border border-indigo-500/30"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => (
                            <option key={l} value={l}>Lv {l}</option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={() => setEndlessBotEnabled(!endlessBotEnabled)}
                        className={`w-10 h-5 rounded-full border-2 transition-colors relative ${endlessBotEnabled ? 'bg-emerald-500 border-emerald-400' : 'bg-rose-500 border-rose-400'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${endlessBotEnabled ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>

        <div className="flex flex-row items-stretch justify-center gap-2 sm:gap-4 w-full max-w-[400px]">
            <GameBoard
              grid={grid}
              nextRow={nextRow}
              cursor={cursor}
              risingOffset={risingOffset}
              activeEffects={activeEffects}
              isPaused={isPaused}
              mode={gameMode}
              onTouchSwap={handleTouchSwap}
              onSetCursor={handleSetCursor}
              onTouchRaise={handleTouchRaise}
              rowsRaised={rowsRaised}
              powerUpSelection={powerUpSelection}
              powerUpTimers={powerUpTimers}
              stopTimer={stopTimer}
            />
            <button
              className="w-12 sm:w-16 lg:w-20 bg-emerald-500 rounded-3xl shadow-xl flex items-center justify-center border-[3px] lg:border-4 border-emerald-400/80 active:bg-emerald-600 active:border-emerald-700 transition-colors touch-none"
              onPointerDown={(e) => {
                if (e.target instanceof HTMLElement)
                  e.target.setPointerCapture(e.pointerId);
                handleTouchRaise(true);
              }}
              onPointerUp={(e) => {
                if (
                  e.target instanceof HTMLElement &&
                  e.target.hasPointerCapture(e.pointerId)
                )
                  e.target.releasePointerCapture(e.pointerId);
                handleTouchRaise(false);
              }}
              onPointerCancel={(e) => {
                if (
                  e.target instanceof HTMLElement &&
                  e.target.hasPointerCapture(e.pointerId)
                )
                  e.target.releasePointerCapture(e.pointerId);
                handleTouchRaise(false);
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="[writing-mode:vertical-rl] rotate-180 font-black text-emerald-950/80 uppercase tracking-widest text-base sm:text-lg lg:text-xl pointer-events-none">
                Raise
              </div>
            </button>
          </div>

          <div className="flex lg:hidden gap-2 sm:gap-4 w-full max-w-[400px]">
            <div className="flex flex-col flex-1 gap-1">
              <label className="text-[10px] sm:text-xs font-bold text-indigo-300 uppercase">
                Difficulty
              </label>
              <select
                value={startLevel}
                onChange={(e) => setStartLevel(Number(e.target.value))}
                className="bg-indigo-950/50 border-2 border-indigo-500/30 text-white rounded-xl px-2 sm:px-4 py-2 sm:py-3 font-bold focus:outline-none focus:border-indigo-400 text-sm sm:text-base"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((l) => (
                  <option key={l} value={l}>
                    Level {l}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                if (gameMode === "tycoon") localStorage.removeItem("tycoon_grid");
                restart(startLevel, undefined, gameMode === "tycoon" ? score : 0);
              }}
              className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-4 mt-[16px] sm:mt-[20px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-sm sm:text-base"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              Reset
            </button>
            <button
              onClick={togglePause}
              className="lg:hidden flex items-center justify-center mt-[16px] sm:mt-[20px] px-3 sm:px-5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-all active:scale-95"
              aria-label="Pause"
            >
              {isPaused ? (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              ) : (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              )}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="lg:hidden flex items-center justify-center mt-[16px] sm:mt-[20px] px-3 sm:px-5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-all active:scale-95"
              aria-label="Settings"
            >
              <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </main>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-indigo-950/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white/10 border border-white/20 p-12 rounded-3xl shadow-2xl text-center max-w-sm w-full"
            >
              <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <RotateCcw className="w-10 h-10 text-rose-500" />
              </div>
              <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">
                GAME OVER
              </h2>
              <div className="text-indigo-200 mb-8 font-medium">
                Final Score: {score.toLocaleString()}
              </div>
              <button
                onClick={() => restart(startLevel, undefined, gameMode === "tycoon" ? score : 0)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all shadow-xl shadow-indigo-600/40 text-lg flex items-center justify-center gap-2 active:scale-95"
              >
                <Play className="w-6 h-6 fill-current" />
                TRY AGAIN
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <Settings
            controls={controls}
            explodingLift={explodingLift}
            stopTimeEnabled={stopTimeEnabled}
            musicVolume={musicVolume}
            sfxVolume={sfxVolume}
            onSaveOptions={(val) => {
              setExplodingLift(val.explodingLift);
              localStorage.setItem("pdp_exploding_lift", val.explodingLift.toString());
              setStopTimeEnabled(val.stopTimeEnabled);
              localStorage.setItem("pdp_stop_time", val.stopTimeEnabled.toString());
              setMusicVolumeState(val.musicVolume);
              localStorage.setItem("pdp_music_volume", val.musicVolume.toString());
              setSfxVolumeState(val.sfxVolume);
              localStorage.setItem("pdp_sfx_volume", val.sfxVolume.toString());
            }}
            onSave={setControls}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* Shop Modal */}
      <AnimatePresence>
        {showShop && (
          <ShopMenu
            coins={coins}
            lifetimeCoins={lifetimeCoins}
            upgradeLevels={upgradeLevels}
            powerUpInventory={powerUpInventory}
            onPurchaseUpgrade={(key, nextLevel) => {
              setUpgradeLevels((prev) => {
                const next = { ...prev, [key]: nextLevel };
                localStorage.setItem("tycoon_upgrades", JSON.stringify(next));
                return next;
              });
            }}
            onPurchasePowerUp={(key, nextCount) => {
              setPowerUpInventory((prev) => {
                const next = { ...prev, [key]: nextCount };
                localStorage.setItem("tycoon_powerups", JSON.stringify(next));
                return next;
              });
            }}
            onDeductCoins={(amount) => {
              playSound("coin");
              setCoins((prev) => {
                const next = prev - amount;
                localStorage.setItem("tycoon_coins", next.toString());
                return next;
              });
            }}
            onClose={() => setShowShop(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSavings && (
          <SavingsAccountMenu 
            coins={coins}
            savings={savings}
            upgradeLevels={upgradeLevels}
            onDeposit={(amount, lockTimeHours) => {
              const endTime = Date.now() + lockTimeHours * 60 * 60 * 1000;
              const newSavings = { lockedAmount: amount, lockEndTime: endTime };
              setSavings(newSavings);
              localStorage.setItem("tycoon_savings", JSON.stringify(newSavings));
              setCoins(prev => {
                const next = prev - amount;
                localStorage.setItem("tycoon_coins", next.toString());
                return next;
              });
            }}
            onWithdraw={(amount) => {
              setSavings(null);
              localStorage.removeItem("tycoon_savings");
              handleCoinEarned(amount);
            }}
            onClose={() => setShowSavings(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPowerUps && (
          <PowerUpMenu
            inventory={powerUpInventory}
            upgradeLevels={upgradeLevels}
            onUse={(key) => {
              setPowerUpInventory((prev) => {
                const next = { ...prev, [key]: prev[key] - 1 };
                localStorage.setItem("tycoon_powerups", JSON.stringify(next));
                return next;
              });
              activatePowerUp(key);
              setShowPowerUps(false);
              if (isPaused) togglePause();
            }}
            onClose={() => setShowPowerUps(false)}
          />
        )}
      </AnimatePresence>

      {/* Off-screen Preloaded Assets Container to force GPU texture compilation/residency */}
      <div className="absolute top-0 left-0 w-0 h-0 overflow-hidden opacity-0 pointer-events-none invisible z-[-1]" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 8].map((t) => 
          [1, 2, 3, 4, 5, 6, 7].map((f) => (
            <img key={`${t}-${f}`} src={`./panels/panel${t}${f}.png`} alt="" referrerPolicy="no-referrer" />
          ))
        )}
        <img src="./p1_cursor.png" alt="" referrerPolicy="no-referrer" />
      </div>
    </div>
  );
}
