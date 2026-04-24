# gastify Design Tokens — Categories + Colors

Canonical taxonomy + per-theme per-mode color mappings ported from BoletApp production (`bmad/boletapp/shared/schema/` + `bmad/boletapp/src/config/categoryColors/`). Single source of truth for every category chip, icon tint, group header, and list-item color across the app.

## Files

| File | Purpose | Size |
|------|---------|------|
| `categories.ts` | V4 taxonomy — 4-level Spanish hierarchy (12 L1 + 44 L2 + 9 L3 + 42 L4). PascalCase canonical keys + Spanish display labels + AI-prompt group strings. | 12 KB |
| `categoryTranslations.ts` | ES + EN display maps for every category key (Claude Design uses these for render labels). | 31 KB |
| `categoryColors-types.ts` | TypeScript types (`ThemeName`, `ModeName`, `CategoryColorSet`, `ThemeModeColors`, `GroupThemeModeColors`) + group key enums. | 3 KB |
| `storeColors.ts` | **44 L2 store categories** × 3 themes × 2 modes × {fg, bg}. Production-proven. | 15 KB |
| `itemColors.ts` | **42 L4 item categories** × 3 themes × 2 modes × {fg, bg}. Production-proven. | 14 KB |
| `groupColors.ts` | **12 L1 rubros + 9 L3 familias** × 3 themes × 2 modes × {fg, bg, border}. Used for list headers, group pills. | 10 KB |

Total: 85 KB. Keep TypeScript format verbatim — preserves type safety + comments + AI-prompt groupings downstream.

## Taxonomy overview (V4, 4 levels)

```
L1 Rubros (12)       — where you buy, top-level grouping
  ├─ L2 Giros (44)   — specific store type
L3 Familias (9)      — what you buy, top-level grouping
  └─ L4 Categorías (42) — specific item type
```

### L1 Rubros (12 store-category groups)

| Key | Display (ES) | Icon | Covers L2 giros |
|-----|--------------|------|-----------------|
| `supermercados` | Supermercados | `rubros/rubro-supermercados.png` | Supermarket, Wholesale |
| `restaurantes` | Restaurantes | `rubros/rubro-restaurantes.png` | Restaurant |
| `comercio-barrio` | Comercio de Barrio | `rubros/rubro-comercio-barrio.png` | Almacen, Minimarket, OpenMarket, Kiosk, LiquorStore, Bakery, Butcher |
| `vivienda` | Vivienda | `rubros/rubro-vivienda.png` | UtilityCompany, PropertyAdmin |
| `salud-bienestar` | Salud y Bienestar | `rubros/rubro-salud-bienestar.png` | Pharmacy, Medical, Veterinary, HealthBeauty |
| `tiendas-generales` | Tiendas Generales | `rubros/rubro-tiendas-generales.png` | Bazaar, ClothingStore, ElectronicsStore, HomeGoods, FurnitureStore, Hardware, GardenCenter |
| `tiendas-especializadas` | Tiendas Especializadas | `rubros/rubro-tiendas-especializadas.png` | PetShop, BookStore, OfficeSupplies, SportsStore, ToyStore, AccessoriesOptical, OnlineStore |
| `transporte-vehiculo` | Transporte y Vehículo | `rubros/rubro-transporte-vehiculo.png` | AutoShop, GasStation, Transport |
| `educacion` | Educación | `rubros/rubro-educacion.png` | Education |
| `servicios-finanzas` | Servicios y Finanzas | `rubros/rubro-servicios-finanzas.png` | GeneralServices, BankingFinance, TravelAgency, SubscriptionService, Government |
| `entretenimiento-hospedaje` | Entretenimiento y Hospedaje | `rubros/rubro-entretenimiento-hospedaje.png` | Lodging, Entertainment, Casino |
| `otros` | Otros | `rubros/rubro-otros.png` | CharityDonation, Other |

### L3 Familias (9 item-category groups)

