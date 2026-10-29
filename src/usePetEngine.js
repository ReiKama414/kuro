import { useEffect, useRef, useState } from "react";
import { CLIPS, FRAMES, SPECIES, clipInfo, spriteUrl } from "./pets";
import {
  actionFacing,
  advanceAnimation,
  canInterruptAction,
  jumpLift,
  isDeliberatePointerMove,
} from "./petMotion";

const CELL = 160;
const duration = (species, name) => {
  const clip = clipInfo(species, name);
  return clip.frames / clip.fps;
};

export default function usePetEngine({ species, scale, roam, onInteract }) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const world = useRef(null);
  const options = useRef({ species, scale, roam, onInteract });
  options.current = { species, scale, roam, onInteract };
  const [hud, setHud] = useState({
    clip: "idle",
    state: "IDLE",
    speed: 0,
    face: "DOWN",
    pets: 0,
    preview: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const ctx = canvas.getContext("2d");
    const sheets = {};
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const c = {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      vx: 0,
      vy: 0,
      speed: 0,
      face: "down",
      horizontalFace: "right",
      clip: "idle",
      state: "idle",
      frame: 0,
      acc: 0,
      done: false,
      idle: 0,
      rest: null,
      blink: 3,
      jump: 0,
      cooldown: 0,
    };
    const state = {
      cat: c,
      species: options.current.species,
      width: 0,
      height: 0,
      placed: false,
      pointer: null,
      preview: null,
      ripples: [],
      hearts: [],
      pets: 0,
      last: 0,
      nextRoam: 0,
      hudAt: 0,
      lastHud: "",
      transition: null,
      api: null,
    };
    world.current = state;

    const load = (sp) => {
      if (sheets[sp]) return;
      sheets[sp] = Object.fromEntries(
        CLIPS.map(({ name }) => {
          const image = new Image();
          image.src = spriteUrl(sp, name);
          return [name, image];
        }),
      );
    };
    load(state.species);
    const switchSpecies = (next) => {
      if (state.species === next) return false;
      const from = SPECIES.findIndex((pet) => pet.id === state.species);
      const to = SPECIES.findIndex((pet) => pet.id === next);
      const direction = to >= from ? 1 : -1;
      // Capture the current frame so the old pet can slide out
      if (!reducedMotion.matches && canvas.width && canvas.height) {
        const snapshot = document.createElement("canvas");
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        snapshot.getContext("2d").drawImage(canvas, 0, 0);
        state.transition = { snapshot, start: null, direction, ms: 420 };
      } else state.transition = null;
      state.species = next;
      load(next);
      return true;
    };
    const petScale = () =>
      Math.min(
        options.current.scale * (state.width < 560 ? 0.78 : 1) * 0.86,
        Math.max(0.4, (state.height - 65) / CELL),
        Math.max(0.4, (state.width - 40) / CELL),
      );
    const bounds = () => {
      const size = CELL * petScale();
      return {
        x0: size / 2 + 8,
        x1: Math.max(size / 2 + 8, state.width - size / 2 - 8),
        y0: size + 22,
        y1: Math.max(size + 22, state.height - 22),
      };
    };
    const clamp = () => {
      const b = bounds();
      c.x = Math.max(b.x0, Math.min(b.x1, c.x));
      c.y = Math.max(b.y0, Math.min(b.y1, c.y));
    };
    const reset = () => {
      state.preview = null;
      c.idle = 0;
      c.rest = null;
      c.vx = 0;
      c.vy = 0;
      c.speed = 0;
      c.jump = 0;
      c.blink = 3;
      c.tx = c.x;
      c.ty = c.y;
    };
    const setClip = (name, force = false) => {
      if (name === c.clip && !force) return;
      c.clip = name;
      c.frame = 0;
      c.acc = 0;
      c.done = false;
    };
    const publish = (now, force = false) => {
      const value = {
        clip: c.clip,
        state: c.clip.toUpperCase().replaceAll("_", " "),
        speed: Math.round(c.speed),
        face: c.face.toUpperCase(),
        pets: state.pets,
        preview: state.preview?.demo === true,
      };
      const key = JSON.stringify(value);
      if (key !== state.lastHud && (force || now - state.hudAt >= 100)) {
        state.lastHud = key;
        state.hudAt = now;
        setHud(value);
      }
    };
    const preview = (
      name,
      seconds = Math.max(2.4, duration(state.species, name)),
      demo = false,
      pointerOrigin = null,
    ) => {
      switchSpecies(options.current.species);
      reset();
      state.pointer = null;
      state.preview = { name, remaining: seconds, demo, pointerOrigin };
      c.face = actionFacing(name, c.face, c.horizontalFace);
      c.state = name.split("_")[0];
      setClip(name, true);
      publish(performance.now(), true);
      options.current.onInteract?.();
    };
    const pet = () => {
      preview("hit", duration(state.species, "hit") + 0.3);
      state.pets += 1;
      state.hearts.push({ x: c.x, y: c.y - CELL * petScale() * 0.65, t: 0 });
      publish(performance.now(), true);
    };
    const localPoint = (event) => {
      const rect = stage.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const pointerMove = (event) => {
      const origin = state.preview?.pointerOrigin;
      if (
        origin &&
        event.type === "pointermove" &&
        Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 8
      )
        return;
      if (state.preview && !isDeliberatePointerMove(event)) return;
      const p = localPoint(event);
      const b = bounds();
      state.pointer = {
        x: Math.max(b.x0, Math.min(b.x1, p.x)),
        y: Math.max(b.y0, Math.min(b.y1, p.y)),
      };
      if (state.preview && canInterruptAction(state.preview)) {
        reset();
      }
      options.current.onInteract?.();
    };
    state.api = {
      pet,
      jump: () => preview("jump", duration(state.species, "jump")),
      sleep: () => preview("sleep", 60),
      preview: (name, origin) => preview(name, undefined, true, origin),
      pointerMove,
      pointerLeave: () => {
        state.pointer = null;
      },
      pointerDown(event) {
        const p = localPoint(event);
        const size = CELL * petScale();
        const near =
          Math.abs(p.x - c.x) < size * 0.37 &&
          p.y > c.y - size * 0.78 &&
          p.y < c.y + 8;
        if (near) pet();
        else pointerMove(event);
        state.ripples.push({ ...p, t: 0, hit: near });
      },
      doubleClick(event) {
        pointerMove(event);
        preview("jump", duration(state.species, "jump"));
      },
      reset() {
        reset();
        state.pointer = null;
        state.nextRoam = 0;
        c.x = state.width / 2;
        c.y = state.height * 0.65;
        clamp();
        setClip("idle", true);
      },
    };

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const oldWidth = state.width;
      const oldHeight = state.height;
      state.width = rect.width;
      state.height = rect.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      state.transition = null;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!state.placed) {
        c.x = rect.width * 0.5;
        c.y = rect.height * 0.65;
        state.placed = true;
      } else if (oldWidth && oldHeight) {
        c.x *= rect.width / oldWidth;
        c.y *= rect.height / oldHeight;
      }
      c.tx = c.x;
      c.ty = c.y;
      state.pointer = null;
      state.nextRoam = 0;
      clamp();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    const update = (dt, now) => {
      if (switchSpecies(options.current.species)) {
        reset();
        setClip("idle", true);
      }
      clamp();
      if (state.preview) {
        state.preview.remaining -= dt;
        if (state.preview.remaining <= 0) reset();
      }
      if (state.preview) {
        const name = state.preview.name;
        c.state = name.split("_")[0];
        if (name.includes("_")) c.face = name.split("_")[1];
        setClip(name);
      } else {
        if (state.pointer) {
          c.tx = state.pointer.x;
          c.ty = state.pointer.y;
        } else if (options.current.roam) {
          if (now > state.nextRoam) {
            const b = bounds();
            c.tx = b.x0 + Math.random() * (b.x1 - b.x0);
            c.ty = b.y0 + Math.random() * (b.y1 - b.y0);
            state.nextRoam = now + 4500 + Math.random() * 4500;
          }
        } else {
          c.tx = c.x;
          c.ty = c.y;
        }
        const dx = c.tx - c.x;
        const dy = c.ty - c.y;
        const dist = Math.hypot(dx, dy);
        const px = c.x;
        const py = c.y;
        if (dist > 20) {
          const smooth = state.pointer ? 6.5 : 1.6;
          const f =
            (1 - Math.exp(-smooth * dt)) * Math.min(1, (dist - 20) / 70 + 0.35);
          c.x += dx * f;
          c.y += dy * f;
          clamp();
        }
        c.vx +=
          ((c.x - px) / Math.max(dt, 0.001) - c.vx) * Math.min(1, dt * 12);
        c.vy +=
          ((c.y - py) / Math.max(dt, 0.001) - c.vy) * Math.min(1, dt * 12);
        c.speed = Math.hypot(c.vx, c.vy);
        c.cooldown = Math.max(0, c.cooldown - dt);
        c.jump = Math.max(0, c.jump - dt);
        const moving = c.speed > 26;
        if (moving) {
          c.face =
            Math.abs(c.vx) > Math.abs(c.vy) * 1.15
              ? c.vx > 0
                ? "right"
                : "left"
              : c.vy > 0
                ? "down"
                : "up";
          c.idle = 0;
          if (["left", "right"].includes(c.face)) c.horizontalFace = c.face;
          c.rest = null;
          if (
            state.pointer &&
            c.cooldown === 0 &&
            c.speed > 650 &&
            dist > state.width * 0.25
          ) {
            c.jump = duration(state.species, "jump");
            c.cooldown = 2.4;
          }
        } else c.idle += dt;
        let clip = "idle";
        if (c.jump > 0) clip = "jump";
        else if (moving)
          clip = `${c.speed > 560 && ["right", "left"].includes(c.face) ? "run" : "walk"}_${c.face}`;
        else if (c.idle > 14) clip = "sleep";
        else if (c.idle > 3.2) {
          c.rest ||= Math.random() < 0.65 ? "sit" : "lay";
          clip = c.rest;
        } else {
          c.blink -= dt;
          if (c.clip === "blink" && !c.done) clip = "blink";
          else if (c.blink <= 0) {
            clip = "blink";
            c.blink = 2.4 + Math.random() * 3.6;
            setClip(clip, true);
          }
        }
        c.state = clip.split("_")[0];
        if (clip === "jump") c.face = c.horizontalFace;
        else if (["idle", "blink", "sit", "lay", "sleep"].includes(clip))
          c.face = "down";
        setClip(clip);
      }
      const info = clipInfo(state.species, c.clip);
      advanceAnimation(c, info, dt);
      state.ripples = state.ripples.filter((r) => (r.t += dt) < 0.75);
      state.hearts = state.hearts.filter((r) => (r.t += dt) < 1.2);
      publish(now);
    };

    const draw = (now) => {
      ctx.clearRect(0, 0, state.width, state.height);
      const img = sheets[state.species]?.[c.clip];
      const ready = img?.complete && img.naturalWidth;
      let blend = 1;
      let slideIn = 0;
      if (state.transition && !reducedMotion.matches) {
        if (ready) state.transition.start ??= now;
        const durationMs = state.transition.ms || 420;
        const progress =
          state.transition.start === null
            ? 0
            : Math.min(1, (now - state.transition.start) / durationMs);
        blend = progress * progress * (3 - 2 * progress);
        const direction = state.transition.direction || 1;
        const distance = Math.min(72, state.width * 0.12);
        const slideOut = -direction * distance * blend;
        slideIn = direction * distance * (1 - blend);
        ctx.save();
        ctx.globalAlpha = 1 - blend;
        ctx.translate(slideOut, 0);
        ctx.drawImage(
          state.transition.snapshot,
          0,
          0,
          state.width,
          state.height,
        );
        ctx.restore();
        if (progress >= 1) state.transition = null;
      } else state.transition = null;
      ctx.save();
      ctx.globalAlpha = blend;
      ctx.translate(slideIn, 0);
      for (const r of state.ripples) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, 8 + r.t * 52, 0, Math.PI * 2);
        ctx.strokeStyle = r.hit
          ? `rgba(199,240,90,${1 - r.t / 0.75})`
          : `rgba(242,245,238,${0.45 * (1 - r.t / 0.75)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const s = petScale();
      const size = CELL * s;
      const lift =
        c.state === "jump"
          ? jumpLift(c.frame, FRAMES[state.species].jump, s)
          : 0;
      ctx.save();
      ctx.translate(c.x, c.y - 2);
      ctx.scale(1, 0.24);
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        size * (["sleep", "lay"].includes(c.state) ? 0.29 : 0.2),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(12,43,25,${0.2 * (1 - lift / (50 * s))})`;
      ctx.fill();
      ctx.restore();
      if (ready) {
        ctx.save();
        ctx.translate(c.x, c.y - size + 6 * s - lift);
        if (c.clip === "jump" && c.face === "left") ctx.scale(-1, 1);
        ctx.drawImage(
          img,
          c.frame * CELL,
          0,
          CELL,
          CELL,
          -size / 2,
          0,
          size,
          size,
        );
        ctx.restore();
      }
      for (const heart of state.hearts) {
        ctx.save();
        ctx.globalAlpha = blend * Math.min(1, (1.2 - heart.t) * 2);
        ctx.translate(
          heart.x + Math.sin(heart.t * 5) * 8,
          heart.y - heart.t * 45,
        );
        ctx.scale(0.8 + heart.t * 0.2, 0.8 + heart.t * 0.2);
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.bezierCurveTo(-20, -8, -9, -22, 0, -12);
        ctx.bezierCurveTo(9, -22, 20, -8, 0, 4);
        ctx.fillStyle = "#C7F05A";
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    };
    let raf;
    const tick = (now) => {
      const dt = Math.min(0.05, state.last ? (now - state.last) / 1000 : 0.016);
      state.last = now;
      update(dt, now);
      draw(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      world.current = null;
    };
  }, []);

  return { stageRef, canvasRef, hud, api: () => world.current?.api };
}
