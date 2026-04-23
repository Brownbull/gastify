# Architecture Patterns

<!-- Standards: see ~/.claude/skills/gabe-docs/SKILL.md (CommonMark + Mermaid + analogy-first) -->

Patterns this project has adopted, with rationale and where they're applied. Auto-appended by `/gabe-teach arch` on verify (Step 9c.2). Safe to edit by hand — the command preserves human-edited `**Why we use it:**` lines.

## How to read this file

- One section per architecture pattern, keyed by the concept's ID from the `gabe-arch` catalog.
- `**Verified:**` — when the concept was last confirmed for this project, via `/gabe-teach arch`.
- `**Applied in:**` — gravity wells and topic IDs where this pattern is actively used.
- `**Why we use it:**` — one-line rationale. Default is the concept's canonical one-liner; edit it to capture project-specific nuance.
- `### Decisions around this pattern` — auto-populated from `.kdbp/DECISIONS.md` rows that cite this concept. Operational-tagged decisions are excluded (see `.kdbp/DEPLOYMENTS.md` for those).

## How this file relates to other docs

- **Per-well docs (`docs/wells/N-*.md`)** — each well doc has its own `## Architecture patterns` section listing only the patterns relevant to that well. This file is the aggregate view.
- **`.kdbp/KNOWLEDGE.md`** — the Topics table's `ArchConcepts` column is the source of truth for which topics touch which concepts. This file reads from there; don't edit the column from here.
- **`.kdbp/DECISIONS.md`** — the decision log. Rows citing a concept ID are surfaced in the "Decisions around this pattern" block below each section.

---

<!-- Concept sections auto-appear below this line. First append will create the first section. -->
