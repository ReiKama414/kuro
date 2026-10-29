import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CLIPS, SPECIES, FRAMES, readSettings, spriteUrl } from "./pets";
import usePetEngine from "./usePetEngine";
import useFocusTimer from "./useFocusTimer";
import Icon from "./Icon";
import Hero from "./Hero";

function Sprite({ species, clip = "idle", size = 80, animate = true }) {
  const frames = FRAMES[species][clip];
  const fps = CLIPS.find((item) => item.name === clip).fps;
  return (
    <span
      aria-hidden="true"
      className={`sprite ${animate ? "sprite-animated" : ""}`}
      style={{
        "--sprite-size": `${size}px`,
        "--frames": frames,
        "--cycle": `${frames / fps}s`,
        backgroundImage: `url('${spriteUrl(species, clip)}')`,
      }}
    />
  );
}

export default function Kuro() {
  const [settings] = useState(readSettings);
  const [species, setSpecies] = useState(settings.species);
  const [scale, setScale] = useState(settings.scale);
  const [grid, setGrid] = useState(settings.grid);
  const [roam, setRoam] = useState(false);
  const [focus, setFocus] = useState(false);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState("");
  const [petScroll, setPetScroll] = useState({ left: false, right: false });
  const [petSwap, setPetSwap] = useState(false);
  const [swapDir, setSwapDir] = useState(0);
  const [tabIndicator, setTabIndicator] = useState({
    left: 0,
    width: 0,
    ready: false,
  });
  const previousRoam = useRef(false);
  const focusButton = useRef(null);
  const exitButton = useRef(null);
  const playgroundRef = useRef(null);
  const petTabsRef = useRef(null);
  const settingsRef = useRef(null);
  const uiTransition = useRef(null);
  const focusScroll = useRef(0);
  const timer = useFocusTimer();
  const { stageRef, canvasRef, hud, api } = usePetEngine({
    species,
    scale,
    roam,
  });
  const pet = SPECIES.find((item) => item.id === species);
  const currentClip = CLIPS.find((item) => item.name === hud.clip) || CLIPS[0];
  const transitionUI = (update) => {
    if (
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      update();
      return;
    }
    uiTransition.current?.skipTransition();
    uiTransition.current = document.startViewTransition(() =>
      flushSync(update),
    );
  };
  const scrollBehavior = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth";
  const scrollPets = (direction) => {
    const tabs = petTabsRef.current;
    tabs?.scrollBy({
      left: direction * tabs.clientWidth * 0.65,
      behavior: scrollBehavior(),
    });
  };

  useEffect(() => {
    const tabs = petTabsRef.current;
    const update = () => {
      const next = {
        left: tabs.scrollLeft > 2,
        right: tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 2,
      };
      setPetScroll((previous) =>
        previous.left === next.left && previous.right === next.right
          ? previous
          : next,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(tabs);
    tabs.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      tabs.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    const tabs = petTabsRef.current;
    if (!tabs) return;
    const syncIndicator = () => {
      const selected = tabs.querySelector(".pet-tab.selected");
      if (!selected) return;
      // Content-space position stays correct while the strip scrolls
      setTabIndicator({
        left: selected.offsetLeft,
        width: selected.offsetWidth,
        ready: true,
      });
    };
    const revealIfNeeded = (behavior = "instant") => {
      const selected = tabs.querySelector('[aria-pressed="true"]');
      if (!selected) return;
      const tabsRect = tabs.getBoundingClientRect();
      const selRect = selected.getBoundingClientRect();
      const pad = 12;
      const fullyVisible =
        selRect.left >= tabsRect.left + pad &&
        selRect.right <= tabsRect.right - pad;
      // Only scroll when the chosen pet is clipped — avoid yanking neighbors into view
      if (!fullyVisible) {
        const left =
          selRect.left - tabsRect.left + tabs.scrollLeft;
        tabs.scrollTo({
          left: left - (tabs.clientWidth - selected.clientWidth) / 2,
          behavior,
        });
      }
      syncIndicator();
    };
    const frame = requestAnimationFrame(() => {
      revealIfNeeded(scrollBehavior());
      syncIndicator();
    });
    const observer = new ResizeObserver(() => {
      revealIfNeeded("instant");
      syncIndicator();
    });
    observer.observe(tabs);
    tabs.addEventListener("scroll", syncIndicator, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      tabs.removeEventListener("scroll", syncIndicator);
    };
  }, [species]);

  useEffect(() => {
    if (!petSwap) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timerId = window.setTimeout(
      () => {
        setPetSwap(false);
        setSwapDir(0);
      },
      reduce ? 0 : 450,
    );
    return () => window.clearTimeout(timerId);
  }, [petSwap, species]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "kuro-room",
        JSON.stringify({ species, scale, grid }),
      );
    } catch {
      /* Private browsing still works */
    }
  }, [species, scale, grid]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    const closeSettings = (event) => {
      if (!settingsRef.current?.contains(event.target)) {
        settingsRef.current?.removeAttribute("open");
      }
    };
    document.addEventListener("pointerdown", closeSettings);
    return () => document.removeEventListener("pointerdown", closeSettings);
  }, []);
  useEffect(() => {
    if (!focus) return;
    const scrollY = focusScroll.current;
    document.body.classList.add("is-focusing");
    exitButton.current?.focus({ preventScroll: true });
    return () => {
      document.body.classList.remove("is-focusing");
      window.scrollTo({ top: scrollY, behavior: "instant" });
      focusButton.current?.focus({ preventScroll: true });
    };
  }, [focus]);
  const enterFocus = () => {
    focusScroll.current = window.scrollY;
    previousRoam.current = roam;
    api()?.pointerLeave();
    transitionUI(() => {
      setRoam(true);
      setFocus(true);
    });
  };
  const leaveFocus = () => {
    transitionUI(() => {
      setFocus(false);
      setRoam(previousRoam.current);
    });
  };
  useEffect(() => {
    const onKey = (event) => {
      const key = event.key.toLowerCase();
      if (key === "escape") {
        if (focus) leaveFocus();
        else settingsRef.current?.removeAttribute("open");
        return;
      }
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.target.closest(
          'input, textarea, select, [contenteditable="true"]',
        )
      )
        return;
      if (key === "f") {
        event.preventDefault();
        focus ? leaveFocus() : enterFocus();
      }
      if (key === "h") {
        event.preventDefault();
        api()?.pet();
      }
      if (key === "j") {
        event.preventDefault();
        api()?.jump();
      }
      if (key === "z") {
        event.preventDefault();
        api()?.sleep();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const selectPet = (id, scroll = false) => {
    if (id !== species) {
      const from = SPECIES.findIndex((item) => item.id === species);
      const to = SPECIES.findIndex((item) => item.id === id);
      setSwapDir(to >= from ? 1 : -1);
      setSpecies(id);
      setPetSwap(false);
      requestAnimationFrame(() => setPetSwap(true));
    }
    if (scroll)
      playgroundRef.current?.scrollIntoView({
        behavior: scrollBehavior(),
        block: "start",
      });
  };
  const navigatePets = (event, id) => {
    const index = SPECIES.findIndex((item) => item.id === id);
    const positions = {
      ArrowRight: (index + 1) % SPECIES.length,
      ArrowLeft: (index + SPECIES.length - 1) % SPECIES.length,
      Home: 0,
      End: SPECIES.length - 1,
    };
    if (!(event.key in positions)) return;
    event.preventDefault();
    const next = positions[event.key];
    selectPet(SPECIES[next].id);
    petTabsRef.current
      ?.querySelectorAll(".pet-tab")
      [next]?.focus({ preventScroll: true });
  };
  const preview = (name, event) => {
    const origin = event?.detail
      ? { x: event.clientX, y: event.clientY }
      : null;
    api()?.preview(name, origin);
    playgroundRef.current?.scrollIntoView({
      behavior: scrollBehavior(),
      block: "start",
    });
  };
  const photograph = () => {
    const canvas = canvasRef.current;
    const photo = document.createElement("canvas");
    photo.width = canvas.width;
    photo.height = canvas.height;
    const ctx = photo.getContext("2d");
    ctx.fillStyle = "#3C8C42";
    ctx.fillRect(0, 0, photo.width, photo.height);
    ctx.drawImage(canvas, 0, 0);
    const margin = Math.round(photo.width * 0.035);
    ctx.fillStyle = "#F2F5EE";
    ctx.font = `600 ${Math.max(16, Math.round(photo.width * 0.014))}px monospace`;
    ctx.fillText(`KURO / ${pet.en}`, margin, photo.height - margin);
    photo.toBlob((blob) => {
      if (!blob) {
        setToast("照片還沒準備好，再試一次");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kuro-${species}-${Date.now()}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setToast("PNG 已下載");
    }, "image/png");
  };

  return (
    <div className={`kuro-app ${focus ? "focus-mode" : ""}`}>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="KURO 首頁">
          <Icon name="paw" size={25} />
          <span>
            kuro<span className="wordmark-dot">*</span>
          </span>
        </a>
        <nav aria-label="主要導覽">
          <a href="#playground">Playground</a>
          <a href="#states">State machine</a>
        </nav>
        <button
          className="button button-lime header-focus"
          ref={focusButton}
          onClick={enterFocus}
        >
          <Icon name="expand" size={15} />
          {timer.running ? `專注中 ${timer.time}` : "專注模式"}
          <span className="key-hint">F</span>
        </button>
      </header>
      <main>
        <Hero onSelect={selectPet} />

        <section
          id="playground"
          className="playground-section page-width"
          ref={playgroundRef}
          aria-labelledby="playground-title"
        >
          <div className="section-heading normal-heading">
            <div>
              <p className="eyebrow section-number">01 / INTERACTION</p>
              <h2 id="playground-title">
                PLAYGROUND<span className="heading-dot">↘</span>
              </h2>
            </div>
          </div>
          <div className="focus-topbar">
            <a
              className="wordmark"
              href="#playground"
              onClick={(event) => {
                event.preventDefault();
                leaveFocus();
              }}
            >
              <Icon name="paw" size={23} />
              <span>kuro*</span>
            </a>
            <span className="mono">FOCUS TIMER</span>
            <button
              className="button button-quiet"
              ref={exitButton}
              onClick={leaveFocus}
            >
              <Icon name="close" size={16} />
              離開專注<span className="key-hint">Esc</span>
            </button>
          </div>
          <div className="focus-timer" aria-label="專注計時器">
            <p className="eyebrow">FOCUS TIMER</p>
            <div
              className="timer-time"
              role="timer"
              aria-label={`剩餘 ${timer.time}`}
            >
              {timer.time}
              <span className={`timer-dot ${timer.running ? "running" : ""}`} />
            </div>
            <p className="timer-message" role="status">
              {timer.complete
                ? "計時完成"
                : timer.running
                  ? "計時中"
                  : timer.remaining < timer.minutes * 60
                    ? "已暫停"
                    : "選擇時長"}
            </p>
            <div className="timer-controls">
              <div className="timer-durations" aria-label="專注時長">
                {[25, 50, 5].map((minutes) => (
                  <button
                    key={minutes}
                    aria-pressed={timer.minutes === minutes}
                    onClick={() => timer.reset(minutes)}
                  >
                    {minutes === 5 ? "休息 5" : `${minutes} 分`}
                  </button>
                ))}
              </div>
              <button
                className="button button-lime timer-start"
                onClick={timer.toggle}
              >
                <Icon name={timer.running ? "pause" : "play"} size={15} />
                {timer.running
                  ? "暫停"
                  : timer.remaining < timer.minutes * 60 && timer.remaining > 0
                    ? "繼續專注"
                    : "開始專注"}
              </button>
              <button
                className="icon-button"
                onClick={() => timer.reset()}
                aria-label="重設計時器"
                title="重設計時器"
              >
                <Icon name="reset" size={17} />
              </button>
            </div>
          </div>
          <div className="playground-shell">
            <div className="pet-toolbar">
              {(petScroll.left || petScroll.right) && (
                <button
                  className="pet-scroll-button pet-scroll-left"
                  aria-label="向左顯示角色"
                  disabled={!petScroll.left}
                  onClick={() => scrollPets(-1)}
                >
                  <Icon name="arrow" size={16} />
                </button>
              )}
              <div
                className="pet-tabs"
                data-scroll-left={petScroll.left}
                data-scroll-right={petScroll.right}
                ref={petTabsRef}
                role="group"
                aria-label="選擇小夥伴"
              >
                <span
                  className={`pet-tab-indicator${tabIndicator.ready ? " ready" : ""}${petSwap ? " moving" : ""}`}
                  style={{
                    width: `${tabIndicator.width}px`,
                    left: `${tabIndicator.left}px`,
                  }}
                  aria-hidden="true"
                />
                {SPECIES.map((item) => (
                  <button
                    key={item.id}
                    className={`pet-tab${species === item.id ? " selected" : ""}${species === item.id && petSwap ? " is-arriving" : ""}`}
                    aria-pressed={species === item.id}
                    onClick={() => selectPet(item.id)}
                    onKeyDown={(event) => navigatePets(event, item.id)}
                  >
                    <Sprite
                      species={item.id}
                      size={58}
                      animate={species === item.id}
                    />
                    <span>
                      {item.label}
                      <small>{item.en}</small>
                    </span>
                    <span className="tab-dot" />
                  </button>
                ))}
              </div>
              {(petScroll.left || petScroll.right) && (
                <button
                  className="pet-scroll-button"
                  aria-label="向右顯示角色"
                  disabled={!petScroll.right}
                  onClick={() => scrollPets(1)}
                >
                  <Icon name="arrow" size={16} />
                </button>
              )}
              <details className="scene-settings" ref={settingsRef}>
                <summary aria-label="場景設定" title="場景設定">
                  <Icon name="settings" size={19} />
                  <span>場景設定</span>
                </summary>
                <div className="settings-panel">
                  <label htmlFor="pet-scale">
                    角色大小 <span>{scale.toFixed(1)}×</span>
                  </label>
                  <input
                    id="pet-scale"
                    type="range"
                    min="0.8"
                    max="1.8"
                    step="0.1"
                    value={scale}
                    onChange={(event) => setScale(Number(event.target.value))}
                  />
                  <label className="grid-toggle">
                    顯示格線
                    <button
                      type="button"
                      role="switch"
                      aria-checked={grid}
                      aria-label="顯示格線"
                      onClick={() => setGrid(!grid)}
                    >
                      <span />
                    </button>
                  </label>
                  <button
                    className="reset-pet"
                    onClick={() => {
                      api()?.reset();
                      setToast("位置已重設");
                    }}
                  >
                    <Icon name="reset" size={14} />
                    重設位置
                  </button>
                </div>
              </details>
            </div>
            <div
              className={`pet-stage ${grid ? "with-grid" : ""}${petSwap ? " is-swapping" : ""}${swapDir < 0 ? " swap-left" : ""}${swapDir > 0 ? " swap-right" : ""}`}
              ref={stageRef}
              onPointerMove={(event) => api()?.pointerMove(event)}
              onPointerLeave={() => api()?.pointerLeave()}
              onPointerDown={(event) => api()?.pointerDown(event)}
              onDoubleClick={(event) => api()?.doubleClick(event)}
              aria-label={`${pet.label}互動舞台，移動游標跟隨，點角色摸摸，雙擊跳躍`}
            >
              <canvas
                ref={canvasRef}
                aria-label={`${pet.label}正在${currentClip.label}`}
              />
              <div className="stage-hud">
                <span className="state-indicator">
                  <i />
                  {currentClip.en}
                  <span>{currentClip.label}</span>
                </span>
                <span className="hud-detail">
                  SPEED <b>{hud.speed}</b>
                </span>
                <span className="hud-detail">
                  FACING <b>{hud.face}</b>
                </span>
                <span className="hud-pets">
                  <Icon name="heart" size={14} />
                  <b>{hud.pets.toString().padStart(2, "0")}</b>
                </span>
              </div>
              <span className="stage-coordinate mono">ROOM / {pet.number}</span>
              <span className="stage-caption">
                {hud.preview
                  ? "試播中 · 移動游標結束"
                  : roam
                    ? "自由散步中"
                    : "游標跟隨"}
              </span>
            </div>
            <div className="playground-controls">
              <div className="action-group">
                <button className="action-button" onClick={() => api()?.pet()}>
                  <Icon name="heart" />
                  <span>摸頭</span>
                  <kbd>H</kbd>
                </button>
                <button className="action-button" onClick={() => api()?.jump()}>
                  <Icon name="jump" />
                  <span>跳躍</span>
                  <kbd>J</kbd>
                </button>
                <button
                  className="action-button"
                  onClick={() => api()?.sleep()}
                >
                  <Icon name="moon" />
                  <span>睡眠</span>
                  <kbd>Z</kbd>
                </button>
                <span className="control-divider" />
                <button
                  className={`action-button roam-button ${roam ? "is-on" : ""}`}
                  aria-pressed={roam}
                  onClick={() => setRoam(!roam)}
                >
                  <Icon name="wander" />
                  <span>自由散步</span>
                  <i className="toggle-dot" />
                </button>
              </div>
              <div className="utility-group">
                <button
                  className="action-button photo-button"
                  aria-label="拍張照"
                  onClick={photograph}
                >
                  <Icon name="camera" />
                  <span>拍張照</span>
                </button>
                <button
                  className="action-button focus-action"
                  aria-label="專注模式"
                  onClick={enterFocus}
                >
                  <Icon name="expand" />
                  <span>專注模式</span>
                </button>
              </div>
            </div>
          </div>
          <div className="playground-footnote">
            <span>
              <i className="status-dot" />
              {pet.label} / {pet.en}
            </span>
            <span>
              移動：跟隨 <i>／</i> 點擊：摸頭 <i>／</i> 雙擊：跳躍
            </span>
          </div>
        </section>

        <section
          className="states-section page-width"
          id="states"
          aria-labelledby="states-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow section-number">02 / ANIMATIONS</p>
              <h2 id="states-title">STATE MACHINE</h2>
            </div>
          </div>
          <div className="states-toolbar">
            <div className="state-filters" role="group" aria-label="動畫分類">
              {[
                ["all", "全部", 13],
                ["move", "移動", 6],
                ["rest", "休息", 5],
                ["hello", "互動", 2],
              ].map(([value, label, count]) => (
                <button
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => transitionUI(() => setFilter(value))}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
            <span className="live-label mono">
              <i className="status-dot" />
              LIVE / {pet.en}
            </span>
          </div>
          <div className="state-grid">
            {CLIPS.filter(
              (clip) => filter === "all" || clip.group === filter,
            ).map((clip) => (
              <button
                className={`state-card ${hud.clip === clip.name ? "is-active" : ""}`}
                key={clip.name}
                aria-label={`試播${clip.label}`}
                aria-pressed={hud.clip === clip.name}
                onClick={(event) => preview(clip.name, event)}
              >
                <span className="card-top mono">
                  <span>
                    {String(CLIPS.indexOf(clip) + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {hud.clip === clip.name
                      ? "● PLAYING"
                      : `${FRAMES[species][clip.name]} FRAMES`}
                  </span>
                </span>
                <Sprite
                  species={species}
                  clip={clip.name}
                  size={105}
                  animate={hud.clip === clip.name}
                />
                <span className="card-title">
                  {clip.label}
                  <Icon name="arrow" size={15} />
                </span>
                <span className="card-footer mono">
                  {clip.en}
                  <span>{clip.fps} FPS</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer page-width">
        <a href="#top" className="wordmark">
          <Icon name="paw" size={20} />
          <span>kuro*</span>
        </a>
        <p className="footer-copy">
          © 2026 ReiKama414. All rights reserved.
        </p>
        <nav className="footer-links" aria-label="站外連結">
          <a
            href="https://reikama414.vercel.app/"
            target="_blank"
            rel="noreferrer"
            aria-label="個人網站"
            title="個人網站"
          >
            <Icon name="site" size={18} />
          </a>
          <a
            href="https://github.com/ReiKama414/kuro"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            title="GitHub"
          >
            <Icon name="github" size={18} />
          </a>
        </nav>
      </footer>
      <div className={`toast ${toast ? "visible" : ""}`} role="status">
        <Icon name="check" size={16} />
        {toast}
      </div>
    </div>
  );
}
