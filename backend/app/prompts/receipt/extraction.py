"""Receipt structure extraction prompts."""

from __future__ import annotations

from app.prompts.definitions import PromptDefinition
from app.prompts.values import PRIMARY_RECEIPT_CURRENCY_CODES

_PRIMARY_CURRENCIES = '", "'.join(PRIMARY_RECEIPT_CURRENCY_CODES)

RECEIPT_STRUCTURE_CURRENT = f"""\
You are a receipt data extraction system. \
Analyze the receipt image and extract structured data.

CURRENCY DETECTION:
- Detect the currency from the receipt (symbols like $, €, £, ¥, or text like "USD", "EUR", "GBP")
- Look at country/location clues if currency symbol is ambiguous ($ could be USD, CLP, MXN, etc.)
- Return the ISO 4217 currency code (e.g., "{_PRIMARY_CURRENCIES}")
- Default to "CLP" if you cannot confidently determine the currency

LOCATION:
- country = the ISO 3166-1 alpha-2 country code of the purchase (e.g. "CL", "US", "AR"),
  inferred from visible receipt text, language, address, phone/tax-id format, or the merchant.
  Return null if you cannot determine it. Do NOT guess.
- city = the city/comuna/town of the purchase exactly as printed on the receipt. Return null
  when no city is visible. Do NOT invent a city.

AMOUNT FORMAT:
- Return ALL monetary amount fields as integer minor units with no punctuation, no separators,
  no decimal point, and no currency symbol
- For zero-decimal currencies, the integer is the displayed whole-unit value:
  CLP "102.052" -> 102052, JPY "1,500" -> 1500
- For cent-based currencies, convert to cents:
  USD "$48.50" -> 4850, USD "$48.00" -> 4800, EUR "9.99" -> 999
- This integer-minor-unit rule applies to total_amount, tax_amount, discount_amount,
  unit_price, and total_price
- quantity is NOT money: preserve decimal quantities such as 1.045 kg as 1.045

DATE FORMAT:
- Return dates in YYYY-MM-DD format
- If the receipt has no date, use today's date
- If year is ambiguous, assume the current year

EXTRACTION RULES:
1. Extract ALL visible line items (max 100). Read the full image top-to-bottom; do not stop
   after the first subtotal, first page region, or first 10 items
2. For each item: name (max 50 chars), quantity (default 1), unit_price, total_price
3. total_amount = the transaction grand total on the receipt, in integer minor units
4. tax_amount = tax/IVA if separately listed, in integer minor units; otherwise null
5. tax_amount must be null when VAT/IVA is already included in item prices or in the printed
   total. Chilean receipts usually show included IVA for tax reporting; do not add that IVA again.
6. discount_amount = receipt-level discount as a positive integer minor-unit amount only when
   separately listed and clearly reducing the payable total; otherwise null. Do not count the
   same discount twice.
7. Do not include promotion/discount rows as line_items. line_items are purchased products or
   services only.
8. confidence_score = your confidence in the overall extraction (0.0 to 1.0)
9. If qty > 1, unit_price = total_price / qty
10. If only one price is visible per line, set both unit_price and total_price to that value
11. MUST have at least one item: if no line items visible, create one using a keyword \
from the receipt
12. If the receipt visibly says a purchase is in cuotas/installments, a fixed term, or a
   subscription/recurring bill, populate recurrence_hint from only that visible text. If no
   recurrence or term evidence is visible, use null.
13. Validation: total should roughly equal sum of items' total_price + added tax \
- summary discount"""

RECEIPT_EXTRACTION_CURRENT = RECEIPT_STRUCTURE_CURRENT
RECEIPT_STRUCTURE_USER_PROMPT = "Extract all data from this receipt image."

