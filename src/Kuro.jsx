import { useEffect, useRef, useState } from 'react';

const CELL = 160;
const FOOT = 6;
const SPRITE_BASE = '/assets/sprites';

const SPECIES = [
  { id: 'cat', label: '黑貓', en: 'KURO' },
  { id: 'seal', label: '海豹', en: 'SEAL' },
  { id: 'raccoon', label: '浣熊', en: 'RACCOON' },
  { id: 'dog', label: '臘腸犬', en: 'DACHS' },
  { id: 'hamster', label: '倉鼠', en: 'HAMSTER' },
];

const FRAMES = {
  cat: { idle: 9, blink: 6, walk_right: 8, walk_left: 8, walk_down: 8, walk_up: 8, run_right: 7, run_left: 7, sit: 6, lay: 6, sleep: 6, jump: 12, hit: 6 },
  seal: { idle: 9, blink: 6, walk_right: 8, walk_left: 8, walk_down: 8, walk_up: 8, run_right: 8, run_left: 8, sit: 6, lay: 6, sleep: 6, jump: 12, hit: 6 },
  raccoon: { idle: 8, blink: 6, walk_right: 7, walk_left: 8, walk_down: 8, walk_up: 8, run_right: 8, run_left: 8, sit: 6, lay: 6, sleep: 6, jump: 12, hit: 6 },
  dog: { idle: 8, blink: 6, walk_right: 8, walk_left: 8, walk_down: 7, walk_up: 8, run_right: 7, run_left: 7, sit: 6, lay: 6, sleep: 6, jump: 11, hit: 6 },
  hamster: { idle: 9, blink: 5, walk_right: 8, walk_left: 8, walk_down: 8, walk_up: 8, run_right: 8, run_left: 8, sit: 5, lay: 6, sleep: 6, jump: 12, hit: 6 },
};

const CLIPS = {
  idle: { frames: 9, fps: 6, loop: true },
  blink: { frames: 6, fps: 9, loop: false },
  walk_right: { frames: 8, fps: 12, loop: true },
  walk_left: { frames: 8, fps: 12, loop: true },
  walk_down: { frames: 8, fps: 12, loop: true },
  walk_up: { frames: 8, fps: 12, loop: true },
  run_right: { frames: 7, fps: 16, loop: true },
  run_left: { frames: 7, fps: 16, loop: true },
  sit: { frames: 6, fps: 7, loop: false },
  lay: { frames: 6, fps: 6, loop: false },
  sleep: { frames: 6, fps: 4, loop: true },
  jump: { frames: 12, fps: 14, loop: false },
  hit: { frames: 6, fps: 10, loop: false },
};

const STATE_CHIPS = [
  { anim: 'idle', frames: 9, fps: 6, label: 'IDLE', rule: 'speed < 26' },
  { anim: 'blink', frames: 6, fps: 9, label: 'BLINK', rule: 'idle + 2.4~6s' },
  { anim: 'walk_right', frames: 8, fps: 12, label: 'WALK R', rule: 'vx > 0' },
  { anim: 'walk_left', frames: 8, fps: 12, label: 'WALK L', rule: 'vx < 0' },
  { anim: 'walk_down', frames: 8, fps: 12, label: 'WALK ↓', rule: 'vy > 0' },
  { anim: 'walk_up', frames: 8, fps: 12, label: 'WALK ↑', rule: 'vy < 0' },
  { anim: 'run_right', frames: 7, fps: 16, label: 'RUN R', rule: 'speed > 560' },
  { anim: 'run_left', frames: 7, fps: 16, label: 'RUN L', rule: 'speed > 560' },
  { anim: 'sit', frames: 6, fps: 7, label: 'SIT', rule: 'idle > 3.2s' },
  { anim: 'lay', frames: 6, fps: 6, label: 'LAY', rule: 'idle > 3.2s' },
  { anim: 'sleep', frames: 6, fps: 4, label: 'SLEEP', rule: 'idle > 14s' },
  { anim: 'jump', frames: 12, fps: 14, label: 'JUMP+LAND', rule: '雙擊或快速甩動' },
  { anim: 'hit', frames: 6, fps: 10, label: 'PET', rule: 'pointer hit' },
];

function spriteUrl(species, clip) {
  return `${SPRITE_BASE}/${species}/${clip}.png`;
}

