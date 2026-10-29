import FRAMES from "../assets/sprites/counts.json";

export { FRAMES };
export const SPECIES = [
  {
    id: "cat",
    label: "黑貓",
    en: "KURO",
    number: "01",
  },
  {
    id: "seal",
    label: "海豹",
    en: "SEAL",
    number: "02",
  },
  {
    id: "raccoon",
    label: "浣熊",
    en: "RACCOON",
    number: "03",
  },
  {
    id: "dog",
    label: "臘腸犬",
    en: "DACHS",
    number: "04",
  },
  {
    id: "hamster",
    label: "倉鼠",
    en: "HAMSTER",
    number: "05",
  },
  {
    id: "panda",
    label: "熊貓",
    en: "PANDA",
    number: "06",
  },
  {
    id: "crow",
    label: "黑鴉",
    en: "CROW",
    number: "07",
  },
  {
    id: "spider",
    label: "蜘蛛",
    en: "SPIDER",
    number: "08",
  },
  {
    id: "fox",
    label: "狐狸",
    en: "FOX",
    number: "09",
  },
  {
    id: "jellyfish",
    label: "水母",
    en: "JELLY",
    number: "10",
  },
  {
    id: "squid",
    label: "魷魚",
    en: "SQUID",
    number: "11",
  },
];

export const CLIPS = [
  {
    name: "idle",
    en: "IDLE",
    label: "待機",
    fps: 6,
    loop: true,
    group: "rest",
  },
  {
    name: "blink",
    en: "BLINK",
    label: "眨眼",
    fps: 9,
    loop: false,
    group: "rest",
  },
  {
    name: "walk_right",
    en: "WALK R",
    label: "向右行走",
    fps: 12,
    loop: true,
    group: "move",
  },
  {
    name: "walk_left",
    en: "WALK L",
    label: "向左行走",
    fps: 12,
    loop: true,
    group: "move",
  },
  {
    name: "walk_down",
    en: "WALK ↓",
    label: "向下行走",
    fps: 12,
    loop: true,
    group: "move",
  },
  {
    name: "walk_up",
    en: "WALK ↑",
    label: "向上行走",
    fps: 12,
    loop: true,
    group: "move",
  },
  {
    name: "run_right",
    en: "RUN R",
    label: "向右跑步",
    fps: 16,
    loop: true,
    group: "move",
  },
  {
    name: "run_left",
    en: "RUN L",
    label: "向左跑步",
    fps: 16,
    loop: true,
    group: "move",
  },
  {
    name: "sit",
    en: "SIT",
    label: "坐下",
    fps: 7,
    loop: false,
    group: "rest",
  },
  {
    name: "lay",
    en: "LAY",
    label: "趴下",
    fps: 6,
    loop: false,
    group: "rest",
  },
  {
    name: "sleep",
    en: "SLEEP",
    label: "睡眠",
    fps: 4,
    loop: true,
    group: "rest",
  },
  {
    name: "jump",
    en: "JUMP",
    label: "跳躍",
    fps: 14,
    loop: false,
    group: "hello",
  },
  {
    name: "hit",
    en: "PET",
    label: "摸頭",
    fps: 10,
    loop: false,
    group: "hello",
  },
];

export const clipInfo = (species, name) => ({
  ...CLIPS.find((clip) => clip.name === name),
  frames: FRAMES[species][name],
});
const assetBase = import.meta.env.BASE_URL || "./";
export const spriteUrl = (species, clip = "idle") =>
  `${assetBase}assets/sprites/${species}/${clip}.png`;

export function readSettings() {
  try {
    const value = JSON.parse(localStorage.getItem("kuro-room") || "{}");
    return {
      species: SPECIES.some((pet) => pet.id === value.species)
        ? value.species
        : "cat",
      scale: Number.isFinite(value.scale)
        ? Math.max(0.8, Math.min(1.8, value.scale))
        : 1.4,
      grid: value.grid === true,
    };
  } catch {
    return { species: "cat", scale: 1.4, grid: false };
  }
}
