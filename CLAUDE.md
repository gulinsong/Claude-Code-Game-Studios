# Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 48 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: Cocos Creator 3.8.8
- **Language**: TypeScript (primary), JavaScript (legacy)
- **Version Control**: Git with trunk-based development
- **Build System**: Cocos Creator Build Pipeline
- **Asset Pipeline**: Cocos Creator Asset Database + 远程资源加载 (CDN)
- **Target Platform**: 微信小程序（首发）→ iOS App（后续）

> **Note**: 此项目使用 Cocos Creator 开发微信小游戏。
> 参考 docs/engine-reference/cocos-creator/ 获取版本相关 API 信息。

## Project Structure

@.claude/docs/directory-structure.md

## Engine Version Reference

@docs/engine-reference/cocos-creator/VERSION.md

## Technical Preferences

@.claude/docs/technical-preferences.md

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session?** If the project has no engine configured and no game concept,
> run `/start` to begin the guided onboarding flow.

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

@.claude/docs/context-management.md