function loadSheets(species, cache) {
  if (cache[species]) return cache[species];
  const set = {};
  Object.keys(CLIPS).forEach((k) => {
    const im = new Image();
    im.src = spriteUrl(species, k);
    set[k] = im;
  });
  cache[species] = set;
  return set;
}

function clipInfo(species, name) {
  const c = CLIPS[name];
  return {
    frames: (FRAMES[species] || FRAMES.cat)[name] || c.frames,
    fps: c.fps,
    loop: c.loop,
  };
}

function clipDur(species, name) {
  const c = clipInfo(species, name);
  return c.frames / c.fps;
}

export default function Kuro({
  catScale = 1,
  followSmoothing = 6.5,
  runThreshold = 560,
  restDelay = 3.2,
  showGrid = true,
}) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hintRef = useRef(null);
  const chipsEls = useRef({});
  const chipCards = useRef({});
  const chipCounts = useRef({});

  const [species, setSpecies] = useState('cat');
  const [hud, setHud] = useState({ state: 'IDLE', speed: 0, face: 'DOWN', pets: 0 });
  const [activeClip, setActiveClip] = useState('idle');
  const [chipFrames, setChipFrames] = useState(() => ({ ...FRAMES.cat }));
  const [chipTick, setChipTick] = useState(0);

  const world = useRef(null);

  useEffect(() => {
    const sheets = {};
    loadSheets('cat', sheets);

    const cat = {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      speed: 0,
      vx: 0,
      vy: 0,
      face: 'down',
      state: 'idle',
      clip: 'idle',
      frame: 0,
      acc: 0,
      done: false,
      idleT: 0,
      rest: null,
      blinkT: 2 + Math.random() * 3,
      hitT: 0,
      jumpT: 0,
      jumpCd: 0,
    };

    const state = {
      species: 'cat',
      sheets,
      cat,
      pointer: { x: 0, y: 0, active: false },
      ripples: [],
      pets: 0,
      size: { w: 0, h: 0 },
      ctx: null,
      placed: false,
      last: 0,
      lastStep: 0,
      hud: { state: '', speed: -1, face: '' },
      chips: STATE_CHIPS.map((ch) => ({
        name: ch.anim,
        frames: FRAMES.cat[ch.anim],
        fps: ch.fps,
        acc: Math.random() * 0.5,
        frame: 0,
        last: -1,
        on: null,
      })),
      props: { catScale, followSmoothing, runThreshold, restDelay, showGrid },
      setHud,
      setActiveClip,
      setChipTick,
      hintRef,
    };

    world.current = state;

    const scale = () => {
      const base = state.props.catScale != null ? state.props.catScale : 1;
      const small = state.size.w < 560 ? 0.72 : 1;
      return base * small * 0.86;
    };

    const bounds = () => {
      const s = scale();
      const halfW = CELL * s * 0.34;
      return {
        minX: halfW + 8,
        maxX: state.size.w - halfW - 8,
        minY: CELL * s * 0.72,
        maxY: state.size.h - 10,
      };
    };

    const clampCat = () => {
      const b = bounds();
      state.cat.x = Math.min(Math.max(state.cat.x, b.minX), b.maxX);
      state.cat.y = Math.min(Math.max(state.cat.y, b.minY), b.maxY);
    };

    const resize = () => {
      const st = stageRef.current;
      const cv = canvasRef.current;
      if (!st || !cv) return;
      const r = st.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      state.size = { w: r.width, h: r.height };
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.ctx = ctx;
      if (!state.placed && r.width > 0) {
        state.cat.x = r.width * 0.5;
        state.cat.y = r.height * 0.62;
        state.cat.tx = state.cat.x;
        state.cat.ty = state.cat.y;
        state.placed = true;
      }
      clampCat();
    };

    const setClip = (name, force) => {
      const c = state.cat;
      if (c.clip === name && !force) return;
      c.clip = name;
      c.frame = 0;
      c.acc = 0;
      c.done = false;
    };

    const advance = (dt) => {
      const c = state.cat;
      const clip = clipInfo(state.species, c.clip);
      c.acc += dt;
      const step = 1 / clip.fps;
      while (c.acc >= step) {
        c.acc -= step;
        if (c.frame + 1 >= clip.frames) {
          if (clip.loop) c.frame = 0;
          else {
            c.frame = clip.frames - 1;
            c.done = true;
          }
        } else c.frame += 1;
      }
    };

    const update = (dt) => {
      const c = state.cat;
      const smooth = state.props.followSmoothing ?? 6.5;
      const runAt = state.props.runThreshold ?? 560;
      const rest = state.props.restDelay ?? 3.2;

      if (state.pointer.active) {
        c.tx = state.pointer.x;
        c.ty = state.pointer.y;
      } else {
        c.tx = c.x;
        c.ty = c.y;
      }

      const busy = c.hitT > 0;
      let dx = c.tx - c.x;
      let dy = c.ty - c.y;
      const dist = Math.hypot(dx, dy);
      const px = c.x;
      const py = c.y;

      if (!busy && dist > 22) {
        const f = 1 - Math.exp(-smooth * dt);
        const ease = Math.min(1, (dist - 22) / 90);
        c.x += dx * f * (0.45 + 0.55 * ease);
        c.y += dy * f * (0.45 + 0.55 * ease);
        clampCat();
      }

      const ivx = (c.x - px) / Math.max(dt, 0.0001);
      const ivy = (c.y - py) / Math.max(dt, 0.0001);
      c.vx += (ivx - c.vx) * Math.min(1, dt * 12);
      c.vy += (ivy - c.vy) * Math.min(1, dt * 12);
      c.speed = Math.hypot(c.vx, c.vy);

      if (c.hitT > 0) c.hitT = Math.max(0, c.hitT - dt);
      if (c.jumpT > 0) c.jumpT = Math.max(0, c.jumpT - dt);
      if (c.jumpCd > 0) c.jumpCd = Math.max(0, c.jumpCd - dt);

      const moving = c.speed > 26;
      if (moving) {
        if (Math.abs(c.vx) > Math.abs(c.vy) * 1.15) c.face = c.vx > 0 ? 'right' : 'left';
        else c.face = c.vy > 0 ? 'down' : 'up';
        c.idleT = 0;
        c.rest = null;
        if (c.jumpCd === 0 && c.speed > runAt * 0.55 && dist > state.size.w * 0.22) {
          c.jumpT = clipDur(state.species, 'jump');
          c.jumpCd = 2.4;
        }
      } else {
        c.idleT += dt;
      }

      let st;
      if (c.hitT > 0) st = 'hit';
      else if (c.jumpT > 0) st = 'jump';
      else if (c.speed > runAt) st = 'run';
      else if (moving) st = 'walk';
      else if (c.idleT > 14) st = 'sleep';
      else if (c.idleT > rest) {
        if (!c.rest) {
          const r = Math.random();
          c.rest = r < 0.45 ? 'sit' : r < 0.8 ? 'lay' : 'sleep';
        }
        st = c.rest;
      } else st = 'idle';

      c.state = st;

      let clip;
      if (st === 'walk') clip = 'walk_' + c.face;
      else if (st === 'run') clip = c.face === 'left' || c.face === 'right' ? 'run_' + c.face : 'walk_' + c.face;
      else if (st === 'idle') {
        c.blinkT -= dt;
        if (c.clip === 'blink' && !c.done) clip = 'blink';
        else if (c.blinkT <= 0) {
          c.blinkT = 2.4 + Math.random() * 3.6;
          clip = 'blink';
          setClip('blink', true);
        } else clip = 'idle';
      } else clip = st;

      if (st !== 'idle') c.blinkT = Math.max(c.blinkT, 1.2);
      setClip(clip);
      advance(dt);

      for (let i = state.ripples.length - 1; i >= 0; i--) {
        state.ripples[i].t += dt;
        if (state.ripples[i].t > 0.75) state.ripples.splice(i, 1);
      }

      const label =
        st === 'walk'
          ? 'WALK ' + c.face.toUpperCase()
          : st === 'run'
            ? 'RUN ' + c.face.toUpperCase()
            : st === 'hit'
              ? 'PETTED'
              : st.toUpperCase();

      const sp = Math.round(c.speed);
      const fc = c.face.toUpperCase();
      if (state.hud.state !== label || state.hud.speed !== sp || state.hud.face !== fc) {
        state.hud = { state: label, speed: sp, face: fc };
        state.setHud({ state: label, speed: sp, face: fc, pets: state.pets });
      }
      state.setActiveClip(c.clip);
    };

    const draw = () => {
      const ctx = state.ctx;
      const c = state.cat;
      if (!ctx) return;
      ctx.clearRect(0, 0, state.size.w, state.size.h);

      for (const r of state.ripples) {
        const p = r.t / 0.75;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 10 + p * 52, 0, Math.PI * 2);
        ctx.strokeStyle = r.hit
          ? 'rgba(199,240,90,' + 0.85 * (1 - p) + ')'
          : 'rgba(242,245,238,' + 0.4 * (1 - p) + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const s = scale();
      const size = CELL * s;
      const lift =
        c.state === 'jump'
          ? Math.sin(Math.PI * Math.min(1, c.frame / Math.max(1, clipInfo(state.species, 'jump').frames * 0.55))) *
            30 *
            s
          : 0;
      const shadowW = c.state === 'lay' || c.state === 'sleep' ? size * 0.4 : size * 0.26;
      const shadowA = 0.26 * (1 - lift / (30 * s + 1));
      ctx.save();
      ctx.translate(c.x, c.y - 2);
      ctx.scale(1, 0.3);
      ctx.beginPath();
      ctx.arc(0, 0, shadowW, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(8,30,17,' + Math.max(0.08, shadowA) + ')';
      ctx.fill();
      ctx.restore();

      const img = (state.sheets[state.species] || {})[c.clip];
      if (img && img.complete && img.naturalWidth) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(
          img,
          c.frame * CELL,
          0,
          CELL,
          CELL,
          c.x - size / 2,
          c.y - size + FOOT * s - lift,
          size,
          size
        );
      }
    };

    const chipTickFn = (dt) => {
      let changed = false;
      for (const ch of state.chips) {
        ch.acc += dt;
        const step = 1 / ch.fps;
        while (ch.acc >= step) {
          ch.acc -= step;
          ch.frame = (ch.frame + 1) % ch.frames;
        }
        if (ch.frame !== ch.last) {
          ch.last = ch.frame;
          changed = true;
        }
        const active = ch.name === state.cat.clip;
        if (ch.on !== active) {
          ch.on = active;
          changed = true;
        }
      }
      if (changed) state.setChipTick((n) => n + 1);
    };

    const step = (ts) => {
      const dt = state.last ? Math.min(0.05, (ts - state.last) / 1000) : 0.016;
      if (dt <= 0) return;
      state.last = ts;
      state.lastStep = ts;
      if (!state.ctx || !state.size.w) resize();
      try {
        update(dt);
        draw();
        chipTickFn(dt);
      } catch (err) {
        if (!state.warned) {
          state.warned = true;
          console.error('tick error', err);
        }
      }
    };

    let raf = requestAnimationFrame(function tick(ts) {
      step(ts);
      raf = requestAnimationFrame(tick);
    });

    const watchdog = setInterval(() => {
      const now = performance.now();
      if (now - (state.lastStep || 0) > 220) step(now);
    }, 120);

    const ro = new ResizeObserver(() => resize());
    if (stageRef.current) ro.observe(stageRef.current);
    resize();

    state.api = {
      resize,
      scale,
      bounds,
      clampCat,
      setClip,
      setSpecies(sp) {
        if (!FRAMES[sp] || sp === state.species) return;
        state.species = sp;
        loadSheets(sp, state.sheets);
        state.cat.frame = 0;
        state.cat.acc = 0;
        state.cat.done = false;
        for (const ch of state.chips) {
          ch.frames = FRAMES[sp][ch.name] || ch.frames;
          ch.frame = 0;
          ch.last = -1;
        }
      },
      localPoint(e) {
        const r = stageRef.current.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      },
      onPointerMove(e) {
        const p = state.api.localPoint(e);
        const b = bounds();
        state.pointer.x = Math.min(Math.max(p.x, b.minX), b.maxX);
        state.pointer.y = Math.min(Math.max(p.y, b.minY), b.maxY);
        if (!state.pointer.active) {
          state.pointer.active = true;
          if (hintRef.current) hintRef.current.style.opacity = '0';
        }
      },
      onPointerLeave() {
        state.pointer.active = false;
      },
      onDoubleClick(e) {
        const c = state.cat;
        if (c.hitT > 0) return;
        state.api.onPointerMove(e);
        c.jumpT = clipDur(state.species, 'jump');
        c.jumpCd = 1.2;
        c.rest = null;
        c.idleT = 0;
      },
      onPointerDown(e) {
        const p = state.api.localPoint(e);
        state.api.onPointerMove(e);
        const c = state.cat;
        const near =
          Math.hypot(p.x - c.x, p.y - c.y - CELL * scale() * 0.3) < CELL * scale() * 0.55;
        state.ripples.push({ x: p.x, y: p.y, t: 0, hit: near });
        if (near) {
          c.hitT = clipDur(state.species, 'hit');
          c.rest = null;
          c.idleT = 0;
          state.pets += 1;
          state.setHud((h) => ({ ...h, pets: state.pets }));
        }
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(watchdog);
      ro.disconnect();
      world.current = null;
    };
  }, []);

  useEffect(() => {
    if (world.current) {
      world.current.props = { catScale, followSmoothing, runThreshold, restDelay, showGrid };
    }
  }, [catScale, followSmoothing, runThreshold, restDelay, showGrid]);

  const onPickSpecies = (sp) => {
    if (!FRAMES[sp] || sp === species) return;
    setSpecies(sp);
    setChipFrames({ ...FRAMES[sp] });
    world.current?.api.setSpecies(sp);
  };

  const api = () => world.current?.api;

  return (
    <div
      style={{
        fontFamily: 'Archivo, Helvetica, sans-serif',
        background: '#0C2B19',
        color: '#F2F5EE',
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(12,43,25,0.92)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(242,245,238,0.1)',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '14px clamp(16px, 3vw, 32px)',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: '#C7F05A',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0C2B19' }} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>KURO</span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: 'rgba(242,245,238,0.72)',
                letterSpacing: '0.1em',
                paddingTop: 2,
              }}
            >
              v1.0
            </span>
          </div>
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(242,245,238,0.07)',
              border: '1px solid rgba(242,245,238,0.1)',
              borderRadius: 999,
              padding: 4,
            }}
          >
            <a href="#top" className="nav-link active">
              Home
            </a>
            <a href="#playground" className="nav-link">
              Playground
            </a>
            <a href="#states" className="nav-link">
              States
            </a>
            <a href="#about" className="nav-link">
              About
            </a>
          </nav>
          <a href="#playground" className="cta-lime">
            領養這隻貓
          </a>
        </div>
      </header>

      <section id="top" style={{ position: 'relative', background: '#35803C', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(242,245,238,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(242,245,238,0.11) 1px, transparent 1px)',
            backgroundSize: '34px 34px',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(120% 80% at 20% 0%, rgba(199,240,90,0.16), transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            maxWidth: 1240,
            margin: '0 auto',
            padding: 'clamp(48px, 8vw, 104px) clamp(16px, 3vw, 32px) clamp(40px, 6vw, 72px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 'clamp(28px, 5vw, 64px)',
            alignItems: 'end',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.14em',
                color: '#0C2B19',
                background: '#C7F05A',
                padding: '6px 12px',
                borderRadius: 999,
                marginBottom: 22,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0C2B19' }} />
              CURSOR PET · 5 CHARACTERS
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(30px, 5.2vw, 80px)',
                lineHeight: 0.96,
                fontWeight: 900,
                letterSpacing: '-0.035em',
                color: '#FFFFFF',
                textWrap: 'balance',
              }}
            >
              A LITTLE BLACK CAT
              <br />
              FOLLOWS YOUR
              <br />
              EVERY MOVE.
            </h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 460 }}>
            <p
              style={{
                margin: 0,
                fontSize: 'clamp(15px, 1.5vw, 17px)',
                lineHeight: 1.55,
                color: '#FFFFFF',
                textWrap: 'pretty',
              }}
            >
              牠會跟著你的游標走路、加速時奔跑、停下時發呆眨眼，閒置太久就自己坐下、趴著、睡著。每一幀都是手繪
              sprite，不是被 CSS 推來推去的靜態圖。
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="#playground" className="cta-dark">
                MEET KURO
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#C7F05A',
                    color: '#0C2B19',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 11,
                    fontWeight: 900,
                  }}
                >
                  →
                </span>
              </a>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: '#FFFFFF',
                  letterSpacing: '0.06em',
                }}
              >
                MOUSE / TOUCH · 13 STATES
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        id="playground"
        style={{
          background: '#0C2B19',
          padding: 'clamp(28px, 5vw, 56px) clamp(16px, 3vw, 32px) clamp(20px, 3vw, 32px)',
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
              marginBottom: 18,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(22px, 3vw, 34px)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            >
              PLAYGROUND
            </h2>
            <p
              style={{
                margin: 0,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.1em',
                color: 'rgba(242,245,238,0.55)',
              }}
            >
              MOVE TO LEAD · CLICK TO PET · DOUBLE-CLICK TO JUMP
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {SPECIES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`species-btn${species === s.id ? ' on' : ''}`}
                onClick={() => onPickSpecies(s.id)}
              >
                {s.label} {s.en}
              </button>
            ))}
          </div>

          <div
            ref={stageRef}
            onPointerMove={(e) => api()?.onPointerMove(e)}
            onPointerLeave={() => api()?.onPointerLeave()}
            onPointerDown={(e) => api()?.onPointerDown(e)}
            onDoubleClick={(e) => api()?.onDoubleClick(e)}
            style={{
              position: 'relative',
              width: '100%',
              height: 'clamp(360px, 56vh, 560px)',
              borderRadius: 28,
              overflow: 'hidden',
              background: '#3C8C42',
              border: '1px solid rgba(242,245,238,0.16)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 60px -30px rgba(0,0,0,0.6)',
              touchAction: 'none',
              cursor: 'crosshair',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'linear-gradient(rgba(242,245,238,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(242,245,238,0.13) 1px, transparent 1px)',
                backgroundSize: '30px 30px',
                pointerEvents: 'none',
                opacity: showGrid === false ? 0 : 1,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(90% 70% at 50% 110%, rgba(12,43,25,0.35), transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <canvas
              ref={canvasRef}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
            />

            <div
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.08em',
                pointerEvents: 'none',
              }}
            >
              {[
                ['STATE', hud.state, '#C7F05A'],
                ['SPEED', hud.speed, '#F2F5EE'],
                ['FACING', hud.face, '#F2F5EE'],
                ['PETS', hud.pets, '#F2F5EE'],
              ].map(([k, v, c]) => (
                <div
                  key={k}
                  style={{
                    background: 'rgba(12,43,25,0.82)',
                    border: '1px solid rgba(242,245,238,0.14)',
                    borderRadius: 999,
                    padding: '7px 13px',
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <span style={{ color: 'rgba(242,245,238,0.5)' }}>{k}</span>
                  <span style={{ color: c, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            <div
              ref={hintRef}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                transition: 'opacity 0.5s',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(20px, 3vw, 30px)',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                }}
              >
                把游標帶進來
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  color: 'rgba(255,255,255,0.8)',
                  marginTop: 8,
                }}
              >
                MOVE INSIDE THIS AREA
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: 12,
              marginTop: 12,
            }}
          >
            {[
              ['FOLLOW', '指數平滑追隨游標，delta time 補償刷新率差異。'],
              ['DIRECTION', '依速度向量切換左 / 右 / 正面 / 背面四組逐格動畫。'],
              ['REST', '閒置後隨機坐下、趴下或睡覺，眨眼獨立計時。'],
              ['BOUNDS', '角色永遠留在圓角區域內，游標離開就自然停下。'],
            ].map(([t, d]) => (
              <div
                key={t}
                style={{
                  background: 'rgba(242,245,238,0.05)',
                  border: '1px solid rgba(242,245,238,0.1)',
                  borderRadius: 16,
                  padding: '16px 18px',
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    color: '#C7F05A',
                  }}
                >
                  {t}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5, color: 'rgba(242,245,238,0.72)' }}>
                  {d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="states"
        style={{ background: '#35803C', padding: 'clamp(40px, 6vw, 80px) clamp(16px, 3vw, 32px)' }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
              marginBottom: 26,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(22px, 3vw, 34px)',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: '#FFFFFF',
              }}
            >
              STATE MACHINE
            </h2>
            <p
              style={{
                margin: 0,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.1em',
                color: '#FFFFFF',
              }}
            >
              13 CLIPS · 高亮 = 目前狀態
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 10,
            }}
          >
            {STATE_CHIPS.map((ch) => {
              const frames = chipFrames[ch.anim] || ch.frames;
              const chip = world.current?.chips.find((c) => c.name === ch.anim);
              const frame = chip?.frame ?? 0;
              const on = activeClip === ch.anim;
              return (
                <div
                  key={ch.anim}
                  ref={(el) => {
                    chipCards.current[ch.anim] = el;
                  }}
                  style={{
                    background: on ? 'rgba(12,43,25,0.62)' : 'rgba(12,43,25,0.34)',
                    border: `1px solid ${on ? '#C7F05A' : 'rgba(242,245,238,0.16)'}`,
                    boxShadow: on ? '0 0 0 3px rgba(199,240,90,0.22)' : 'none',
                    borderRadius: 18,
                    padding: '10px 10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div
                    ref={(el) => {
                      chipsEls.current[ch.anim] = el;
                    }}
                    style={{
                      width: 88,
                      height: 88,
                      backgroundImage: `url('${spriteUrl(species, ch.anim)}')`,
                      backgroundSize: `${frames * 88}px 88px`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: `${-frame * 88}px 0`,
                    }}
                  />
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      color: '#FFFFFF',
                    }}
                  >
                    {ch.label} ·{' '}
                    <span
                      ref={(el) => {
                        chipCounts.current[ch.anim] = el;
                      }}
                    >
                      {frames}f
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      letterSpacing: '0.06em',
                      color: '#C7F05A',
                    }}
                  >
                    {ch.rule}
                  </div>
                </div>
              );
            })}
            {/* chipTick forces re-render for sprite preview animation */}
            <span style={{ display: 'none' }}>{chipTick}</span>
          </div>

          <div
            style={{
              marginTop: 14,
              background: 'rgba(12,43,25,0.34)',
              border: '1px solid rgba(242,245,238,0.16)',
              borderRadius: 18,
              padding: '16px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px 14px',
              alignItems: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.06em',
              color: '#FFFFFF',
            }}
          >
            <span style={{ color: '#C7F05A' }}>PRIORITY</span>
            <span>PET</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>›</span>
            <span>JUMP</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>›</span>
            <span>RUN</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>›</span>
            <span>WALK</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>›</span>
            <span>REST（SIT / LAY / SLEEP 隨機）</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>›</span>
            <span>IDLE + BLINK</span>
          </div>
        </div>
      </section>

      <section
        id="about"
        style={{ background: '#0C2B19', padding: 'clamp(40px, 6vw, 80px) clamp(16px, 3vw, 32px)' }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 'clamp(24px, 4vw, 56px)',
            alignItems: 'start',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(26px, 4vw, 48px)',
              fontWeight: 900,
              letterSpacing: '-0.035em',
              lineHeight: 1.02,
            }}
          >
            一隻貓，
            <br />
            一套狀態機。
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'rgba(242,245,238,0.75)', textWrap: 'pretty' }}>
              追隨採指數平滑：每一帧依照 delta time 計算位移比例，所以在 60Hz 與 144Hz
              螢幕上速度一致。速度向量決定播放哪一組動畫，位置永遠被夾在互動區域內。
            </p>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'rgba(242,245,238,0.75)', textWrap: 'pretty' }}>
              停止後 3 秒進入休息分支，隨機挑選坐下、趴下或睡覺；眨眼與尾巴節奏獨立於移動計時。點一下就會被嚇一跳，然後回頭看你。
            </p>
            <div
              style={{
                display: 'flex',
                gap: 22,
                flexWrap: 'wrap',
                marginTop: 6,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.1em',
                color: 'rgba(242,245,238,0.5)',
              }}
            >
              <span>REQUEST&nbsp;ANIMATION&nbsp;FRAME</span>
              <span>SPRITE&nbsp;SHEET</span>
              <span>DELTA&nbsp;TIME</span>
            </div>
          </div>
        </div>
      </section>

      <footer
        style={{
          background: '#0C2B19',
          borderTop: '1px solid rgba(242,245,238,0.1)',
          padding: '22px clamp(16px, 3vw, 32px) 40px',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.08em',
            color: 'rgba(242,245,238,0.7)',
          }}
        >
          <span>KURO · CURSOR PET DEMO</span>
          <span>MADE WITH HAND-DRAWN SPRITES</span>
        </div>
      </footer>
    </div>
  );
}
