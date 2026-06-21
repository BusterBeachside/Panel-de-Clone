import React from "react";
import { Controls } from "../types";
import { DAS_DELAY } from "../constants";

type GamepadActions = {
  moveCursor: (dx: number, dy: number) => void;
  onSwap1: () => void;
  onSwap2: () => void;
  onRaise: () => void;
  onStart: () => void;
};

export const handleGamepadInput = (
  controls: Controls,
  keysRef: React.MutableRefObject<{ [key: string]: { isDown: boolean; downTime: number; nextRepeat: number } }>,
  actions: GamepadActions
) => {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gamepads.find((pad) => pad !== null);
  if (!gp) return;

  // Simple mapping: DPAD/Left Stick (axes), Cross/A = swap1, Circle/B = swap2, Triggers/Shoulders = raise
  const pressed = (b: GamepadButton | undefined) =>
    b && (typeof b === "object" ? b.pressed : b === 1.0);

  const axes = gp.axes || [];
  const isUp = pressed(gp.buttons[12]) || axes[1] < -0.5;
  const isDown = pressed(gp.buttons[13]) || axes[1] > 0.5;
  const isLeft = pressed(gp.buttons[14]) || axes[0] < -0.5;
  const isRight = pressed(gp.buttons[15]) || axes[0] > 0.5;

  const isSwap1 = pressed(gp.buttons[0]) || pressed(gp.buttons[2]); // A or X
  const isSwap2 = pressed(gp.buttons[1]) || pressed(gp.buttons[3]); // B or Y
  const isRaise =
    pressed(gp.buttons[4]) ||
    pressed(gp.buttons[5]) ||
    pressed(gp.buttons[6]) ||
    pressed(gp.buttons[7]); // Shoulders/Triggers
  const isStart = pressed(gp.buttons[9]); // Start

  const mapGamepadButton = (
    code: string,
    isPressed: boolean,
    actionDown?: () => void,
  ) => {
    if (!keysRef.current[code]) {
      keysRef.current[code] = {
        isDown: false,
        downTime: 0,
        nextRepeat: 0,
      };
    }
    const keyState = keysRef.current[code];

    if (isPressed && !keyState.isDown) {
      keyState.isDown = true;
      keyState.downTime = performance.now();
      keyState.nextRepeat = performance.now() + DAS_DELAY;
      if (actionDown) actionDown();
    } else if (!isPressed && keyState.isDown) {
      keyState.isDown = false;
    }
  };

  mapGamepadButton(controls.up, isUp, () => actions.moveCursor(0, 1));
  mapGamepadButton(controls.down, isDown, () => actions.moveCursor(0, -1));
  mapGamepadButton(controls.left, isLeft, () => actions.moveCursor(-1, 0));
  mapGamepadButton(controls.right, isRight, () => actions.moveCursor(1, 0));
  
  mapGamepadButton(controls.swap1, isSwap1, actions.onSwap1);
  mapGamepadButton(controls.swap2, isSwap2, actions.onSwap2);
  mapGamepadButton(controls.raise1, isRaise, actions.onRaise);

  if (isStart && !keysRef.current["GamepadStart"]?.isDown) {
    actions.onStart();
  }
  mapGamepadButton("GamepadStart", isStart);
};
