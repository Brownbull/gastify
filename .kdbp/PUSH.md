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
| known_branches | main, rebuild/fe-dashboard-batch-01, rebuild/be-phase-01 |
| on_extra | prompt |

## Decisions log

| Branch | Action | Decided | Notes |
|--------|--------|---------|-------|
| rebuild/fe-dashboard-batch-01 | ignore-always | 2026-05-06 | Old frontend batch branch from prior Storybook pivot work |

<!--
Migrated 2026-04-23 from v1 trunk-based shape (single env, promotion chain
"feature -> main") to env-block shape. Two envs: staging + production.

  /gabe-push staging   → push local HEAD to origin/staging
  /gabe-push           → targets production
                         - if origin/staging is ahead of origin/main,
                           offers [promote] (push staging -> main) or
                           [push-local] (current HEAD -> main, bypass staging)
                         - else pushes HEAD directly to main

origin/staging does not exist yet. Will auto-create on first
/gabe-push staging. After that it joins known_branches via env resolution
and Step 2.7 drift check stays quiet.

CI: github-actions — flipped from none on 2026-05-06 after .github/workflows/ci.yml
landed during backend P1-P3. 9 jobs: 4 frontend + 1 backend + 2 security + 1 custom gates.
-->
