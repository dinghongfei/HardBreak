---
name: git-commit-message
description: >-
  Bilingual git commit message (English then Chinese) with Added/Adjusted/Removed
  bullets. Use when creating a git commit, writing a commit message, or the user
  asks to commit / 提交.
---

# Git Commit Message Format

**This repo’s commit messages follow this rule** (overrides shorter default commit styles).

Only commit when the user explicitly asks.

## Structure

1. **Summary** (1–2 sentences): why this commit exists, grounded in the file diff.
2. **Feature list**: only categories that apply — omit empty ones. Each bullet: what + background/reason.

## Template

```
<English summary grounded in the file changes.>

- Added: <what> — <background/why>
- Adjusted: <what> — <reason>
- Removed: <what> — <reason>

<基于本次文件变动的中文总结。>

- 新增：<内容> — <背景/原因>
- 调整：<内容> — <原因>
- 删除：<内容> — <原因>
```

## Example

```
Unify auth middleware error responses so API clients get consistent JSON errors.

- Adjusted: auth middleware — map unauthorized/forbidden to a shared error shape for frontend handling
- Removed: ad-hoc string error bodies in login routes — duplicated and inconsistent with other endpoints

统一鉴权中间件错误响应，让 API 客户端拿到一致的 JSON 错误。

- 调整：鉴权中间件 — 将未授权/禁止访问映射为统一错误结构，便于前端处理
- 删除：登录路由中的临时字符串错误体 — 与其他接口不一致且重复
```

## How to classify Added / Adjusted / Removed

Categories describe the **net diff of this commit vs the previous commit (HEAD)** — i.e. what lands in the repository after the commit — **not** the path taken during the chat or intermediate WIP.

| Category | Meaning (vs HEAD / last committed tree) |
|----------|-----------------------------------------|
| **Added** / 新增 | Path or capability **absent in HEAD**, present in the staged tree |
| **Adjusted** / 调整 | Path or behavior **exists in both**; this commit changes it |
| **Removed** / 删除 | Path or capability **present in HEAD**, absent (or deliberately dropped) in the staged tree |

```text
❌ BAD: “Removed: feature X” because we added X mid-chat then deleted it before commit
   → X never existed in HEAD and is not in the commit → omit entirely

❌ BAD: “Added: then Adjusted: then Removed:” for the same item based on conversation turns

✅ GOOD: Classify only from `git diff HEAD` / staged changes (what this commit introduces)
```

If something was introduced and later removed **within the same uncommitted work**, it is neither Added nor Removed in the message — it is simply not part of the commit.

## Rules

- Base the summary and bullets on the **staged (or to-be-staged) diff against history**, not intent or chat narrative alone
- Keep bullets short; reason stays on the same line
- Prefer bilingual; English block above Chinese
- Omit Added / Adjusted / Removed (and 新增/调整/删除) when that category has nothing in the net diff
