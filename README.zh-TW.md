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
- **十一種角色** — 黑貓 KURO、海豹、浣熊、臘腸犬、倉鼠、熊貓、黑鴉、蜘蛛、狐狸、水母、魷魚
- **Playground HUD** — 即時顯示狀態、速度、朝向與被摸次數
- **狀態機看板** — 預覽條會高亮目前正在播的 clip
- **互動圖鑑** — 動畫分類、點選卡片試播、摸摸與跳躍快捷鍵
- **專注模式** — 25／50 分鐘專注與 5 分鐘休息，支援暫停、繼續與重設
- **小小日常** — 自由散步、角色大小、格線開關、PNG 拍照下載，記住上次選的角色

## 技術棧

| 範圍 | 選用 |
| --- | --- |
| 應用 | React · Vite |
| 繪製 | Canvas 2D sprite strip |
| 字型／介面 | Archivo · JetBrains Mono · Noto Sans TC（Google Fonts） |

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

臘腸犬與倉鼠可用 `python tools/slice-pets.py` 重新切圖（需 Pillow、numpy、scipy），再執行 `python tools/preview-pets.py` 產生逐格檢查圖。切圖保留原始 alpha，影格數由 `assets/sprites/counts.json` 統一提供。臘腸犬原圖互相遮住的水平移動格改以完整姿勢重組，左向採鏡射，保留原本的播放週期。

熊貓原圖在 `uploads/sheet-panda.png`，由內建 imagegen 生成，完整提示詞保存在 `uploads/panda-prompt.txt`，可用 `python tools/slice-panda.py` 重建全部 13 組動作

黑鴉、蜘蛛與狐狸同樣使用內建 imagegen 製作，原圖與提示詞存放在 `uploads/sheet-{crow,spider,fox}.png` 與 `uploads/{crow,spider,fox}-prompt.txt`，執行 `python tools/sprite_atlas.py crow spider fox` 可重建這三隻角色的全部動作

水母與魷魚沿用相同切圖流程，移動時擺動觸手，休息時收攏身體，原圖與完整提示詞保存在 `uploads/sheet-{jellyfish,squid}.png` 與 `uploads/{jellyfish,squid}-prompt.txt`，執行 `python tools/sprite_atlas.py jellyfish squid` 可重建全部動作

角色列支援橫向滑動，選中角色會自動移入可見範圍，也可用左右方向鍵切換、Home／End 選擇第一隻或最後一隻

執行 `npm test` 檢查動畫播放、單次動作結束、刷新率與跳躍朝向，執行 `npm run check:sprites` 檢查全部角色的影格數、透明度、邊界與殘片

舊素材重切後可執行 `python tools/repair-sprites.py`，從原始 RGB 與 alpha 恢復黑貓眼睛並對齊海豹落腳點（另需 opencv-python），黑貓尾巴與身體之間原有的鏤空會保留

## 操作

| 動作 | 結果 |
| --- | --- |
| 在舞台內移動指標 | 角色跟隨 |
| 點角色附近 | 被摸反應 |
| 雙擊 | 跳躍 |
| 指標離開舞台 | 自然停下，角色留在邊界內 |
| 物種按鈕 | 切換角色與對應影格組 |
| 動畫卡片 | 試播指定動作，移動游標恢復跟隨 |
| H／J／Z | 摸摸／跳躍／睡覺 |
| F／Esc | 進入／離開專注模式 |
| 自由散步 | 沒有游標時自行散步與休息 |
| 拍張照 | 下載含角色名稱的 PNG |

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `src/Kuro.jsx` | 頁面、互動控制與專注模式 UI |
| `src/usePetEngine.js` | Canvas 動畫、跟隨與互動狀態 |
| `src/useFocusTimer.js` | 以實際經過時間計算的專注計時器 |
| `src/pets.js` | 角色與動畫設定 |
| `src/main.jsx` | React 進入點 |
| `src/index.css` | 基礎樣式與導覽／CTA |
| `assets/sprites/{species}/` | 各 clip 的 PNG strip（`idle`、`walk_right`…） |
| `assets/sprites/counts.json` | 各物種影格數 |
| `uploads/` | 工作用參考表（執行期不需要） |

## 第三方說明

| 項目 | 說明 |
| --- | --- |
| React · React DOM · Vite | 僅套件本身適用上游授權 |
| Archivo · JetBrains Mono · Noto Sans TC | 依字型發行方授權 |

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
