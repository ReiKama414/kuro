# KURO

[English](./README.md) · **繁體中文**

> **游標寵物 playground** — 一隻小黑貓（與夥伴）跟著指標移動，狀態由手繪 sprite 驅動

<p align="center">
  <img src="./docs/cover.png" alt="KURO 游標寵物 playground 封面" width="560" />
</p>

<p align="center">
  <a href="https://github.com/ReiKama414/kuro">Star</a>
  ·
  <a href="https://reikama414.vercel.app/">個人網站</a>
  ·
  <a href="#快速開始">快速開始</a>
  ·
  <a href="#license--權限">授權</a>
</p>

---

## 為什麼做

互動小 demo：角色跟隨游標，含平滑移動、朝向、閒置休息、眨眼、被摸與跳躍 — 全靠 sprite 影格，不是單張靜圖被 CSS 推來推去

## 亮點

- **跟隨指標** — 指數平滑搭配 delta time，不同刷新率速度一致
- **十三組動畫** — idle、blink、walk ×4、run ×2、sit、lay、sleep、jump、pet
- **五種角色** — 黑貓 KURO、海豹、浣熊、臘腸犬、倉鼠
- **Playground HUD** — 即時顯示狀態、速度、朝向與被摸次數
- **狀態機看板** — 預覽條會高亮目前正在播的 clip

## 技術棧

| 範圍 | 選用 |
| --- | --- |
| 應用 | React · Vite |
| 繪製 | Canvas 2D sprite strip |
| 字型／介面 | Archivo · JetBrains Mono（Google Fonts） |

## 快速開始

建議 Node.js 20+

```bash
npm install
npm run dev
```

開啟 Vite 印出的本機網址

正式建置：

```bash
npm run build
npm run preview
```

輸出在 `dist/`。執行期 sprite 路徑為 `/assets/sprites/…`

## 操作

| 動作 | 結果 |
| --- | --- |
| 在舞台內移動指標 | 角色跟隨 |
| 點角色附近 | 被摸反應 |
| 雙擊 | 跳躍 |
| 指標離開舞台 | 自然停下，角色留在邊界內 |
| 物種按鈕 | 切換角色與對應影格組 |

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `src/Kuro.jsx` | 頁面 UI、playground 迴圈、狀態機 |
| `src/main.jsx` | React 進入點 |
| `src/index.css` | 基礎樣式與導覽／CTA |
| `assets/sprites/{species}/` | 各 clip 的 PNG strip（`idle`、`walk_right`…） |
| `assets/sprites/counts.json` | 各物種影格數 |
| `uploads/` | 工作用參考表（執行期不需要） |

## 第三方說明

| 項目 | 說明 |
| --- | --- |
| React · React DOM · Vite | 僅套件本身適用上游授權 |
| Archivo · JetBrains Mono | 依字型發行方授權 |

本倉庫的程式、KURO 品牌、文案與 sprite／表單素材，仍適用下方專案授權 — 套件授權**不會**一併授權這些素材

## 連結

| | |
| --- | --- |
| 倉庫 | [kuro](https://github.com/ReiKama414/kuro) |
| 作者 | [ReiKama414](https://github.com/ReiKama414) |
| 作品集 | [個人網站](https://reikama414.vercel.app/) |
| 授權全文 | [LICENSE](./LICENSE) |

## License / 權限

Copyright (c) ReiKama414. All rights reserved.

本專案僅供個人瀏覽與學習。未經著作權人書面同意，
不得使用、複製、修改、散布或併入其他專案（含非商業用途）

- [GitHub](https://github.com/ReiKama414/kuro)
- [個人網站](https://reikama414.vercel.app/)
- [授權全文](./LICENSE)

---

<sub>KURO · 游標寵物 demo · ReiKama414 · 2026</sub>
