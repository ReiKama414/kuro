export function canInterruptAction(action) {
  return !action || action.demo || action.name === "sleep";
}

export function isDeliberatePointerMove(event) {
  // Scrolling a card into view can dispatch a stationary mouse pointermove.
  return (
    event.type !== "pointermove" ||
    event.pointerType !== "mouse" ||
    Boolean(event.movementX || event.movementY)
  );
}

export function actionFacing(name, currentFace, horizontalFace = "right") {
  if (name.includes("_")) return name.split("_")[1];
  if (name === "jump") {
    return ["left", "right"].includes(currentFace)
      ? currentFace
      : horizontalFace;
  }
  return "down";
}

export function advanceAnimation(animation, clip, dt) {
  if (!clip.loop && animation.done) return;
  animation.acc += dt;
  const steps = Math.floor((animation.acc + 1e-9) * clip.fps);
  if (!steps) return;
  animation.acc = Math.max(0, animation.acc - steps / clip.fps);
  const next = animation.frame + steps;
  if (clip.loop) animation.frame = next % clip.frames;
  else {
    animation.frame = Math.min(next, clip.frames - 1);
    animation.done = next >= clip.frames;
    if (animation.done) animation.acc = 0;
  }
}

export function jumpLift(frame, frames, scale) {
  const phase = Math.min(1, frame / (frames * 0.55));
  return phase === 1 ? 0 : Math.sin(Math.PI * phase) * 30 * scale;
}
