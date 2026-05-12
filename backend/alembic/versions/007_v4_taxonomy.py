"""Add V4 item-category taxonomy: hierarchy columns + 86-category seed.

Revision ID: 007
Revises: 006
Create Date: 2026-05-07
"""

import json
import uuid

import sqlalchemy as sa

from alembic import op

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None

_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def _cid(key: str) -> str:
    return str(uuid.uuid5(_NS, f"gastify.v4.{key}"))


def _labels(es: str, en: str, pt: str) -> str:
    return json.dumps({"es": es, "en": en, "pt": pt}, ensure_ascii=False)


# fmt: off
_TAXONOMY: list[tuple[str, int, str | None, str, str, str, bool, int]] = [
    # (key, level, parent_key, es, en, pt, is_sensitive, sort_order)
    # ── L1 ──
    ("Alimentacion",    1, None, "Alimentación",    "Food & Groceries",  "Alimentação",       False, 1),
    ("Transporte",      1, None, "Transporte",      "Transport",         "Transporte",        False, 2),
    ("Hogar",           1, None, "Hogar",            "Housing",           "Moradia",           False, 3),
    ("Salud",           1, None, "Salud",            "Health",            "Saúde",             False, 4),
    ("Educacion",       1, None, "Educación",        "Education",         "Educação",          False, 5),
    ("Entretenimiento", 1, None, "Entretenimiento",  "Entertainment",     "Entretenimento",    False, 6),
    ("Vestimenta",      1, None, "Vestimenta",       "Clothing",          "Vestuário",         False, 7),
    ("Servicios",       1, None, "Servicios",        "Services",          "Serviços",          False, 8),
    ("Finanzas",        1, None, "Finanzas",         "Finance",           "Finanças",          True,  9),
    ("Tecnologia",      1, None, "Tecnología",       "Technology",        "Tecnologia",        False, 10),
    ("Mascotas",        1, None, "Mascotas",         "Pets",              "Animais",           False, 11),
    ("Otro",            1, None, "Otro",             "Other",             "Outro",             False, 12),

    # ── L2 under Alimentacion ──
    ("Supermercado",        2, "Alimentacion", "Supermercado",          "Supermarket",          "Supermercado",         False, 1),
    ("Restaurante",         2, "Alimentacion", "Restaurante",           "Restaurant",           "Restaurante",          False, 2),
    ("CafeteriaSnack",      2, "Alimentacion", "Cafetería y Snack",    "Café & Snacks",        "Cafeteria e Lanches",  False, 3),
    ("Delivery",            2, "Alimentacion", "Delivery",              "Delivery",             "Delivery",             False, 4),
    ("Panaderia",           2, "Alimentacion", "Panadería",             "Bakery",               "Padaria",              False, 5),
    ("Carniceria",          2, "Alimentacion", "Carnicería",            "Butcher",              "Açougue",              False, 6),
    ("Verduleria",          2, "Alimentacion", "Verdulería",            "Produce Market",       "Feira",                False, 7),
    ("Licoreria",           2, "Alimentacion", "Licorería",             "Liquor Store",         "Loja de Bebidas",      False, 8),
    ("BebidasAlcoholicas",  2, "Alimentacion", "Bebidas Alcohólicas",   "Alcoholic Beverages",  "Bebidas Alcoólicas",   False, 9),

    # ── L2 under Transporte ──
    ("Combustible",           2, "Transporte", "Combustible",             "Fuel",                  "Combustível",             False, 1),
    ("TransportePublico",     2, "Transporte", "Transporte Público",      "Public Transit",        "Transporte Público",      False, 2),
    ("TaxiApp",               2, "Transporte", "Taxi / App",              "Taxi / Ride-share",     "Táxi / App",              False, 3),
    ("Estacionamiento",       2, "Transporte", "Estacionamiento",         "Parking",               "Estacionamento",          False, 4),
    ("Peaje",                 2, "Transporte", "Peaje",                   "Toll",                  "Pedágio",                 False, 5),
    ("MantenimientoVehiculo", 2, "Transporte", "Mantención Vehículo",     "Vehicle Maintenance",   "Manutenção Veículo",      False, 6),
    ("SeguroVehiculo",        2, "Transporte", "Seguro Vehículo",         "Vehicle Insurance",     "Seguro Veículo",          False, 7),

    # ── L2 under Hogar ──
    ("Arriendo",        2, "Hogar", "Arriendo",           "Rent",              "Aluguel",           False, 1),
    ("ServiciosBasicos", 2, "Hogar", "Servicios Básicos", "Utilities",         "Serviços Básicos",  False, 2),
    ("Internet",        2, "Hogar", "Internet",           "Internet",          "Internet",          False, 3),
    ("Telefono",        2, "Hogar", "Teléfono",           "Phone",             "Telefone",          False, 4),
    ("Limpieza",        2, "Hogar", "Limpieza",           "Cleaning",          "Limpeza",           False, 5),
    ("Muebles",         2, "Hogar", "Muebles",            "Furniture",         "Móveis",            False, 6),
    ("ReparacionesHogar", 2, "Hogar", "Reparaciones",     "Home Repairs",      "Reparos",           False, 7),
    ("Jardineria",      2, "Hogar", "Jardinería",         "Gardening",         "Jardinagem",        False, 8),

    # ── L3 under ServiciosBasicos ──
    ("Electricidad", 3, "ServiciosBasicos", "Electricidad", "Electricity", "Eletricidade", False, 1),
    ("Agua",         3, "ServiciosBasicos", "Agua",         "Water",       "Água",         False, 2),
    ("GasHogar",     3, "ServiciosBasicos", "Gas",          "Gas",         "Gás",          False, 3),

    # ── L2 under Salud ──
    ("Farmacia",       2, "Salud", "Farmacia",          "Pharmacy",              "Farmácia",            True,  1),
    ("ConsultaMedica", 2, "Salud", "Consulta Médica",   "Medical Consultation",  "Consulta Médica",     True,  2),
    ("Dentista",       2, "Salud", "Dentista",          "Dentist",               "Dentista",            True,  3),
    ("Optica",         2, "Salud", "Óptica",            "Optician",              "Ótica",               False, 4),
    ("SeguroSalud",    2, "Salud", "Seguro de Salud",   "Health Insurance",      "Plano de Saúde",      True,  5),
    ("Laboratorio",    2, "Salud", "Laboratorio",       "Lab Tests",             "Laboratório",         True,  6),
    ("Gimnasio",       2, "Salud", "Gimnasio",          "Gym",                   "Academia",            False, 7),

    # ── L2 under Educacion ──
    ("Colegiatura", 2, "Educacion", "Colegiatura",       "School Tuition",    "Mensalidade",       False, 1),
    ("Utiles",      2, "Educacion", "Útiles Escolares",  "School Supplies",   "Material Escolar",  False, 2),
    ("Libros",      2, "Educacion", "Libros",            "Books",             "Livros",            False, 3),
    ("Cursos",      2, "Educacion", "Cursos",            "Courses",           "Cursos",            False, 4),

    # ── L2 under Entretenimiento ──
    ("Cine",             2, "Entretenimiento", "Cine",               "Cinema",            "Cinema",              False, 1),
    ("Musica",           2, "Entretenimiento", "Música",             "Music",             "Música",              False, 2),
    ("Deportes",         2, "Entretenimiento", "Deportes",           "Sports",            "Esportes",            False, 3),
    ("Viajes",           2, "Entretenimiento", "Viajes",             "Travel",            "Viagens",             False, 4),
    ("Suscripciones",    2, "Entretenimiento", "Suscripciones",      "Subscriptions",     "Assinaturas",         False, 5),
    ("JuegosHobbies",    2, "Entretenimiento", "Juegos y Hobbies",   "Games & Hobbies",   "Jogos e Hobbies",     False, 6),
    ("EventosSociales",  2, "Entretenimiento", "Eventos Sociales",   "Social Events",     "Eventos Sociais",     False, 7),
    ("ArtesCultura",     2, "Entretenimiento", "Artes y Cultura",    "Arts & Culture",    "Artes e Cultura",     False, 8),

    # ── L3 under Viajes ──
    ("Alojamiento", 3, "Viajes", "Alojamiento", "Accommodation", "Hospedagem", False, 1),
    ("Pasajes",     3, "Viajes", "Pasajes",     "Tickets",        "Passagens",  False, 2),

    # ── L2 under Vestimenta ──
    ("Ropa",              2, "Vestimenta", "Ropa",            "Clothes",       "Roupas",        False, 1),
    ("Calzado",           2, "Vestimenta", "Calzado",         "Footwear",      "Calçados",      False, 2),
    ("AccesoriosModa",    2, "Vestimenta", "Accesorios",      "Accessories",   "Acessórios",    False, 3),
    ("Tintoreria",        2, "Vestimenta", "Tintorería",      "Dry Cleaning",  "Lavanderia",    False, 4),

    # ── L2 under Servicios ──
    ("Peluqueria",              2, "Servicios", "Peluquería",              "Hair Salon",             "Salão de Beleza",         False, 1),
    ("Lavanderia",              2, "Servicios", "Lavandería",              "Laundry",                "Lavanderia",              False, 2),
    ("ServiciosProfesionales",  2, "Servicios", "Servicios Profesionales", "Professional Services",  "Serviços Profissionais",  False, 3),
    ("Correo",                  2, "Servicios", "Correo / Courier",        "Post / Courier",         "Correio / Courier",       False, 4),
    ("Notaria",                 2, "Servicios", "Notaría",                 "Notary",                 "Cartório",                False, 5),

    # ── L2 under Finanzas ──
    ("Seguros",             2, "Finanzas", "Seguros",              "Insurance",     "Seguros",               True,  1),
    ("ComisionesBancarias", 2, "Finanzas", "Comisiones Bancarias", "Bank Fees",     "Taxas Bancárias",       True,  2),
    ("Impuestos",           2, "Finanzas", "Impuestos",            "Taxes",         "Impostos",              True,  3),
    ("Inversiones",         2, "Finanzas", "Inversiones",          "Investments",   "Investimentos",         True,  4),
    ("Prestamos",           2, "Finanzas", "Préstamos",            "Loans",         "Empréstimos",           True,  5),
    ("Multas",              2, "Finanzas", "Multas",               "Fines",         "Multas",                True,  6),

    # ── L2 under Tecnologia ──
    ("Electronica",      2, "Tecnologia", "Electrónica",            "Electronics",       "Eletrônicos",          False, 1),
    ("Software",         2, "Tecnologia", "Software",               "Software",          "Software",             False, 2),
    ("AccesoriosTech",   2, "Tecnologia", "Accesorios Tech",        "Tech Accessories",  "Acessórios Tech",      False, 3),
    ("ReparacionesTech", 2, "Tecnologia", "Reparaciones Tech",      "Tech Repairs",      "Reparos Tech",         False, 4),

    # ── L2 under Mascotas ──
    ("AlimentoMascota",   2, "Mascotas", "Alimento Mascota",    "Pet Food",          "Ração",                False, 1),
    ("Veterinario",       2, "Mascotas", "Veterinario",         "Vet",               "Veterinário",          False, 2),
    ("AccesoriosMascota", 2, "Mascotas", "Accesorios Mascota",  "Pet Accessories",   "Acessórios Pet",       False, 3),

    # ── L2 under Otro ──
    ("Regalos",          2, "Otro", "Regalos",           "Gifts",           "Presentes",         False, 1),
    ("Donaciones",       2, "Otro", "Donaciones",        "Donations",       "Doações",           False, 2),
    ("CuidadoPersonal",  2, "Otro", "Cuidado Personal",  "Personal Care",   "Cuidado Pessoal",   False, 3),
    ("Miscelaneo",       2, "Otro", "Misceláneo",        "Miscellaneous",   "Diversos",          False, 4),
]
# fmt: on


