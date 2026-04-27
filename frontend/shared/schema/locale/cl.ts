/**
 * Chilean Locale — Local Term Disambiguation for AI Receipt Scanning
 *
 * Maps Chilean Spanish terms commonly found on receipts to English category keys.
 * These rules help the AI correctly classify local business types and receipt keywords
 * that would otherwise be ambiguous or mistranslated.
 *
 * Used by: V4+ AI prompts (injected into LOCAL TERM DISAMBIGUATION section)
 *
 * To add rules for another locale, create a new file (e.g., de.ts, mx.ts)
 * following the same pattern. The prompt builder combines all locale rules.
 */

// ============================================================================
// STORE TYPE DISAMBIGUATION
// ============================================================================

/**
 * Chilean store type terms → English category keys.
 * Format: "local term" = English meaning → CategoryKey (clarification if needed)
 */
export const CL_STORE_TERMS = `\
- "Feria" = open-air market selling produce/seafood → OpenMarket (NOT a fair or exhibition)
- "Almacen" / "Negocio" = neighborhood corner store → Almacen (NOT a warehouse)
- "Botilleria" = liquor store → LiquorStore
- "Bencinera" / "Copec" / "Shell" / "Petrobras" = gas station → GasStation
- "Kiosko" = small street-level shop (snacks, newspapers, phone cards) → Kiosk
- "Panaderia" = bakery (store type) → Bakery; bread items are BreadPastry (item category)
- "Carniceria" = butcher shop (store type) → Butcher; meat items are MeatSeafood (item category)
- "Farmacia" / "Cruz Verde" / "Ahumada" / "Salcobrand" = pharmacy → Pharmacy
- "Ferreteria" = hardware store → Hardware
- "Minimarket" / "OK Market" / "Oxxo" = minimarket → Minimarket`;

// ============================================================================
// RECEIPT KEYWORD DISAMBIGUATION
// ============================================================================

/**
 * Chilean receipt keywords for single-service receipts (no line items visible).
 * Used when the AI must create a synthetic item from a receipt keyword.
 */
export const CL_RECEIPT_KEYWORDS = `\
- "estacionamiento" = parking → store: Transport, item: ServiceCharge
- "servicio" = service charge → infer store and item category from surrounding context
- "peaje" = toll → store: Transport, item: ServiceCharge
- "propina" = tip → store: Restaurant, item: ServiceCharge`;

// ============================================================================
// COMBINED EXPORT
// ============================================================================

/**
 * All Chilean disambiguation rules, ready to inject into a prompt.
 */
export const CL_LOCAL_TERMS = `\
Chilean Spanish terms:
${CL_STORE_TERMS}

Receipt keywords (for single-service receipts with no line items):
${CL_RECEIPT_KEYWORDS}`;