| Key | Display (ES) | Icon | Covers L4 categorías |
|-----|--------------|------|----------------------|
| `food-fresh` | Alimentos Frescos | `familias/familia-food-fresh.png` | Produce, MeatSeafood, BreadPastry, DairyEggs |
| `food-packaged` | Alimentos Envasados | `familias/familia-food-packaged.png` | Pantry, FrozenFoods, Snacks, Beverages |
| `food-prepared` | Comida Preparada | `familias/familia-food-prepared.png` | PreparedFood |
| `salud-cuidado` | Salud y Cuidado Personal | `familias/familia-salud-cuidado.png` | BeautyCosmetics, PersonalCare, Medications, Supplements, BabyProducts |
| `hogar` | Hogar | `familias/familia-hogar.png` | CleaningSupplies, HomeEssentials, PetSupplies, PetFood, Furnishings |
| `productos-generales` | Productos Generales | `familias/familia-productos-generales.png` | Apparel, Technology, Tools, Garden, CarAccessories, SportsOutdoors, ToysGames, BooksMedia, OfficeStationery, Crafts |
| `servicios-cargos` | Servicios y Cargos | `familias/familia-servicios-cargos.png` | ServiceCharge, TaxFees, Subscription, Insurance, LoanPayment, TicketsEvents, HouseholdBills, CondoFees, EducationFees |
| `vicios` | Vicios | `familias/familia-vicios.png` | Alcohol, Tobacco, GamesOfChance |
| `otros-item` | Otros | `familias/familia-otros-item.png` | OtherItem |

### L2 Giros (44) + L4 Categorías (42)

Full list: see `categories.ts` lines 34–102 (stores) and 120–180 (items). Icons live at `../icons/app-icons/store-categories/` and `../icons/app-icons/item-categories/` with matching filename stems (PascalCase → kebab-case, e.g. `MeatSeafood` → `item-meat-seafood.png`).

## Color scheme structure

Every category gets a 2-layer × 3-theme × 2-mode color set.

```ts
type CategoryColorSet = { fg: string; bg: string };          // item / store (L4 / L2)
type GroupColorSet = CategoryColorSet & { border: string };  // group (L1 / L3)

type ThemeModeColors = {
  normal:       { light: CategoryColorSet; dark: CategoryColorSet };
  professional: { light: CategoryColorSet; dark: CategoryColorSet };
  mono:         { light: CategoryColorSet; dark: CategoryColorSet };
};
```

- `fg` — text + icon stroke color (high-contrast against bg)
- `bg` — chip / badge background (low-saturation tint)
- `border` — group-header accent bar (groups only)

## Sample: L1 Rubros × 3 themes (LIGHT MODE foreground only)

Quick-reference for chip colors. Full data in `groupColors.ts`.

| Rubro | Normal fg | Professional fg | Mono fg |
|-------|-----------|-----------------|---------|
| supermercados | `#15803d` (forest) | `#16a34a` (green) | `#2d8c50` (muted green) |
| restaurantes | `#c2410c` (terracotta) | `#ea580c` (orange) | `#b86830` (warm brown) |
| comercio-barrio | `#b45309` (amber) | `#d97706` (amber-600) | `#a88020` (olive) |
| vivienda | `#1e40af` (deep navy) | `#2563eb` (steel) | `#385898` (slate-blue) |
| salud-bienestar | `#be185d` (rose) | `#db2777` (pink) | `#a83868` (muted rose) |
| tiendas-generales | `#0f766e` (teal) | `#14b8a6` (cyan) | `#288c8c` (muted teal) |
| tiendas-especializadas | `#7c3aed` (violet) | `#8b5cf6` (indigo) | `#7838a0` (muted violet) |
| transporte-vehiculo | `#374151` (slate) | `#4b5563` (gray) | `#507080` (muted slate) |
| educacion | `#2563eb` (blue) | `#3b82f6` (blue-500) | `#3068a0` (steel) |
| servicios-finanzas | `#1e40af` (navy) | `#2563eb` (steel) | `#385898` (slate-blue) |
| entretenimiento-hospedaje | `#7c3aed` (violet) | `#8b5cf6` (indigo) | `#7838a0` (muted violet) |
| otros | `#047857` (emerald) | `#10b981` (green) | `#289068` (muted emerald) |

