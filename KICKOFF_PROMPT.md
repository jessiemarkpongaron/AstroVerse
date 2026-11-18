# Kickoff Prompt for Claude Code

Copy everything inside the block below and paste it as your first message to Claude Code,
from the root of the project folder that contains `CLAUDE.md` and `docs/`.

---

```
You are building AstroVerse, an astrology web app for Filipino users. Before writing any code:

1. Read CLAUDE.md, then every file in docs/ in this order:
   PRD.md → ARCHITECTURE.md → ASTRO_ENGINE.md → INTERPRETATION.md → ROADMAP.md
2. Summarize back to me in 10 bullets or fewer: what we're building, the stack, and the
   Phase 1 scope. Flag anything in the docs that is contradictory or unclear.
3. Propose the exact folder structure and the list of npm packages (with versions) you
   plan to install for Phase 1. Wait for my OK.

After I approve, work through ROADMAP.md Phase 1 one milestone at a time:
- Use a todo list for each milestone.
- The astrology engine (src/lib/astro/) comes FIRST and must pass its tests in
  docs/ASTRO_ENGINE.md ("Validation") before any UI is built on top of it.
- After each milestone: run `npm run typecheck`, `npm run lint`, and `npm test`,
  fix failures, then stop and give me a short summary of what changed and what's next.
- Never invent astronomical formulas from memory when a library function exists.
  If unsure about a library API, read its README/types in node_modules first.
- Do not commit secrets. Use .env.local and keep .env.example updated.

Start with steps 1–3 now.
```

---

## Follow-up prompts you can reuse

**Next milestone**
```
Continue with the next milestone in ROADMAP.md. Same rules: todo list, tests, typecheck, lint, then stop and summarize.
```

**Verify chart accuracy**
```
Compare our engine output against the reference fixtures in src/lib/astro/__tests__/fixtures.
List every planet/angle that is off by more than the tolerance in docs/ASTRO_ENGINE.md and fix the root cause.
```

**Review before deploy**
```
Review the whole app against docs/PRD.md acceptance criteria and docs/INTERPRETATION.md guardrails.
Give me a checklist of pass/fail items, then fix the failures.
```

**Add a feature**
```
I want to add <feature>. Update docs/PRD.md and docs/ROADMAP.md first, show me the diff, then implement after my OK.
```