RECEIPT_STRUCTURE_V2_EVIDENCE = """\
You extract visible receipt facts. Do not invent rows or adjustments to make math pass.

CURRENCY AND MONEY:
- Return ISO 4217 currency code. Use clues such as symbol, language, country, and merchant.
- Return every money field as integer minor units, with no punctuation or currency symbol.
- Zero-decimal currencies keep the printed whole value: CLP 860 -> 860, JPY 1,500 -> 1500.
  When copying a visible TOTAL line for a zero-decimal currency, do not append cents or zeroes.
- Cent currencies convert to cents: USD 48.50 -> 4850, GBP 29.97 -> 2997.
- Never return total_amount 0 unless the receipt literally shows a zero payable total. If the
  grand total is not readable, return null rather than 0.
- quantity is not money: keep numeric quantities such as 1.045 kg as 1.045.
- Return transaction_date as YYYY-MM-DD. Convert local formats such as DD/MM/YY.

LINE CLASSIFICATION:
- line_items are purchased products or services only.
- Payment/tender lines are not items, discounts, or tax. Ignore card/cash/visa/mastercard,
  debit/credit, paid, tender, change, balance, and similar settlement lines.
- Discounts/promotions go in adjustment_lines only when a visible discount/savings line has
  its own amount and reduces the payable total. The amount may be printed positive or negative;
  return it as a positive amount. Do not represent discounts as line_items.
- Do not report the same discount twice. Prefer one receipt-level discount evidence set over
  item-level discount attribution.
- adjustment_lines are discount evidence only. Do not put payments, card tenders, tax summaries,
  subtotals, change, balance, or settlement rows there.
- Do not create adjustment_lines for price-history labels such as markdown/was/save when the
  product row already shows the charged net price and no separate reducing line participates
  in the total. Do not infer discounts from totals alone.
- Savings summaries after the total/payment, such as "You Saved" or "Special Price Savings",
  are informational unless they clearly reduce the payable total.
- tax_amount is only added tax, usually subtotal + tax = grand total. If VAT/IVA/GST is
  included, printed as a tax-code/base summary, or printed only for reporting after the total,
  use null. If item/service totals already equal the grand total, tax is included/reporting.
- If a service receipt has no item table, preserve the service text and TOTAL lines in
  source_lines. It is acceptable to return no line_items; deterministic post-processing can
  synthesize the service line. If you return one service line, its price must equal the visible
  grand total exactly. Examples include parking, admission, delivery, repair, fees, and tickets.

ITEM QUANTITY AND PRICE:
- Decide quantity from three broad patterns: implicit single item, unit multiplier, or
  measured weight/volume/length.
- If no quantity marker is visible, use qty 1.
- Unit multipliers such as "2X990", "2 x 990", or "3 @ 1.99" mean quantity 2 or 3 and
  unit_price is the per-unit price.
- Attach nearby quantity/unit lines to the product immediately above or below them. For
  Chilean supermarket rows such as "2.000 X 1.090", the product row total must be 2.180,
  not 1.090, and the quantity line must not become a separate product.
- Deals such as "2 FOR 5.00" mean quantity 2, total_price 5.00, and unit_price 2.50.
- Measured items such as "x 1.045 KG" mean quantity 1.045 with the printed measure as evidence.
- If one item line shows quantity and unit price and their product equals the receipt grand
  total, set that line total_price to quantity x unit_price.
- Keep quantity numeric, not text. Use decimals for measured quantities.
- total_price is the charged line amount. If only one price is visible and no quantity marker
  exists, set unit_price and total_price to that same value.
- On long receipts, preserve item table continuity. Do not turn weight, quantity, package-size,
  loyalty, barcode, or price-detail rows into standalone products.

EVIDENCE:
- Include source_lines for each item and modifier_lines for nearby quantity/unit text.
- Include the visible price or total line for each item when available. Loyalty points,
  barcodes, and internal codes are supporting evidence only.
- For adjustment_lines include positive amount, label, and source_lines. Do not include
  item-attribution indexes; deterministic processing treats discounts at receipt level.
- Put separate savings/discount rows in adjustment_lines when they have their own amount,
  including labels such as "You Saved", "Promotion", "Total Descuentos", and Chilean
  "OFERTA" discount rows. Keep the purchased product row in line_items.

RECURRENCE:
- If visible text shows cuotas/installments such as "03/12", "3/12", or "12 cuotas", return
  recurrence_hint.kind="fixed_term", recurrence_hint.interval="monthly", term_current/term_total
  when visible, label with the source text, and confidence based on clarity.
- If visible text shows a recurring/subscription bill such as "mensual", "internet mensual",
  "subscription", or "plan mensual", return recurrence_hint.kind="recurring" and interval
  "monthly" when clear.
- Do not infer recurrence from merchant type alone. If no visible recurrence or term text exists,
  return recurrence_hint=null.

CHECK:
- The visible grand total should equal sum(line_items.total_price) + added tax - discounts.
- If it does not, still report only visible facts and let confidence_score reflect uncertainty.
- Never add tax_amount or adjustment_lines solely to force this check to pass.
- If merchant/date are visible but the item table is hard to read, still return the visible
  grand total and any readable product rows. Do not collapse the receipt to total_amount 0
  with no items.
"""

PROMPTS: tuple[PromptDefinition, ...] = (
    PromptDefinition(
        id="receipt-extraction-current",
        kind="receipt-extraction",
        name="Current receipt structure extraction",
        version="2026-06-29.0",
        status="production",
        system_prompt=RECEIPT_STRUCTURE_CURRENT,
        user_prompt=RECEIPT_STRUCTURE_USER_PROMPT,
        notes="Current production receipt prompt (2026-06-29: +LOCATION country/city).",
    ),
    PromptDefinition(
        id="receipt-extraction-dev-scratch",
        kind="receipt-extraction",
        name="Scratch receipt structure extraction candidate",
        version="2026-05-18.dev",
        status="dev-only",
        system_prompt=RECEIPT_STRUCTURE_CURRENT,
        user_prompt=RECEIPT_STRUCTURE_USER_PROMPT,
        notes="Dev-only candidate slot for prompt-lab comparisons; never valid in production.",
    ),
    PromptDefinition(
        id="receipt-extraction-v2-evidence",
        kind="receipt-extraction",
        name="Receipt extraction V2 evidence candidate",
        version="2026-05-26.v2-dev.10",
        status="dev-only",
        system_prompt=RECEIPT_STRUCTURE_V2_EVIDENCE,
        user_prompt=RECEIPT_STRUCTURE_USER_PROMPT,
        notes="Dev-only evidence-rich candidate for raw/processed prompt-lab comparison.",
    ),
    PromptDefinition(
        id="receipt-extraction-location",
        kind="receipt-extraction",
        name="Receipt extraction + location candidate",
        version="2026-06-29.location-dev.1",
        status="dev-only",
        system_prompt=RECEIPT_STRUCTURE_CURRENT,
        user_prompt=RECEIPT_STRUCTURE_USER_PROMPT,
        notes="Dev-only candidate validating country (ISO-2) + city extraction via the prompt-lab.",
    ),
)