Dark-mode variants (brighter fg, darker bg) in `groupColors.ts` under each key's `.dark` property.

## Sample: 8 canonical chip tokens (from legacy gastify-dashboard.html CSS)

The dashboard exposes 8 category tokens as global CSS custom properties — they are PRE-COMPUTED from the taxonomy above for performance. Every theme defines all 8.

| CSS Token | Maps to | Purpose |
|-----------|---------|---------|
| `--cat-hogar` / `--cat-hogar-tint` | L3 `hogar` family primary | Household goods chip |
| `--cat-medicamento` / `--cat-medicamento-tint` | L4 `Medications` | Medication row highlight |
| `--cat-cargo` / `--cat-cargo-tint` | L3 `servicios-cargos` | Service charge chip |
| `--cat-otros-green` / `--cat-otros-green-tint` | L1 `otros` (in green variant) | Fallback chip |
| `--cat-mascotas` / `--cat-mascotas-tint` | L4 `PetFood` + `PetSupplies` | Pet row highlight |
| `--cat-construccion` | L2 `Hardware` / `GardenCenter` | Home-construction chip |
| `--cat-farmacia` | L2 `Pharmacy` | Pharmacy merchant chip |
| `--cat-vet` | L2 `Veterinary` | Vet merchant chip |

Full mapping: `categoryColors/groupColors.ts` + `categoryColors/storeColors.ts` + `categoryColors/itemColors.ts`.

## Usage in HTML / CSS

### Direct lookup (TypeScript)

```ts
import { getCategoryColors } from './api'; // bmad/boletapp/src/config/categoryColors/api.ts
const c = getCategoryColors('Pharmacy', 'normal', 'light');
// c.fg = '#be185d', c.bg = '#fce7f3'
```

### Static CSS (for mockups)

```html
<!-- chip example, Normal light mode -->
<span class="chip chip--pharmacy" style="color: #be185d; background: #fce7f3;">
  Farmacia
</span>

<!-- runtime-switched via data attributes -->
<body data-theme="professional" data-mode="dark">
  <span class="chip chip--cat-pharmacy">Farmacia</span>
</body>

<style>
  /* light mode default */
  [data-mode="light"] .chip--cat-pharmacy { color: #be185d; background: #fce7f3; }
  /* dark mode */
  [data-mode="dark"] .chip--cat-pharmacy { color: #f9a8d4; background: #831843; }
  /* professional theme override */
  [data-theme="professional"][data-mode="light"] .chip--cat-pharmacy { color: #db2777; background: #fce7f3; }
</style>
```

## Claude Design upload

Drag the entire `tokens/` folder into "Add fonts, logos and assets" during Claude Design setup. Claude Design reads the TS + README, stores the taxonomy + color maps as structured data it can reference during render passes.

Render instructions can then say: *"Use canonical category colors from tokens/itemColors.ts for category chips — Pharmacy → `normal.light.fg = #be185d`, etc."*

## Translations

`categoryTranslations.ts` holds `es-CL` + `en` display maps keyed by canonical PascalCase. When a render asks for Spanish copy, look up here:

```ts
import { getCategoryDisplayName } from './categoryTranslations';
getCategoryDisplayName('Pharmacy', 'es'); // → 'Farmacia'
getCategoryDisplayName('MeatSeafood', 'es'); // → 'Carnes y Mariscos'
getCategoryDisplayName('BreadPastry', 'en'); // → 'Bread & Pastry'
```

Spanish copy is the default — English is the fallback for international builds (US / Canada).

## License + ownership

Ported from BoletApp production codebase (owned by project). Schema + color values represent 6 months of production refinement — DO NOT regenerate from scratch. Treat as brand asset.
