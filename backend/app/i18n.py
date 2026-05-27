"""i18n string registry — es/en/pt translations for API responses.

Simple dict-based registry. Keyed by (locale, key) → string.
Frontend has its own i18n; this covers server-generated messages only.
"""

from typing import Literal

Locale = Literal["es", "en", "pt"]

_DEFAULT_LOCALE: Locale = "es"

_STRINGS: dict[str, dict[Locale, str]] = {
    "transaction.not_found": {
        "es": "Transacción no encontrada",
        "en": "Transaction not found",
        "pt": "Transação não encontrada",
    },
    "transaction.invalid_ref": {
        "es": "Datos de referencia inválidos — verifique moneda y categorías",
        "en": "Invalid reference data — check currency code and category IDs",
        "pt": "Dados de referência inválidos — verifique moeda e categorias",
    },
    "transaction.fx_unavailable": {
        "es": "Tipo de cambio no disponible — intente de nuevo más tarde",
        "en": "Exchange rate unavailable — please retry later",
        "pt": "Taxa de câmbio indisponível — tente novamente mais tarde",
    },
    "auth.unauthorized": {
        "es": "No autorizado",
        "en": "Unauthorized",
        "pt": "Não autorizado",
    },
    "auth.token_expired": {
        "es": "Token expirado — inicie sesión nuevamente",
        "en": "Token expired — please sign in again",
        "pt": "Token expirado — faça login novamente",
    },
    "credit.insufficient": {
        "es": "Créditos de escaneo insuficientes",
        "en": "Insufficient scan credits",
        "pt": "Créditos de digitalização insuficientes",
    },
    "error.internal": {
        "es": "Error interno del servidor",
        "en": "Internal server error",
        "pt": "Erro interno do servidor",
    },
    "error.validation": {
        "es": "Error de validación",
        "en": "Validation error",
        "pt": "Erro de validação",
    },
}


def t(key: str, locale: Locale | str = _DEFAULT_LOCALE) -> str:
    """Look up a translated string. Falls back to default locale, then key itself."""
    entry = _STRINGS.get(key)
    if entry is None:
        return key
    if locale in entry:
        return entry[locale]
    return entry.get(_DEFAULT_LOCALE, key)


def available_keys() -> list[str]:
    return list(_STRINGS.keys())
