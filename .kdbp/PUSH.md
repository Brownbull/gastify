# Push Configuration

Managed by `/gabe-push`. First run writes this file; every run after reads it.
Edit values directly or rerun `/gabe-push --reconfigure` to redo the interview.

## Defaults

| Setting | Value |
|---------|-------|
| remote | origin |
| default_env | production |
| pr_template | none |

## Environments

### production

| Setting | Value |
|---------|-------|
| target_branch | main |
| promote_from | staging |
| ci | github-actions |
| branch_cleanup | ask |

### staging

| Setting | Value |
|---------|-------|
| target_branch | staging |
| promote_from | — |
| ci | github-actions |
| branch_cleanup | ask |

## Remote branch policy

| Setting | Value |
|---------|-------|
| known_branches | main, staging, rebuild/fe-dashboard-batch-01, rebuild/be-phase-01 |
| on_extra | prompt |

## Decisions log

| Branch | Action | Decided | Notes |
|--------|--------|---------|-------|
| rebuild/fe-dashboard-batch-01 | ignore-always | 2026-05-06 | Old frontend batch branch from prior Storybook pivot work |

<!--
Migrated 2026-04-23 from v1 trunk-based shape (single env, promotion chain
"feature -> main") to env-block shape. Two envs: staging + production.
Updated 2026-05-21: staging is the durable integration branch/environment
for runtime-gated phases. For auth/session/DB/upload/realtime/native-mobile/
notifications/file-media/user-facing changes, /gabe-execute must produce
branch-backed Railway staging evidence before /gabe-review runs.

  /gabe-push staging   → push local HEAD to origin/staging
  /gabe-push           → targets production
                         - if origin/staging is ahead of origin/main,
                           offers [promote] (push staging -> main) or
                           [push-local] (current HEAD -> main, bypass staging)
                         - else pushes HEAD directly to main

origin/staging is a first-class known branch. Railway staging services should
autodeploy from that branch after GitHub CI passes. If Railway autodeploy is
unavailable, use the documented fallback:
  railway up ./backend --path-as-root --environment staging --service gastify-api-staging --detach --ci
  railway up ./backend --path-as-root --environment staging --service gastify-api-staging-e2e --detach --ci

CI: github-actions — flipped from none on 2026-05-06 after .github/workflows/ci.yml
landed during backend P1-P3. CI runs for main and staging pushes.
-->
