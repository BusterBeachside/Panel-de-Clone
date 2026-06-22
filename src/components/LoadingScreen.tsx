import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play } from "lucide-react";

interface LoadingScreenProps {
  onStart: () => void;
}

const PANEL_TYPES = [1, 2, 3, 4, 5, 6, 8];
const FRAMES = [1, 2, 3, 4, 5, 6, 7];

const SOUND_EFFECTS = [
  "/sound/move.ogg",
  "/sound/swap.ogg",
  "/sound/combo.wav",
  "/sound/land.ogg",
  "/sound/gameover.ogg",
  "/sound/fanfare1.ogg",
  "/sound/fanfare2.ogg",
  "/sound/fanfare3.ogg",
  "/sound/coin.mp3",
];

// Add chain and pop sounds to the list
for (let i = 1; i <= 13; i++) SOUND_EFFECTS.push(`/sound/chain${i}.wav`);
for (let s = 1; s <= 4; s++) {
  for (let n = 1; n <= 10; n++) SOUND_EFFECTS.push(`/sound/pop${s}-${n}.ogg`);
}

const MUSIC_FILES = [
  "/music/normal_music_start.ogg",
  "/music/normal_music.ogg",
  "/music/danger_music.ogg",
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onStart }) => {
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const assets: string[] = [];

    // Panels
    PANEL_TYPES.forEach((t) => {
      FRAMES.forEach((f) => {
        assets.push(`/panels/panel${t}${f}.png`);
      });
    });

    // Cursor
    assets.push("/p1_cursor.png");

    const audioAssets: string[] = [...SOUND_EFFECTS, ...MUSIC_FILES];

    const total = assets.length + audioAssets.length;
    let loadedCount = 0;

    const incrementProgress = () => {
      loadedCount++;
      setProgress(Math.min(100, Math.floor((loadedCount / total) * 100)));
      if (loadedCount >= total) {
        setTimeout(() => setIsLoaded(true), 500);
      }
    };

    // Load and decode images onto the GPU to avoid rendering latency
    assets.forEach((url) => {
      const img = new Image();
      img.src = url;
      if (typeof img.decode === "function") {
        img.decode()
          .then(incrementProgress)
          .catch(() => {
            console.warn(`Failed to decode image: ${url}`);
            incrementProgress();
          });
      } else {
        img.onload = incrementProgress;
        img.onerror = () => {
          console.warn(`Failed to track load for image: ${url}`);
          incrementProgress();
        };
      }
    });

    // Fetch and cache audio files to bypass media preloading policies
    audioAssets.forEach((url) => {
      fetch(url)
        .then(() => {
          incrementProgress();
        })
        .catch(() => {
          console.warn(`Failed to preload audio via fetch: ${url}`);
          incrementProgress();
        });
    });

    // Fallback if some hangs
    const timer = setTimeout(() => {
      if (loadedCount < total) {
        setProgress(100);
        setIsLoaded(true);
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-indigo-950 flex flex-col items-center justify-center p-8 ${isLoaded ? "cursor-pointer" : ""}`}
      onClick={isLoaded ? onStart : undefined}
    >
      <AnimatePresence mode="wait">
        {!isLoaded ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col items-center gap-8"
          >
            <div className="relative w-24 h-24">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-indigo-500/20 border-t-indigo-400 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center font-black text-indigo-200">
                {progress}%
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">
                Preloading Assets
              </h2>
              <div className="w-64 h-2 bg-indigo-900 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-400"
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-8"
          >
            <div className="text-center">
              <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase mb-2">
                Panel de Clone
              </h1>
              <p className="text-indigo-200 font-bold uppercase tracking-widest text-sm">
                Assets Loaded & Ready
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStart}
              className="group relative flex items-center justify-center w-64 py-6 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-600/40 border-b-8 border-indigo-800 active:border-b-0 active:translate-y-2 transition-all"
            >
              <div className="flex items-center gap-3">
                <Play className="w-8 h-8 fill-white text-white" />
                <span className="text-2xl font-black text-white tracking-tight uppercase italic">
                  START GAME
                </span>
              </div>
            </motion.button>

            <p className="text-indigo-400/60 text-xs font-bold uppercase tracking-widest mt-4">
              Click anywhere to begin
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
