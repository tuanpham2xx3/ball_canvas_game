---
title: Project progress log
project: Balls Arena
---

## Purpose

File này dùng để **note lại những thứ đã hoàn thành** theo từng phần trong `docs/implementation_plan.md`.

**Quy ước cập nhật (bắt buộc):**
- Mỗi khi hoàn thành một task/feature/bugfix đáng kể, **append** 1 entry vào **Progress entries** bên dưới.
- Entry phải nêu rõ: **Part/Task**, **tóm tắt thay đổi**, **file chính**, và (nếu có) **commit hash**.

## Current phase

- **Phase**: Part 7 — Polish
- **Status**: Completed
- **Updated at**: 2026-05-03

## Progress entries

### 2026-05-02 — Part 1: Core Engine

- **Done**: Arena chạy được với PixiJS + game loop; 2 balls va chạm gây damage; HUD HP; damage floating text; win/lose overlay.
- **Aligned to plan**:
  - Collision damage formula: \(raw = atk \times impactSpeed\), \(final = max(1, raw - def)\)
  - State flow: Idle → Starting (countdown) → Playing; có nút Start
- **Key files**:
  - `src/engine/Game.js`
  - `src/engine/Physics.js`
  - `src/entities/Ball.js`
  - `src/ui/HUD.js`
  - `src/ui/DamageText.js`
  - `src/main.js`
  - `index.html`
  - `style.css`

### 2026-05-02 — Part 2: Skill Infrastructure (scaffolding)

- **Done**: Tạo khung skill data-driven: base class, registry, AI runner; 6 skill type stubs; effect base stubs; JSON template.
- **Notes**:
  - Chưa có skill cụ thể hoạt động (Part 4 mới implement).
  - Gameplay Part 1 không đổi: skill runner tick nhưng không cast gì nếu không có skills.
- **Key files**:
  - `src/skills/SkillBase.js`
  - `src/skills/SkillRegistry.js`
  - `src/skills/SkillRunner.js`
  - `src/skills/types/*`
  - `src/skills/effects/*`
  - `src/skills/definitions/_template.json`
  - `src/entities/Ball.js`

### 2026-05-02 — Part 3: Builder Page

- **Done**: Thêm trang Builder để tạo/edit ball (name, colors, stats), templates, save/load localStorage, export/import JSON.
- **Arena integration**: Trang Arena có match picker (Ball A/B) để load 2 balls đã lưu vào trận.
- **Key files**:
  - `builder.html`
  - `src/builder-main.js`
  - `src/ui/Builder.js`
  - `src/main.js`
  - `index.html`
  - `vite.config.js`
  - `style.css`

### 2026-05-02 — Part 4: Implement Skills

- **Done**:
  - Implement skill runtime: projectiles, mines, AoE, buffs, passives.
  - Status effects: burn/slow/stun (tick + stacking).
  - Skill definitions JSON + registry loading.
- **Demo (fallback presets)**: nếu chưa chọn balls từ Builder, Arena sẽ gán skills mẫu để thấy skill chạy ngay.
- **Key files**:
  - `src/entities/Projectile.js`
  - `src/entities/Mine.js`
  - `src/entities/Ball.js`
  - `src/engine/Game.js`
  - `src/engine/Physics.js`
  - `src/skills/types/*`
  - `src/skills/definitions/*`
  - `src/main.js`

### 2026-05-03 — Part 5: Visual Effects

- **Done**:
  - Projectile trail, explosion ring animation, aura pulse.
  - Status indicators (burn/slow/stun dots above ball).
  - Screen shake on big collisions/skill hits.
- **Key files**:
  - `src/vfx/VFXManager.js`
  - `src/engine/Game.js`

### 2026-05-03 — Part 6: Skin System

- **Done**:
  - Skin schema mở rộng: gradient, pattern, trail config (backward compatible).
  - Ball render support gradient/pattern.
  - Builder có skin picker (gradient/pattern/trail) và persist qua localStorage + export/import.
  - Ball trail VFX theo `skin.trail`.
- **Key files**:
  - `src/entities/Ball.js`
  - `src/ui/Builder.js`
  - `src/vfx/VFXManager.js`
  - `src/engine/Game.js`
  - `style.css`

### 2026-05-03 — Part 7: Polish

- **Done**:
  - Spectator controls: pause/resume + speed control.
  - Tournament mode: best-of-3 scoreboard.
  - Match history: lưu + hiển thị kết quả gần đây (localStorage).
  - Sound effects: collision/skill/victory + toggle.
  - Responsive polish cho các panel mới.
- **Key files**:
  - `index.html`
  - `style.css`
  - `src/main.js`
  - `src/engine/Game.js`
  - `src/audio/SoundManager.js`

