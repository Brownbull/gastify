"""Chilean electronic-boleta (SII) structured-payload parser.

Parses the `timbre electrónico` (TED) payload carried by a boleta's QR/PDF417
barcode into the same extraction shape the vision pipeline produces — so a
structured boleta can become a transaction WITHOUT calling the vision LLM
(REQ-26). The TED `<DD>` (datos del documento) carries:

    RE   RUT emisor            TD   tipo DTE (39 boleta afecta, 41 exenta)
    F    folio                 FE   fecha emisión (YYYY-MM-DD)
    RR   RUT receptor          RSR  razón social receptor
    MNT  monto total (integer CLP, no decimals)   IT1  primer item

Boletas are CLP, and CLP has no minor units, so MNT maps directly to the
integer-minor-unit `total_amount`. The `<FRMT>` signature / CAF authenticity
check is a separate runtime/security concern (not required to parse the data).
"""

from decimal import Decimal, InvalidOperation

# Element is imported for typing only; parsing goes through defusedxml, which
# hardens against XXE / billion-laughs (the payload is untrusted — decoded from
# a scanned barcode).
from xml.etree.ElementTree import Element

from defusedxml import ElementTree as DefusedET  # type: ignore[import-untyped]

from app.schemas.scan import GeminiExtractionResult, LineItemExtraction

# Tipo DTE codes that are boletas (the only documents this shortcut accepts).
BOLETA_TIPO_DTE = frozenset({"39", "41"})

# A barcode payload is inherently tiny; reject anything larger as malformed.
_MAX_PAYLOAD_BYTES = 8192


class BoletaParseError(ValueError):
    """The payload is not a parseable boleta TED."""


def _text(node: Element | None, tag: str) -> str | None:
    if node is None:
        return None
    found = node.find(tag)
    if found is None or found.text is None:
        return None
    return found.text.strip()


def parse_ted_payload(payload: str) -> GeminiExtractionResult:
    """Parse a TED XML payload into a GeminiExtractionResult.

    Raises BoletaParseError for malformed XML, a non-boleta tipo DTE, or a
    missing/invalid required field (RE, FE, MNT).
    """
    if not payload or len(payload.encode("utf-8")) > _MAX_PAYLOAD_BYTES:
        raise BoletaParseError("empty or oversized TED payload")

    try:
        root = DefusedET.fromstring(payload)
    except Exception as exc:  # defusedxml raises on entity attacks too
        raise BoletaParseError(f"malformed TED XML: {exc}") from exc

    # The <DD> may be the root or nested under <TED>.
    dd = root if root.tag == "DD" else root.find("DD")
    if dd is None:
        raise BoletaParseError("TED payload missing <DD>")

    tipo = _text(dd, "TD")
    if tipo not in BOLETA_TIPO_DTE:
        raise BoletaParseError(f"tipo DTE {tipo!r} is not a boleta (expected 39/41)")

    rut_emisor = _text(dd, "RE")
    fecha = _text(dd, "FE")
    monto_raw = _text(dd, "MNT")
    if not rut_emisor or not fecha or monto_raw is None:
        raise BoletaParseError("TED payload missing required RE/FE/MNT")

    try:
        # MNT is integer CLP (no decimals) = integer minor units for CLP.
        monto = Decimal(monto_raw)
    except InvalidOperation as exc:
        raise BoletaParseError(f"invalid MNT {monto_raw!r}") from exc
    if monto < 0:
        raise BoletaParseError(f"negative MNT {monto_raw!r}")

    folio = _text(dd, "F")
    first_item = _text(dd, "IT1")
    # Merchant identity in a TED is the RUT emisor; the razón social is not in
    # the timbre. The folio disambiguates the document.
    merchant = f"RUT {rut_emisor}" + (f" · folio {folio}" if folio else "")

    line_items: list[LineItemExtraction] = []
    if first_item:
        line_items.append(LineItemExtraction(name=first_item, total_price=monto))

    return GeminiExtractionResult(
        merchant_name=merchant,
        transaction_date=fecha,
        currency_code="CLP",
        total_amount=monto,
        line_items=line_items,
        confidence_score=1.0,  # structured data, not inferred
    )
