# Mobile Test Artifacts

Generated mobile screenshots, reports, logs, and command traces live here.

## Layout

```text
tests/mobile/artifacts/
  latest/                         overwritten by normal local runs
    environment/
      mobile-doctor.txt
    p4-phase1-smoke/
      report.html
      maestro.log
      *.png
      commands-*.json
  archive/                        optional preserved runs
    2026-05-14_1055-p4-phase1-smoke/
```

`latest/` and `archive/` are ignored by git because they contain generated evidence. The folder exists so test output lands beside the mobile tests instead of in the repo root.

## Normal Run

```bash
tests/mobile/scripts/run-maestro.sh
```

This clears and rewrites `tests/mobile/artifacts/latest/p4-phase1-smoke/`.

The local Android emulator path is deprecated for this workstation. Android artifacts should now come from the Samsung S23 physical-device lane described in `mobile/ANDROID_E2E_SETUP.md`. Failed physical-device runs are still useful: the debug folder captures screenshots, command traces, and `maestro.log` so we can see what the app rendered instead of treating the mobile test as a blind backend-style check.

## Archive Previous Latest Before Running

```bash
tests/mobile/scripts/run-maestro.sh --archive
```

This moves the existing latest run into `tests/mobile/artifacts/archive/<timestamp>-p4-phase1-smoke/` before executing the flow again.
