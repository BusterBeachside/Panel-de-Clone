import React, { useState, useEffect } from "react";
import { Controls } from "../types";
import { X, Keyboard, Maximize } from "lucide-react";

interface SettingsProps {
  controls: Controls;
  onSave: (controls: Controls) => void;
  explodingLift: boolean;
  stopTimeEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  onSaveOptions: (options: { 
    explodingLift: boolean; 
    stopTimeEnabled: boolean;
    musicVolume: number;
    sfxVolume: number;
  }) => void;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  controls,
  onSave,
  explodingLift,
  stopTimeEnabled,
  musicVolume,
  sfxVolume,
  onSaveOptions,
  onClose,
}) => {
  const [currentControls, setCurrentControls] = useState<Controls>(controls);
  const [currentExplodingLift, setCurrentExplodingLift] = useState<boolean>(explodingLift);
  const [currentStopTimeEnabled, setCurrentStopTimeEnabled] = useState<boolean>(stopTimeEnabled);
  const [currentMusicVolume, setCurrentMusicVolume] = useState<number>(musicVolume);
  const [currentSfxVolume, setCurrentSfxVolume] = useState<number>(sfxVolume);
  const [rebinding, setRebinding] = useState<keyof Controls | null>(null);

  useEffect(() => {
    if (!rebinding) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      setCurrentControls((prev) => ({
        ...prev,
        [rebinding]: e.code,
      }));
      setRebinding(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rebinding]);

  const handleSave = () => {
    onSave(currentControls);
    onSaveOptions({ 
      explodingLift: currentExplodingLift, 
      stopTimeEnabled: currentStopTimeEnabled,
      musicVolume: currentMusicVolume,
      sfxVolume: currentSfxVolume
    });
    localStorage.setItem("pdp_controls", JSON.stringify(currentControls));
    onClose();
  };

  const labels: Record<keyof Controls, string> = {
    up: "Move Up",
    down: "Move Down",
    left: "Move Left",
    right: "Move Right",
    swap1: "Swap 1",
    swap2: "Swap 2",
    raise1: "Raise 1",
    raise2: "Raise 2",
  };

  return (
    <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 rounded-3xl p-6 sm:p-8 w-full max-w-md border border-white/20 shadow-2xl max-h-full overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2 uppercase tracking-tight">
            <Keyboard className="w-6 h-6 text-indigo-600" />
            Settings
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(err => {
                    console.error("Error attempting to enable fullscreen:", err);
                  });
                } else {
                  document.exitFullscreen();
                }
              }}
              className="p-2 hover:bg-indigo-100 rounded-xl text-indigo-400 transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-indigo-100 rounded-xl text-indigo-400 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
          <div>
            <span className="block text-sm font-bold text-gray-800">Exploding Lift</span>
            <span className="block text-xs text-gray-500 mt-1">Allow raising stack while panels are popping</span>
          </div>
          <button
            onClick={() => setCurrentExplodingLift(!currentExplodingLift)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${currentExplodingLift ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${currentExplodingLift ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>

        <div className="flex justify-between items-center mb-6 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
          <div>
            <span className="block text-sm font-bold text-gray-800">Stop Time</span>
            <span className="block text-xs text-gray-500 mt-1">Stack stops rising during combos and chains</span>
          </div>
          <button
            onClick={() => setCurrentStopTimeEnabled(!currentStopTimeEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${currentStopTimeEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${currentStopTimeEnabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-indigo-700 uppercase">Music Volume</span>
              <span className="text-xs font-bold text-indigo-900">{Math.round(currentMusicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={currentMusicVolume}
              onChange={(e) => setCurrentMusicVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-indigo-700 uppercase">SFX Volume</span>
              <span className="text-xs font-bold text-indigo-900">{Math.round(currentSfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={currentSfxVolume}
              onChange={(e) => setCurrentSfxVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-8">
          {(Object.keys(currentControls) as Array<keyof Controls>).map(
            (key) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-xs text-gray-500 font-bold uppercase">
                  {labels[key]}
                </span>
                <button
                  onClick={() => setRebinding(key)}
                  className={`key-cap text-sm transition-all text-gray-800 ${
                    rebinding === key
                      ? "bg-indigo-100 border-indigo-300 text-indigo-700 animate-pulse"
                      : "hover:bg-indigo-50"
                  }`}
                >
                  {rebinding === key ? "..." : currentControls[key]}
                </button>
              </div>
            ),
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
