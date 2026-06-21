import { useCallback, useEffect, useRef } from "react";
import { Howl } from "howler";

const SOUNDS: Record<string, string> = {
  move: "/sound/move.ogg",
  swap: "/sound/swap.ogg",
  combo: "/sound/combo.wav",
  land: "/sound/land.ogg",
  gameover: "/sound/gameover.ogg",
  coin: "/sound/coin.mp3",
};

// Chain sounds 1-13
for (let i = 1; i <= 13; i++) {
  SOUNDS[`chain${i}`] = `/sound/chain${i}.wav`;
}

// Pop sounds pop1-1 to pop4-10
for (let set = 1; set <= 4; set++) {
  for (let num = 1; num <= 10; num++) {
    SOUNDS[`pop${set}-${num}`] = `/sound/pop${set}-${num}.ogg`;
  }
}

const FANFARES: Record<number, string> = {
  4: "/sound/fanfare1.ogg",
  5: "/sound/fanfare2.ogg",
  6: "/sound/fanfare3.ogg",
};

const MUSIC = {
  start: "/music/normal_music_start.ogg",
  loop: "/music/normal_music.ogg",
  danger: "/music/danger_music.ogg",
};

export const useAudio = () => {
  const soundsRef = useRef<Record<string, Howl>>({});
  const musicRef = useRef<{
    intro: Howl | null;
    loop: Howl | null;
    danger: Howl | null;
    current: Howl | null;
    type: "normal" | "danger" | "none";
    isStarted: boolean;
  }>({
    intro: null,
    loop: null,
    danger: null,
    current: null,
    type: "none",
    isStarted: false,
  });

  useEffect(() => {
    // Preload basic sounds
    Object.entries(SOUNDS).forEach(([key, url]) => {
      let multiplier = 1.0;
      if (key === "coin") multiplier = 0.15;
      if (key === "chain13") multiplier = 0.4;

      soundsRef.current[key] = new Howl({
        src: [url],
        preload: true,
        volume: multiplier,
      });
    });

    // Preload fanfares
    [4, 5, 6].forEach((val) => {
      soundsRef.current[`fanfare${val}`] = new Howl({
        src: [FANFARES[val]],
        preload: true,
      });
    });

    // Preload music
    musicRef.current.intro = new Howl({ src: [MUSIC.start], preload: true });
    musicRef.current.loop = new Howl({
      src: [MUSIC.loop],
      loop: true,
      preload: true,
    });
    musicRef.current.danger = new Howl({
      src: [MUSIC.danger],
      loop: true,
      preload: true,
    });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        Howler.mute(true);
      } else {
        Howler.mute(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      Object.values(soundsRef.current).forEach((s: Howl) => s.unload());
      musicRef.current.intro?.unload();
      musicRef.current.loop?.unload();
      musicRef.current.danger?.unload();
    };
  }, []);

  const playSound = useCallback((name: string) => {
    const sound = soundsRef.current[name];
    if (sound) {
      sound.play();
    }
  }, []);

  const playChain = useCallback(
    (level: number) => {
      const chainIdx = Math.min(13, level - 1);
      if (chainIdx >= 1) {
        playSound(`chain${chainIdx}`);
      }
    },
    [playSound],
  );

  const playPop = useCallback(
    (set: number, index: number) => {
      const setNum = Math.min(4, Math.max(1, set));
      const popIdx = Math.min(10, Math.max(1, index));
      playSound(`pop${setNum}-${popIdx}`);
    },
    [playSound],
  );

  const playFanfare = useCallback(
    (chainLevel: number) => {
      if (chainLevel >= 6) {
        playSound("fanfare6");
      } else if (chainLevel === 5) {
        playSound("fanfare5");
      } else if (chainLevel === 4) {
        playSound("fanfare4");
      }
    },
    [playSound],
  );

  const setMusic = useCallback((type: "normal" | "danger") => {
    if (musicRef.current.type === type && musicRef.current.current?.playing())
      return;

    // Stop current music
    musicRef.current.current?.stop();

    if (type === "normal") {
      if (!musicRef.current.isStarted) {
        musicRef.current.isStarted = true;
        musicRef.current.type = "normal";

        const intro = musicRef.current.intro;
        if (intro) {
          intro.off("end"); // Clear previous listeners
          intro.on("end", () => {
            if (musicRef.current.type === "normal") {
              musicRef.current.current = musicRef.current.loop;
              musicRef.current.loop?.play();
            }
          });
          musicRef.current.current = intro;
          intro.play();
        }
      } else {
        musicRef.current.current = musicRef.current.loop;
        musicRef.current.type = "normal";
        musicRef.current.loop?.play();
      }
    } else if (type === "danger") {
      musicRef.current.current = musicRef.current.danger;
      musicRef.current.type = "danger";
      musicRef.current.danger?.play();
    }
  }, []);

  const stopMusic = useCallback(() => {
    musicRef.current.current?.stop();
    musicRef.current.type = "none";
    musicRef.current.isStarted = false;
  }, []);

  const pauseMusic = useCallback(() => {
    musicRef.current.current?.pause();
  }, []);

  const resumeMusic = useCallback(() => {
    musicRef.current.current?.play();
  }, []);

  const setMusicVolume = useCallback((volume: number) => {
    musicRef.current.intro?.volume(volume);
    musicRef.current.loop?.volume(volume);
    musicRef.current.danger?.volume(volume);
  }, []);

  const setSfxVolume = useCallback((volume: number) => {
    Object.entries(soundsRef.current).forEach(([key, sound]: [string, Howl]) => {
      let multiplier = 1.0;
      if (key === "coin") multiplier = 0.15;
      if (key === "chain13") multiplier = 0.4;
      sound.volume(volume * multiplier);
    });
  }, []);

  return {
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
  };
};
