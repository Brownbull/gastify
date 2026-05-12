"""SQLAlchemy models — import all to register with Base.metadata."""

from app.models.consent import AuditEvent, ConsentRecord, ProcessingRegister
from app.models.credit import CreditBalance
from app.models.fx import FxRate
from app.models.mapping import CategoryMapping, MerchantMapping
from app.models.reference import Currency, ItemCategory, StoreCategory
from app.models.scan import Scan, ScanStatus
from app.models.transaction import Transaction, TransactionImage, TransactionItem
from app.models.user import OwnershipScope, OwnershipScopeMember, User

__all__ = [
    "AuditEvent",
    "CategoryMapping",
    "ConsentRecord",
    "CreditBalance",
    "Currency",
    "FxRate",
    "ItemCategory",
    "MerchantMapping",
    "OwnershipScope",
    "OwnershipScopeMember",
    "ProcessingRegister",
    "Scan",
    "ScanStatus",
    "StoreCategory",
    "Transaction",
    "TransactionImage",
    "TransactionItem",
    "User",
]
