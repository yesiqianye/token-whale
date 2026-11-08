# token-whale
Token 幸存者 / 小鲸鱼的深海突围

## 在线游玩

- [Token 幸存者 · 小鲸鱼的深海突围](https://yesiqianye.github.io/token-whale/)
- [回声邮局 II · 指令与包裹](https://yesiqianye.github.io/token-whale/echo-post/)
- [回声打捞 · Echo Salvage](https://yesiqianye.github.io/token-whale/echo-salvage/)

## 回声打捞

一款围绕“声音”与“贪心”设计的深海探索小游戏。声呐能揭示宝藏，也会让盲目的猎手游向发声处。携带高价值的「潮汐之心」会周期性暴露位置：带着它回港，还是继续冒险？

- WASD / 方向键移动，Space 声呐，E 诱饵，Shift 冲刺，P / Esc 暂停。
- 手机支持触控摇杆、声呐、诱饵与冲刺按钮。
- 靠近遗物自动打捞；携带战利品回到母港中心，停留 1.5 秒安全结算。
- 氧气耗尽或船体损毁时，只保留当次回收值的 20%。
- 每次安全返航选择一项升级；达到目标解锁下一海域，完成五个海域后进入无尽挑战。
- 随机分布的遗物、巡游猎手、三种改装、音效、最高纪录本地保存。

纯静态 HTML / CSS / JavaScript，无构建依赖、无后端、无外部字体或运行时请求。美术为生成的独立背景与透明精灵图；HUD、声呐、交互和游戏逻辑实时渲染。

本地运行：在仓库目录执行 `python -m http.server 8765`，打开 `http://localhost:8765/echo-salvage/`。也可直接用浏览器打开 `echo-salvage/index.html`。
