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

- **Phase**: Part 2 — Skill Infrastructure
- **Status**: Completed
- **Updated at**: 2026-05-02

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

