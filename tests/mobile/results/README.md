# Mobile Test Results

Generated mobile screenshots, reports, logs, and command traces live here.

## Layout

```text
tests/mobile/results/
  runs/                           durable evidence packets; never overwritten
    staging-e2e/
      20260520T184200Z-staging-e2e-s23-fixture-phase2/
        run-manifest.json
        p4-phase2-scan-upload-happy-active/
          manifest.json
          report.html
          screenshots/
          commands-*.json
        p4-phase2-scan-upload-review-active/
        p4-phase2-scan-upload-failure-active/
        p4-phase2-camera-permission-denied-active/
    staging/
    staging-local/
    local/
  latest/                         convenience mirror of the latest run only
    local/
      CURRENT_RUN.txt
      run-manifest.json
      environment/
        mobile-doctor.txt
      p4-phase1-smoke/
        manifest.json
        report.html
        maestro.log
        *.png
        commands-*.json
    staging-e2e/
    staging/
    production/
  archive/                        legacy pre-run-folder packets
```

`runs/`, `latest/`, and `archive/` are ignored by git because they contain generated evidence. The source of truth for runtime proof is `runs/<env>/<run-id>/`; `latest/<env>/` is only a quick-access mirror for the most recent packet in that environment.

## Normal Run

```bash
tests/mobile/scripts/run-maestro.sh
```

This writes a new run folder under `tests/mobile/results/runs/<env>/<run-id>/<flow-name>/` and mirrors the same flow packet to `tests/mobile/results/latest/<env>/<flow-name>/`.

The local Android emulator path is deprecated for this workstation. Android results should now come from the Samsung S23 physical-device lane described in `mobile/ANDROID_E2E_SETUP.md`. Failed physical-device runs are still useful: the debug folder captures screenshots, command traces, and `maestro.log` so we can see what the app rendered instead of treating the mobile test as a blind backend-style check.

Set `GASTIFY_MOBILE_RESULTS_ROOT` to write these packets somewhere else. Older shells that still set `GASTIFY_MOBILE_ARTIFACT_ROOT` or `GASTIFY_ARTIFACT_ENV` continue to work as compatibility fallbacks, but new commands should prefer `GASTIFY_MOBILE_RESULTS_ROOT` and `GASTIFY_RESULT_ENV`.

## Group Several Flows Under One Run

```bash
export GASTIFY_MOBILE_RUN_ID="$(date -u '+%Y%m%dT%H%M%SZ')-staging-e2e-s23-fixture-phase2"
npm run maestro:scan-upload:happy:active
npm run maestro:scan-upload:review:active
npm run maestro:scan-upload:failure:active
npm run maestro:camera-permission-denied:active
```

Use one shared `GASTIFY_MOBILE_RUN_ID` for a multi-flow environment gate. The staging fixture wrapper does this automatically.

For repeated attempts at the same stage, use:

```bash
export GASTIFY_MOBILE_STAGE_ID=20260524-phase5-s23-clean-gate
export GASTIFY_MOBILE_ATTEMPT_ID=r4
```

That layout writes:

```text
tests/mobile/results/runs/<env>/<stage-id>/run-manifest.json
tests/mobile/results/runs/<env>/<stage-id>/attempts/<attempt-id>/<flow-name>/
```

The old `--archive` flag is accepted for compatibility, but it is no longer needed because each run already gets its own durable folder.
