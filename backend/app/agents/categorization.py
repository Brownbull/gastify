"""PydanticAI text-only categorization agent — Stage 2 of the scan pipeline.

Receives extracted line items as text (never the raw image — two-stage prompt
injection defense per D30). Maps each item to a V4 taxonomy category key.

Port of BoletApp categorization logic; text-only model is cheaper than vision
(V3 value: Route by Cost).
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import structlog
from pydantic_ai import Agent

from app.config import settings
from app.schemas.scan import CategorizationResult, LineItemExtraction

logger = structlog.get_logger()

V4_TAXONOMY_PROMPT = """\
CATEGORY TAXONOMY (V4 — 86 categories, PascalCase keys):

L1 Alimentacion:
  L2: Supermercado, Restaurante, CafeteriaSnack, Delivery, Panaderia, \
Carniceria, Verduleria, Licoreria, BebidasAlcoholicas
L1 Transporte:
  L2: Combustible, TransportePublico, TaxiApp, Estacionamiento, Peaje, \
MantenimientoVehiculo, SeguroVehiculo
L1 Hogar:
  L2: Arriendo, ServiciosBasicos, Internet, Telefono, Limpieza, Muebles, \
ReparacionesHogar, Jardineria
  L3 under ServiciosBasicos: Electricidad, Agua, GasHogar
L1 Salud:
  L2: Farmacia, ConsultaMedica, Dentista, Optica, SeguroSalud, Laboratorio, \
Gimnasio
L1 Educacion:
  L2: Colegiatura, Utiles, Libros, Cursos
L1 Entretenimiento:
  L2: Cine, Musica, Deportes, Viajes, Suscripciones, JuegosHobbies, \
EventosSociales, ArtesCultura
  L3 under Viajes: Alojamiento, Pasajes
L1 Vestimenta:
  L2: Ropa, Calzado, AccesoriosModa, Tintoreria
L1 Servicios:
  L2: Peluqueria, Lavanderia, ServiciosProfesionales, Correo, Notaria
L1 Finanzas:
  L2: Seguros, ComisionesBancarias, Impuestos, Inversiones, Prestamos, Multas
L1 Tecnologia:
  L2: Electronica, Software, AccesoriosTech, ReparacionesTech
L1 Mascotas:
  L2: AlimentoMascota, Veterinario, AccesoriosMascota
L1 Otro:
  L2: Regalos, Donaciones, CuidadoPersonal, Miscelaneo"""

CATEGORIZATION_SYSTEM_PROMPT = f"""\
You are an item categorization system for a personal expense tracker.
You receive a list of line items extracted from a receipt and must assign \
each item to the most specific matching category from the V4 taxonomy.

{V4_TAXONOMY_PROMPT}

RULES:
1. Assign the MOST SPECIFIC category available (prefer L3/L2 over L1)
2. Use EXACT PascalCase category keys from the taxonomy above
3. If no specific category fits, use the parent L1 category
4. If truly uncategorizable, use "Miscelaneo"
5. confidence = your confidence in the assignment (0.0 to 1.0)
6. Each item MUST get exactly one category assignment
7. line_item_index is 0-based, matching the order of items provided"""


@dataclass(frozen=True)
class CategorizationUsage:
    input_tokens: int
    output_tokens: int
    latency_ms: float


@dataclass(frozen=True)
class CategorizationOutput:
    result: CategorizationResult
    usage: CategorizationUsage


def _build_agent(model: str | None = None) -> Agent[None, CategorizationResult]:
    model_name = model or f"google-gla:{settings.gemini_model}"
    return Agent(
        model_name,
        output_type=CategorizationResult,
        system_prompt=CATEGORIZATION_SYSTEM_PROMPT,
        retries=2,
    )


def _format_items_for_prompt(items: list[LineItemExtraction]) -> str:
    lines = []
    for i, item in enumerate(items):
        qty_str = f" x{item.qty}" if item.qty and item.qty > 1 else ""
        lines.append(f"  [{i}] {item.name}{qty_str} — {item.total_price}")
    return "\n".join(lines)


async def categorize_items(
    items: list[LineItemExtraction],
    merchant_name: str,
    currency_code: str,
    model: str | None = None,
) -> CategorizationOutput:
    """Run text-only categorization on extracted line items.

    Takes text data only — never raw image bytes (two-stage defense).
    """
    agent = _build_agent(model)
    log = logger.bind(merchant=merchant_name, item_count=len(items))

    prompt = (
        f"Merchant: {merchant_name}\n"
        f"Currency: {currency_code}\n"
        f"Items:\n{_format_items_for_prompt(items)}\n\n"
        "Categorize each item using the V4 taxonomy."
    )

    start = time.monotonic()
    result = await agent.run(prompt)
    elapsed_ms = (time.monotonic() - start) * 1000

    usage = CategorizationUsage(
        input_tokens=result.usage.input_tokens,
        output_tokens=result.usage.output_tokens,
        latency_ms=round(elapsed_ms, 1),
    )

    log.info(
        "categorization_complete",
        assignments=len(result.output.assignments),
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        latency_ms=usage.latency_ms,
    )

    return CategorizationOutput(result=result.output, usage=usage)
