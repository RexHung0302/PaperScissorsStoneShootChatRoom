# Paper Scissors Stone Shoot

![Demo](./demo.gif)

這是一款聊天室，裡面帶有可以拿來互相輸贏的小遊戲，目前只有一款實裝就是多人猜拳。

### 多人猜拳

- 擁有多人對戰功能，每一局會依序淘汰輸掉的人，最終只會有一個玩家獲勝。
- 如果只有一個人出拳，那個人最終會直接獲勝。
- 如果選擇投降輸一半會輸掉這場比賽。

---

## 運作環境
* Chrome v49+ or Firefox v45+ or Safari v9+
* 一台筆電 或 桌電(不建議使用手機)
* 一顆炙熱的寫 Code ❤️
* 至少有充足的睡眠(8/hr+)
* 至少保證自己吃過早點 或 晚餐(3餐+)
* 沒有喝酒的情況下

## 建議環境
* NPM v8+
* node v18 (Vite 需要至少 18+ 或 20+)
* nvm v0.39.0
* pnpm v9 版本 (不同版本會致使 pnpm-lock.yaml lockfileVersion 改變，需使用 9 版本)
* 建議使用 Pnpm 執行專案

---

### TODO List

- 目前沒有補上 ESLint 等等的檢查，這邊會有一個待辦清單，其中包含一些預期中的功能

- [ ] ESLint
- [ ] Prettire Style
- [ ] Husky - 目前沒有考慮到多人協作，暫時應該不會裝這個，但 Commit 就會比較隨意
- [ ] 可以中途解散比賽
- [ ] 可以多場遊戲同時舉辦(目前串接 Firebase，這個情況來說多場會有點混亂)
- [ ] 可以有統一 Broadcast 的地方
- [ ] 能紀錄對戰歷史紀錄
- [ ] 加好友功能

---

## 環境安裝說明

遊戲多久過期、多久開始一場遊戲 及 可以思考多久才選擇出拳 都可以在 env 裡面修改時間差，建議不要距離太近，會早成奇怪錯誤。

1. pnpm install

2. cp(複製) .env.example .env - 一些設定請自行上 Firebase 設定

3. pnpm dev / pnpm build

4. 打開 Browser