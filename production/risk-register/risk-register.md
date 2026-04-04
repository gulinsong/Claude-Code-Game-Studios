# Risk Register -- 反弹达人 MVP

> **Created**: 2026-04-04
> **Last Reviewed**: 2026-04-04
> **Next Review**: Weekly (every sprint boundary)

---

## Active Risks

| # | Risk | Probability | Impact | Severity | Owner | Mitigation | Status |
|---|------|------------|--------|----------|-------|------------|--------|
| R1 | Core bounce mechanic does not feel satisfying | Medium | Critical | **High** | creative-director | Sprint 1 prototype validates early; if unfun, pivot before investing more | Open |
| R2 | Scope creep beyond 14 MVP systems | High | High | **High** | producer | Strict MVP definition; any addition requires matching cut; weekly scope checks | Open |
| R3 | WeChat Mini-Game platform limitations (size, performance, API) | Medium | Medium | **Medium** | technical-director | Build on WeChat dev tools by Sprint 5; test physics on real device in Sprint 1 | Open |
| R4 | 5 remaining GDDs not ready when Sprint 3 starts | Medium | High | **High** | game-designer | Parallel design track in Sprint 2; hard deadline end of Sprint 2 | Open |
| R5 | Physics performance on low-end WeChat devices | Low | Medium | **Low** | technical-director | Profile early; keep particle count low; budget 50MB memory | Open |
| R6 | Level design quality inconsistent (too easy or too hard) | Medium | Medium | **Medium** | game-designer | Playtest in Sprint 5; star rating tuning knobs in GDD; 2 levels per difficulty tier | Open |
| R7 | Cocos Creator 3.8.8 API gaps (model trained on ~3.7) | Low | Medium | **Low** | programmer | Cross-reference VERSION.md; use WebSearch for 3.8-specific APIs | Open |
| R8 | Integration bugs when wiring 14 systems together | Medium | Medium | **Medium** | programmer | Incremental integration in Sprint 2; end-to-end daily testing from Sprint 3 | Open |

## Retired Risks

*(None yet -- will move risks here as they are resolved)*

---

## Risk Review Schedule

| Review Date | Sprint | Focus |
|-------------|--------|-------|
| 2026-04-07 | Sprint 1 end | R1: Prototype validation (go/no-go) |
| 2026-04-14 | Sprint 2 end | R4: GDD completion check |
| 2026-04-22 | Sprint 3 end | R8: Integration health check |
| 2026-04-28 | Sprint 4 end | R3: WeChat build readiness |
| 2026-05-02 | Sprint 5 end | All: Final risk assessment before release |

---

*Updated as part of sprint retrospective and weekly reviews.*
