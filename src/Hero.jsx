import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { CLIPS, SPECIES, spriteUrl } from "./pets";
import Icon from "./Icon";
import "./hero.css";

// Positions leave the central wordmark and its link clear at both breakpoints
const PLACEMENTS = [
  [13, 16, 126, 12, 14, 76],
  [69, 12, 114, 50, 9, 74],
  [91, 31, 136, 88, 19, 80],
  [11, 49, 116, 9, 30, 70],
  [28, 77, 110, 91, 28, 68],
  [78, 66, 130, 14, 67, 80],
  [37, 8, 108, 17, 88, 66],
  [9, 83, 112, 51, 82, 70],
  [51, 88, 122, 81, 88, 78],
  [92, 85, 128, 87, 64, 80],
  [92, 8, 108, 76, 7, 68],
];

export default function Hero({ onSelect }) {
  const heroRef = useRef(null);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const query = gsap.utils.selector(hero);
        const pets = query(".hero-character");
        const floats = query(".hero-float");
        const driftLayers = query(".hero-drift");
        const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
        entrance
          .from(
            query(".hero-letter"),
            { yPercent: 100, opacity: 0, duration: 0.9, stagger: 0.055 },
            0.05,
          )
          .from(
            query(".hero-kicker, .hero-link"),
            { opacity: 0, y: 8, duration: 0.65, stagger: 0.1 },
            0.4,
          )
          .from(
            pets,
            {
              opacity: 0,
              scale: 0.85,
              y: 22,
              duration: 1.1,
              stagger: { amount: 0.45, from: "edges" },
            },
            0.2,
          )
          .from(query(".hero-background"), { opacity: 0, duration: 1.6 }, 0.3);

        const floating = floats.map((element, index) =>
          gsap.to(element, {
            y: index % 2 ? -6 : 6,
            duration: 3.2 + (index % 4) * 0.45,
            delay: 1 + index * 0.08,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          }),
        );
        const ambient = [
          gsap.to(query(".hero-orbits"), {
            rotation: 7,
            svgOrigin: "600 390",
            duration: 24,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          }),
          gsap.to(query(".hero-current"), {
            strokeDashoffset: -140,
            duration: 28,
            ease: "none",
            repeat: -1,
          }),
          gsap.to(query(".hero-diamond"), {
            rotation: 135,
            duration: 24,
            repeat: -1,
            ease: "none",
          }),
          gsap.to(query(".hero-ring"), {
            scale: 1.2,
            duration: 5,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          }),
        ];
        const drift = driftLayers.map((element, index) => ({
          x: gsap.quickTo(element, "x", { duration: 1.2, ease: "power3.out" }),
          y: gsap.quickTo(element, "y", { duration: 1.2, ease: "power3.out" }),
          depth: 7 + (index % 4) * 3,
        }));
        const move = (event) => {
          if (event.pointerType !== "mouse") return;
          const rect = hero.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          drift.forEach((item) => {
            item.x(x * item.depth);
            item.y(y * item.depth);
          });
        };
        const reset = () =>
          drift.forEach((item) => {
            item.x(0);
            item.y(0);
          });
        const visibility = new IntersectionObserver(([entry]) => {
          [...floating, ...ambient].forEach((tween) =>
            entry.isIntersecting ? tween.play() : tween.pause(),
          );
        });
        hero.addEventListener("pointermove", move);
        hero.addEventListener("pointerleave", reset);
        visibility.observe(hero);
        return () => {
          hero.removeEventListener("pointermove", move);
          hero.removeEventListener("pointerleave", reset);
          visibility.disconnect();
        };
      },
      hero,
    );
    return () => media.revert();
  }, []);

  return (
    <section
      className="hero"
      id="top"
      ref={heroRef}
      aria-labelledby="hero-title"
    >
      <div className="hero-background" aria-hidden="true">
        <svg viewBox="0 0 1200 800" preserveAspectRatio="none">
          <g className="hero-orbits">
            <ellipse
              cx="600"
              cy="390"
              rx="420"
              ry="228"
              transform="rotate(-17 600 390)"
            />
            <path d="M126 510C240 722 936 710 1091 330" />
            <circle className="hero-orbit-node" cx="1002" cy="267" r="3" />
          </g>
          <path
            className="hero-current"
            d="M-40 240C180 85 349 177 506 115S870 37 1240 222"
          />
          <path
            className="hero-current"
            d="M-40 652C240 547 380 747 654 701S1020 567 1240 631"
          />
        </svg>
        <span className="hero-geometry hero-diamond" />
        <span className="hero-geometry hero-ring" />
        <span className="hero-geometry hero-cross" />
      </div>
      <div className="hero-inner page-width">
        <div className="hero-copy">
          <p className="hero-kicker mono">CURSOR PET PLAYGROUND</p>
          <h1 id="hero-title" aria-label="KURO">
            {Array.from("kuro*").map((letter, index) => (
              <span
                className={`hero-letter ${letter === "*" ? "hero-asterisk" : ""}`}
                key={index}
                aria-hidden="true"
              >
                {letter}
              </span>
            ))}
          </h1>
          <a className="hero-link mono" href="#playground">
            PLAYGROUND <Icon name="arrow" size={17} />
          </a>
        </div>
        <div className="hero-cast" role="group" aria-label="選擇角色">
          {SPECIES.map((pet, index) => {
            const [x, y, size, mx, my, ms] = PLACEMENTS[index];
            return (
              <button
                className="hero-character"
                key={pet.id}
                onClick={() => onSelect(pet.id, true)}
                aria-label={`使用${pet.label}`}
                style={{
                  "--x": `${x}%`,
                  "--y": `${y}%`,
                  "--size": `${size}px`,
                  "--mx": `${mx}%`,
                  "--my": `${my}%`,
                  "--ms": `${ms}px`,
                }}
              >
                <span className="hero-drift">
                  <span className="hero-float">
                    <span
                      className="hero-sprite"
                      style={{ backgroundImage: `url('${spriteUrl(pet.id)}')` }}
                    />
                  </span>
                </span>
                <span className="hero-character-name">{pet.label}</span>
              </button>
            );
          })}
        </div>
        <div className="hero-index mono">
          <span>{String(SPECIES.length).padStart(2, "0")} CHARACTERS</span>
          <span>{CLIPS.length} STATES</span>
        </div>
      </div>
    </section>
  );
}
