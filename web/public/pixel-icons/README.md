# Pixel icons (PixelLab-generated)

Copied from the frozen `docs/mockups/assets/icons/` suite (BoletApp → gastify port,
generated via PixelLab MCP; see that directory's README for the role taxonomy).
Flat namespace — names are prefix-organized (nav-*, action-*, rubro-*, store-*,
item-*, fin-*, scan-*, status-*, familia-*, chart-*, credit-* + mascots).
Convention (user-locked 2026-06-10): every icon WITH MEANING uses these pixel
icons; only utility actions (close X, back, submit/confirm, cancel) may use
stroke (Lucide-style) glyphs.

REGEN 2026-06-10: the 153 FUNCTIONAL icons (nav/fin/scan/action/status/chart/
credit/rubro/store/item/familia) were regenerated as ONE coherent warm pixel-art
family via the direct PixelLab SDK (design-lab/scripts/generate-icons.cjs;
manifest in docs/rebuild/ux/ICON-STYLE-SPEC.md). nav-profile is now a real
person-bust icon (no longer a mascot alias). Mascots + a few legacy loose files
preserved. Pre-regen originals are recoverable from git history (commit 9f0dc39,
before the cleanup that removed the pixel-icons-backup-pre-regen/ dir).
To redo a single icon: add it to a 1-line manifest and re-run the generator.
