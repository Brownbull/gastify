"""SQLAlchemy models — import all to register with Base.metadata."""

from app.models.consent import AuditEvent, ConsentRecord, ProcessingRegister
from app.models.credit import CreditBalance
from app.models.fx import FxRate
from app.models.mapping import CategoryMapping, MerchantMapping
from app.models.reference import Currency, ItemCategory, StoreCategory
from app.models.scan import Scan, ScanStatus
from app.models.statement import (
    CardAlias,
    ReconciliationRunStatus,
    ReconciliationVerdict,
    Statement,
    StatementLine,
    StatementLineType,
    StatementReconciliationRun,
    StatementReconciliationVerdict,
    StatementStatus,
)
from app.models.transaction import (
    Transaction,
    TransactionImage,
    TransactionItem,
    TransactionItemFlag,
)
from app.models.user import MobilePushToken, OwnershipScope, OwnershipScopeMember, User

__all__ = [
    "AuditEvent",
    "CardAlias",
    "CategoryMapping",
    "ConsentRecord",
    "CreditBalance",
    "Currency",
    "FxRate",
    "ItemCategory",
    "MerchantMapping",
    "MobilePushToken",
    "OwnershipScope",
    "OwnershipScopeMember",
    "ProcessingRegister",
    "ReconciliationRunStatus",
    "ReconciliationVerdict",
    "Scan",
    "ScanStatus",
    "Statement",
    "StatementLine",
    "StatementLineType",
    "StatementReconciliationRun",
    "StatementReconciliationVerdict",
    "StatementStatus",
    "StoreCategory",
    "Transaction",
    "TransactionImage",
    "TransactionItem",
    "TransactionItemFlag",
    "User",
]
