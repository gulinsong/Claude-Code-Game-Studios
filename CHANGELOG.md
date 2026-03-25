# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- LocalizationSystem for multi-language support (zh-CN, en)
- ObjectPool system for memory optimization and reduced GC pressure
- AccessibilitySystem with text scaling, color blind modes, and high contrast support

### Fixed
- Timer memory leak in MiniGameMooncake baking stage
- Input validation in TimeSystem.update() for invalid deltaMs
- Error handling in GatheringSystem with graceful degradation

---

## [0.1.0-mvp] - 2026-03-25

### Systems Implemented (16/16 MVP)

#### Core Systems
- **EventSystem** - Event-driven architecture with pub-sub pattern
- **ConfigSystem** - Configuration loading and management
- **TimeSystem** - Season/day cycle with festival scheduling

#### Data Systems
- **MaterialSystem** - Material definitions and types
- **BackpackSystem** - Slot-based inventory management
- **RecipeSystem** - Crafting recipes with unlock tracking

#### Resource Systems
- **StaminaSystem** - Stamina management with lazy recovery calculation

#### Gameplay Systems
- **GatheringSystem** - Resource collection with weighted drops
- **CraftingSystem** - Crafting with mini-game integration
- **DialogueSystem** - Node-based dialogue with conditions and effects
- **QuestSystem** - Quest state machine with objective tracking
- **VillagerSystem** - Relationship and affinity management
- **FestivalSystem** - Festival preparation and celebration

#### Platform Systems
- **WeChatLoginSystem** - WeChat authorization and token management
- **CloudSaveSystem** - Cloud save with conflict resolution

#### UI Systems
- **UIFramework** - Layer management with object pooling

### Documentation
- 16 Architecture Decision Records (ADRs) covering all MVP systems
- 18 Game Design Documents (GDDs)
- Systems index with dependency mapping

### Testing
- 626 unit tests passing
- 100% MVP system test coverage

---

## Sprint History

| Sprint | Focus | Status |
|--------|-------|--------|
| 001-010 | MVP Systems Implementation | ✅ Complete |
| 011 | Polish Phase (Performance, Playtest, ADRs) | 75% Complete |

---

## Roadmap

### Alpha (Planned)
- Resource Loading System
- Scene Management System
- Exploration System
- Collection System
- Decoration System
- Costume System
- Social System
- IAP System
- Rewarded Video System
- Audio System
- Notification System

### Beta (Planned)
- Village Development System
- Diary System
- Daily Reward System

---

## Version Naming Convention

- `0.x.x-mvp` - MVP phase releases
- `0.x.x-alpha` - Alpha phase releases
- `0.x.x-beta` - Beta phase releases
- `1.x.x` - Production releases
