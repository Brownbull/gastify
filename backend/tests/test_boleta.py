"""Tests for the SII boleta TED payload parser."""

from decimal import Decimal

import pytest

from app.services.boleta import BoletaParseError, parse_ted_payload

_VALID_BOLETA = (
    '<TED version="1.0"><DD>'
    "<RE>76192083-9</RE><TD>39</TD><F>1234</F>"
    "<FE>2026-05-15</FE><RR>66666666-6</RR><RSR>Consumidor Final</RSR>"
    "<MNT>15990</MNT><IT1>Almuerzo ejecutivo</IT1>"
    "<TSTED>2026-05-15T12:00:00</TSTED>"
    "</DD>"
    '<FRMT algoritmo="SHA1withRSA">c2lnbmF0dXJl</FRMT></TED>'
)


def test_parses_valid_boleta():
    result = parse_ted_payload(_VALID_BOLETA)
    assert result.currency_code == "CLP"
    assert result.total_amount == Decimal("15990")
    assert result.transaction_date == "2026-05-15"
    assert "76192083-9" in result.merchant_name
    assert "folio 1234" in result.merchant_name
    assert result.confidence_score == 1.0
    assert len(result.line_items) == 1
    assert result.line_items[0].name == "Almuerzo ejecutivo"
    assert result.line_items[0].total_price == Decimal("15990")


def test_parses_boleta_exenta_td_41_without_item():
    payload = "<DD><RE>77000000-1</RE><TD>41</TD><F>9</F><FE>2026-05-01</FE><MNT>3000</MNT></DD>"
    result = parse_ted_payload(payload)
    assert result.total_amount == Decimal("3000")
    assert result.line_items == []


def test_rejects_non_boleta_tipo_dte():
    # TD 33 = factura electrónica, not a boleta
    payload = "<DD><RE>76192083-9</RE><TD>33</TD><F>1</F><FE>2026-05-15</FE><MNT>100</MNT></DD>"
    with pytest.raises(BoletaParseError, match="not a boleta"):
        parse_ted_payload(payload)


def test_rejects_malformed_xml():
    with pytest.raises(BoletaParseError, match="malformed"):
        parse_ted_payload("<DD><RE>76192083-9</RE><TD>39</TD")


def test_rejects_missing_required_fields():
    payload = "<DD><RE>76192083-9</RE><TD>39</TD><F>1</F></DD>"  # no FE/MNT
    with pytest.raises(BoletaParseError, match="missing required"):
        parse_ted_payload(payload)


def test_rejects_invalid_mnt():
    payload = "<DD><RE>76192083-9</RE><TD>39</TD><FE>2026-05-15</FE><MNT>abc</MNT></DD>"
    with pytest.raises(BoletaParseError, match="invalid MNT"):
        parse_ted_payload(payload)


def test_rejects_negative_mnt():
    payload = "<DD><RE>76192083-9</RE><TD>39</TD><FE>2026-05-15</FE><MNT>-5</MNT></DD>"
    with pytest.raises(BoletaParseError, match="negative MNT"):
        parse_ted_payload(payload)


def test_rejects_oversized_payload():
    payload = "<DD>" + "<X>" * 5000 + "</DD>"
    with pytest.raises(BoletaParseError, match="oversized"):
        parse_ted_payload(payload)


def test_rejects_missing_dd():
    with pytest.raises(BoletaParseError, match="missing <DD>"):
        parse_ted_payload('<TED version="1.0"><FRMT>x</FRMT></TED>')
