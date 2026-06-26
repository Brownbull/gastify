# Coming-Soon Registry

> Per **D101**: every design-lab mockup is implemented in the live app. Elements/features
> not yet backed by real data render as a **"coming soon" / "próximamente"** placeholder
> (visually present per the design, flagged + non-functional) and are registered HERE so we
> build them later. Nothing from the Storybook is discarded.

| ID | Screen / subview | Element / feature | Why not backed yet | Placeholder shipped | Build-later notes |
|----|------------------|-------------------|--------------------|---------------------|-------------------|
| CS-1 | Settings · Preferencias | Modo (dark / auto theme) | Theme/dark system cut by D-B (single light theme) | ✅ disabled SegmentedToggle, "Claro" fixed, Próximamente badge | Needs a theme/color-scheme system + persisted pref; reverses D-B — product decision |
| CS-2 | Settings · Preferencias | Paleta de color (Normal/Profesional/Monocromo) | 3-palette system cut by D-B | ✅ disabled Select | Re-introduces the multi-palette token sets cut in W1 |
| CS-3 | Settings · Preferencias | Color de fuente (Colorido/Simple) | No font-color setting | ✅ disabled SegmentedToggle | Needs an ink-vs-accent text mode + persisted pref |
| CS-4 | Settings · Preferencias | Tipografía (Outfit/Space Grotesk) | Single typeface only; no switcher | ✅ disabled Select | Needs runtime font-family swap + persisted pref |
| CS-5 | Settings · Preferencias | Tamaño de fuente (Normal/Pequeño) | No font-size/scale setting | ✅ disabled SegmentedToggle | Needs a root font-scale + persisted pref |
