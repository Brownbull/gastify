# Receipt Pattern Catalog

This catalog records manual receipt-reading rules used by prompt candidates,
post-processing, and prompt-lab scoring. It is evidence for AI-quality work
only; physical-device staging evidence is still required for runtime gates.

## Canonical Discount Shape

- Product rows remain product rows.
- Visible discounts are stored as positive informational amounts on affected
  items when attribution is clear.
- Receipt-level `discount_amount` is the positive total discount used for math.
- Separate discount rows from legacy baselines are converted into discount
  fields during scoring; they should not persist as product items.

## Initial Cases

| Case | Patterns | Canonical Expectation |
|---|---|---|
| `supermarket/super_lider` | CLP thousands, weighted items, multipacks, item-area promotions, included IVA | 25 product rows, `discount_amount=12820`, no persisted discount item rows |

## Rules

- `x 1.045 KG` near a product is a quantity marker for that product.
- `2X990` before an item is quantity `2`, unit price `990`, and should match a
  line total of `1980`.
- A product row with one visible price and no quantity marker has quantity `1`.
- Quantity extraction should stay in three general families: implicit single
  product/service, unit multiplier, and measured weight/volume/length. The
  quantity value is numeric; units are evidence, not part of the number.
- Chilean IVA printed for reporting is normally included in item prices and
  does not get added to the total.
- Added tax is only tax that participates in the payable total, usually
  `subtotal + tax = grand total`. Included tax summaries and tax-base summaries
  stay out of `tax_amount`.
- Price-history labels such as markdown/was/save are not automatically
  discounts. Count them only when a separate visible line amount reduces the
  payable total; otherwise keep the product row at the charged net price.
- Post-processing should not trust adjustment rows blindly. If product/service
  line totals already reconcile to the grand total, and applying a visible
  adjustment would break that reconciliation, ignore the adjustment for the
  canonical processed result.
- If a discount row cannot be confidently tied to one product, keep it in the
  receipt-level discount total and mark reconstruction as partial.