def upgrade() -> None:
    op.add_column("item_categories", sa.Column("level", sa.SmallInteger(), nullable=True))
    op.add_column("item_categories", sa.Column("parent_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_item_categories_parent_id",
        "item_categories",
        "item_categories",
        ["parent_id"],
        ["id"],
    )

    op.execute(sa.text("UPDATE item_categories SET level = 1 WHERE level IS NULL"))
    op.alter_column("item_categories", "level", nullable=False, server_default="1")

    conn = op.get_bind()
    for key, level, parent_key, es, en, pt, is_sensitive, sort_order in _TAXONOMY:
        cat_id = _cid(key)
        parent_id = _cid(parent_key) if parent_key else None
        labels = _labels(es, en, pt)
        conn.execute(
            sa.text(
                "INSERT INTO item_categories"
                " (id, key, level, parent_id, display_labels, is_sensitive, sort_order)"
                " VALUES (:id, :key, :level, :parent_id, :labels::json, :sensitive, :sort)"
            ),
            {
                "id": cat_id,
                "key": key,
                "level": level,
                "parent_id": parent_id,
                "labels": labels,
                "sensitive": is_sensitive,
                "sort": sort_order,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    for key, *_ in reversed(_TAXONOMY):
        conn.execute(
            sa.text("DELETE FROM item_categories WHERE key = :key"),
            {"key": key},
        )

    op.drop_constraint("fk_item_categories_parent_id", "item_categories", type_="foreignkey")
    op.drop_column("item_categories", "parent_id")
    op.drop_column("item_categories", "level")
