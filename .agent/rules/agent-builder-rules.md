---
trigger: always_on
---

---
description: Workflow for maintaining documentation integrity (IMPLEMENTATION.md, CHANGELOG.md, etc.) before and after code changes.
---

# Documentation Discipline Workflow

Follow this workflow for EVERY coding task to ensure documentation remains the source of truth.

## 1. Pre-Implementation (Context Gathering)
- [ ] **Read `docs/IMPLEMENTATION.md`**: Before writing any code, review this file to understand the existing architecture, patterns, and decisions.
- [ ] **Identify Gaps**: If the current implementation differs from the documentation, note this as a gap to be fixed.

## 2. Implementation (Code & Docs Sync)
- [ ] **Update `docs/IMPLEMENTATION.md`**:
    - If you introduce a new pattern, component, or service, document it immediately.
    - If you refactor existing logic, update the corresponding section.
- [ ] **Update `docs/TOOLS.md`**:
    - If you add, modify, or deprecate a tool, update its definition, parameters, and examples.
- [ ] **Update `docs/CHANGELOG.md`**:
    - Log every significant change with a date and brief description.
    - Group changes logically (e.g., "Features", "Fixes", "Refactoring").

## 3. Post-Implementation (Public Facing)
- [ ] **Update `README.md`**:
    - If the change affects how to run, build, or use the application, update the main README.
    - Highlight new major features or critical fixes.

## 4. Verification
- [ ] **Consistency Check**: Ensure code, comments, and markdown documentation all say the same thing.