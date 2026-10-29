import test from "node:test";
import assert from "node:assert/strict";
import {
  actionFacing,
  advanceAnimation,
  canInterruptAction,
  jumpLift,
  isDeliberatePointerMove,
} from "../src/petMotion.js";

test("looping gait advances several frames without leaving its strip", () => {
  const animation = { frame: 0, acc: 0, done: false };
  advanceAnimation(animation, { frames: 4, fps: 12, loop: true }, 0.5);
  assert.equal(animation.frame, 2);
  advanceAnimation(animation, { frames: 4, fps: 12, loop: true }, 10);
  assert.equal(animation.frame, 2);
  assert.equal(animation.done, false);
});

test("pet/jump one-shots finish on the last frame and never wrap", () => {
  const animation = { frame: 0, acc: 0, done: false };
  const clip = { frames: 4, fps: 10, loop: false };
  advanceAnimation(animation, clip, 0.39);
  assert.equal(animation.frame, 3);
  assert.equal(animation.done, false);
  advanceAnimation(animation, clip, 0.01);
  assert.equal(animation.done, true);
  advanceAnimation(animation, clip, 30);
  assert.equal(animation.frame, 3);
});

test("60 Hz and 144 Hz displays reach the same frame after the same time", () => {
  const play = (hz) => {
    const animation = { frame: 0, acc: 0, done: false };
    let elapsed = 0;
    while (elapsed < 1.37) {
      const dt = Math.min(1 / hz, 1.37 - elapsed);
      advanceAnimation(animation, { frames: 9, fps: 6, loop: true }, dt);
      elapsed += dt;
    }
    return animation;
  };
  assert.equal(play(60).frame, 8);
  assert.equal(play(144).frame, 8);
  assert.ok(Math.abs(play(60).acc - play(144).acc) < 1e-8);
});

test("a moving pointer wakes sleep and demos, but does not cut off pet/jump", () => {
  assert.equal(canInterruptAction({ name: "hit", demo: false }), false);
  assert.equal(canInterruptAction({ name: "jump", demo: false }), false);
  assert.equal(canInterruptAction({ name: "sleep", demo: false }), true);
  assert.equal(canInterruptAction({ name: "walk_left", demo: true }), true);
});

test("scroll-induced stationary mouse events do not cancel a card preview", () => {
  assert.equal(
    isDeliberatePointerMove({
      type: "pointermove",
      pointerType: "mouse",
      movementX: 0,
      movementY: 0,
    }),
    false,
  );
  assert.equal(
    isDeliberatePointerMove({
      type: "pointermove",
      pointerType: "mouse",
      movementX: 3,
      movementY: 0,
    }),
    true,
  );
  assert.equal(
    isDeliberatePointerMove({
      type: "pointermove",
      pointerType: "touch",
      movementX: 0,
      movementY: 0,
    }),
    true,
  );
  assert.equal(
    isDeliberatePointerMove({
      type: "pointerdown",
      pointerType: "mouse",
      movementX: 0,
      movementY: 0,
    }),
    true,
  );
});

test("side-profile jumps keep the most recent horizontal direction", () => {
  assert.equal(actionFacing("jump", "left", "right"), "left");
  assert.equal(actionFacing("jump", "up", "left"), "left");
  assert.equal(actionFacing("walk_up", "left"), "up");
  assert.equal(actionFacing("hit", "left"), "down");
});

test("jump lift peaks during flight and returns to ground before the final frame", () => {
  assert.equal(jumpLift(0, 8, 1), 0);
  assert.ok(jumpLift(2, 8, 1) > 29);
  assert.equal(jumpLift(7, 8, 1), 0);
});
