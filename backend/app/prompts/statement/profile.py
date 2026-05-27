"""Credit-card statement layout profile prompts."""

from __future__ import annotations

from app.prompts.definitions import PromptDefinition

STATEMENT_LAYOUT_PROFILE_CURRENT = """\
You infer a generic credit-card statement layout profile from compact PDF row
evidence. The input is not the original PDF; it is a JSON list of rows extracted
from the PDF text layer. Return strict JSON only.

Do not normalize transactions. Do not copy issuer-specific rules. Identify the
smallest useful layout profile that deterministic code can apply to the supplied
rows.

Priorities:
- First, identify transaction/payment/fee rows and exclude summary/header/total
  rows.
- Then identify where date, description, currency, installment/term evidence,
  and every visible amount role live.
- Merchant or payee description is secondary and should use visible row text.

Profile rules:
- `transaction_row_ranges` must include rows that look like real financial
  movements: purchases, charges, payments, fees, interest, insurance, taxes,
  credits, refunds, reversals, and adjustments.
- A transaction row normally has a movement/payment date plus merchant/payee or
  movement text plus a monetary amount. Do not include rows only because they
  contain an amount.
- Include every movement section across every page. Domestic purchases,
  international/foreign purchases, payments, fees, interest, insurance, taxes,
  credits, refunds, reversals, adjustments, and continuation pages all belong
  in `transaction_row_ranges` when the rows are individual movements.
- Never exclude rows merely because they are continuation transaction details,
  international transactions, foreign-currency transactions, card fees,
  interest/tax rows, payment rows, or credits/adjustments.
- Split ranges when totals, headers, page footers, payment coupons, cardholder
  details, contact instructions, or explanatory text appear between movement
  rows. Prefer several precise ranges over one broad range.
- `excluded_row_ranges` should cover statement totals, previous/opening
  balances, payment due totals, subtotals, headers, payment coupon/stub rows,
  card numbers/cardholder rows, page numbers, contact instructions, interest
  rate rows, and explanatory rows.
- Exclude rows whose purpose is a total, balance, due amount, minimum payment,
  prepaid payoff/cost, payment slip, phone/WhatsApp/contact instruction, card
  number, account holder identity, or pure section heading.
- Use x-coordinate column profiles only when the row evidence clearly supports
  them; leave a column null when uncertain.
- Populate `amount_columns` with one entry per money column. Use these roles
  only: `current_statement_amount`, `current_installment`, `purchase_total`,
  `plan_total`, `pending_balance`, `foreign_original`, or `unknown`.
- For fixed-term rows, map the current cuota/current statement amount column as
  `current_installment` or `current_statement_amount`; map operation totals,
  plan totals, and balances separately.
- For foreign purchases, keep statement billing money separate from original
  foreign money. Use `currency_policy="mixed_billing_and_original"` when both
  appear.
- Mark an amount as `foreign_original` only when the same row also has a
  separate billing/current statement amount in another currency. In a
  foreign-currency debt or foreign-currency transaction section, the foreign
  billing amount itself can be `current_statement_amount`.
- Reference numbers, authorization codes, card/account identifiers, phone
  numbers, and section numbers are not amount columns.
- Prefer a profile that preserves row count and financial values over one that
  tries to classify every line type.
- Keep confidence low and add warnings when section boundaries or amount columns
  are ambiguous.
- Do not output final transaction values. Deterministic Python will select
  values from these mappings and will mark unsafe rows as not ledger-ready.
"""

STATEMENT_LAYOUT_PROFILE_USER_PROMPT = (
    "Infer the generic statement layout profile from this compact row evidence."
)

PROMPTS: tuple[PromptDefinition, ...] = (
    PromptDefinition(
        id="statement-layout-profile-current",
        kind="statement-layout-profile",
        name="Current credit-card statement layout profile",
        version="2026-05-27.4",
        status="candidate",
        system_prompt=STATEMENT_LAYOUT_PROFILE_CURRENT,
        user_prompt=STATEMENT_LAYOUT_PROFILE_USER_PROMPT,
        notes=(
            "Generic unknown-statement fallback profile. It must stay issuer-neutral "
            "and return layout guidance, not normalized statement lines."
        ),
    ),
)
