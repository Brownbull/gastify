# Documentation Tracking

# Maps source code patterns to documentation targets.
# Created by /gabe-init based on project type.
# Used by /gabe-commit CHECK 7 (doc drift).
#
# Columns:
#   Source Pattern — glob matching changed files in git diff
#   Doc Target — the documentation file that should be updated (or "skip")
#   Section — the heading within the doc target to check/update
#   Priority — critical (blocks) | high (warns) | medium (info) | low (info)
#
# Glob syntax: * matches within directory, ** matches across directories
# To exclude a pattern explicitly, set Doc Target to "skip"
# To add project-specific mappings, append rows to the table.

## Agent App

| Source Pattern | Doc Target | Section | Priority |
|---|---|---|---|
| api/models/*.py | docs/architecture.md | Data Model | critical |
| api/schemas/*.py | docs/architecture.md | API Contracts | critical |
| api/routes/*.py | docs/architecture.md | API Endpoints | high |
| api/agents/*.py | docs/AGENTS_USE.md | Agent Design | critical |
| api/agents/tools.py | docs/AGENTS_USE.md | Tools | high |
| api/agents/prompts.py | docs/AGENTS_USE.md | Prompts | high |
| api/guardrails/*.py | docs/AGENTS_USE.md | Safety | high |
| api/integrations/*.py | docs/architecture.md | Integrations | medium |
| api/context/*.py | docs/AGENTS_USE.md | Context Engineering | medium |
| api/observability/*.py | docs/SCALING.md | Observability | medium |
| api/config.py | README.md | Configuration | medium |
| docker-compose.yml | README.md | Setup | medium |
| db/alembic/versions/*.py | docs/architecture.md | Data Model | high |
| tests/** | skip | | |
| web/src/components/** | skip | | |
| web/src/features/** | skip | | |
| .kdbp/** | skip | | |
