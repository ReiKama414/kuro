import FRAMES from "../assets/sprites/counts.json";

export { FRAMES };
export const SPECIES = [
  {
    id: "cat",
    label: "黑貓",
    en: "KURO",
    note: "慢熟，但會一直跟著你",
    number: "01",
  },
  {
    id: "seal",
    label: "海豹",
    en: "SEAL",
    note: "今天也想躺平一下",
    number: "02",
  },
  {
    id: "raccoon",
    label: "浣熊",
    en: "RACCOON",
    note: "對你手上的事很有興趣",
    number: "03",
  },
  {
    id: "dog",
    label: "臘腸犬",
    en: "DACHS",
    note: "小短腿，大大的好奇心",
    number: "04",
  },
  {
    id: "hamster",
    label: "倉鼠",
    en: "HAMSTER",
    note: "陪你把日子過得小小的",
    number: "05",
  },
  {
    id: "panda",
    label: "熊貓",
    en: "PANDA",
    note: "慢慢走，也會走到你身邊",
    number: "06",
  },
  {
    id: "crow",
    label: "黑鴉",
    en: "CROW",
    note: "輕輕跳兩步，就到你身邊",
    number: "07",
  },
  {
    id: "spider",
    label: "蜘蛛",
    en: "SPIDER",
    note: "小小的腳步，也想陪著你",
    number: "08",
  },
  {
    id: "fox",
    label: "狐狸",
    en: "FOX",
    note: "晃晃尾巴，陪你慢慢來",
    number: "09",
  },
  {
    id: "jellyfish",
    label: "水母",
    en: "JELLY",
    note: "輕輕漂著，陪你放慢一點",
    number: "10",
  },
  {
    id: "squid",
    label: "魷魚",
    en: "SQUID",
    note: "揮揮小觸手，今天也在這裡",
    number: "11",
  },
];

export const CLIPS = [
  {
    name: "idle",
    en: "IDLE",
    label: "發個呆",
    fps: 6,
    loop: true,
    rule: "停下腳步",
    group: "rest",
  },
  {
    name: "blink",
    en: "BLINK",
    label: "眨眨眼",
    fps: 9,
    loop: false,
    rule: "等你一下",
    group: "rest",
  },
  {
    name: "walk_right",
    en: "WALK R",
    label: "往右走",
    fps: 12,
    loop: true,
    rule: "游標往右",
    group: "move",
  },
  {
    name: "walk_left",
    en: "WALK L",
    label: "往左走",
    fps: 12,
    loop: true,
    rule: "游標往左",
    group: "move",
  },
  {
    name: "walk_down",
    en: "WALK ↓",
    label: "走近一點",
    fps: 12,
    loop: true,
    rule: "游標往下",
    group: "move",
  },
  {
    name: "walk_up",
    en: "WALK ↑",
    label: "往後走",
    fps: 12,
    loop: true,
    rule: "游標往上",
    group: "move",
  },
  {
    name: "run_right",
    en: "RUN R",
    label: "向右小跑",
    fps: 16,
    loop: true,
    rule: "跟上你的速度",
    group: "move",
  },
  {
    name: "run_left",
    en: "RUN L",
    label: "向左小跑",
    fps: 16,
    loop: true,
    rule: "跟上你的速度",
    group: "move",
  },
  {
    name: "sit",
    en: "SIT",
    label: "坐一下",
    fps: 7,
    loop: false,
    rule: "休息時間",
    group: "rest",
  },
  {
    name: "lay",
    en: "LAY",
    label: "趴著也好",
    fps: 6,
    loop: false,
    rule: "放鬆一下",
    group: "rest",
  },
  {
    name: "sleep",
    en: "SLEEP",
    label: "做個小夢",
    fps: 4,
    loop: true,
    rule: "等著等著就睡了",
    group: "rest",
  },
  {
    name: "jump",
    en: "JUMP",
    label: "跳一下",
    fps: 14,
    loop: false,
    rule: "雙擊舞台 · J",
    group: "hello",
  },
  {
    name: "hit",
    en: "PET",
    label: "摸摸頭",
    fps: 10,
    loop: false,
    rule: "點一下角色 · H",
    group: "hello",
  },
];

export const clipInfo = (species, name) => ({
  ...CLIPS.find((clip) => clip.name === name),
  frames: FRAMES[species][name],
});
export const spriteUrl = (species, clip = "idle") =>
  `/assets/sprites/${species}/${clip}.png`;

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
