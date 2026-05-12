"""Image compression service — Pillow-based resize, EXIF strip, auto-rotate.

Ported from BoletApp `functions/src/imageProcessing.ts` (sharp/MozJPEG → Pillow).
Parameters: main 1200x1600 JPEG 80%, thumbnail 120x160 JPEG 70%.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

import structlog
from PIL import Image, ImageOps

logger = structlog.get_logger()

MAX_WIDTH = 1200
MAX_HEIGHT = 1600
JPEG_QUALITY = 80

THUMB_WIDTH = 120
THUMB_HEIGHT = 160
THUMB_QUALITY = 70


@dataclass(frozen=True)
class CompressedImage:
    data: bytes
    width: int
    height: int
    content_type: str


@dataclass(frozen=True)
class CompressionResult:
    main: CompressedImage
    thumbnail: CompressedImage


def compress_receipt_image(raw_bytes: bytes) -> CompressionResult:
    """Compress a receipt image: auto-rotate, resize, strip EXIF, produce thumbnail."""
    img: Image.Image = Image.open(io.BytesIO(raw_bytes))

    transposed = ImageOps.exif_transpose(img)
    if transposed is not None:
        img = transposed

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    main_img = _fit_within(img, MAX_WIDTH, MAX_HEIGHT)
    main_bytes = _to_jpeg(main_img, JPEG_QUALITY)

    thumb_img = _fit_within(img, THUMB_WIDTH, THUMB_HEIGHT)
    thumb_bytes = _to_jpeg(thumb_img, THUMB_QUALITY)

    logger.info(
        "image_compressed",
        original_size=len(raw_bytes),
        main_size=len(main_bytes),
        thumb_size=len(thumb_bytes),
        main_dims=f"{main_img.width}x{main_img.height}",
        thumb_dims=f"{thumb_img.width}x{thumb_img.height}",
    )

    return CompressionResult(
        main=CompressedImage(
            data=main_bytes,
            width=main_img.width,
            height=main_img.height,
            content_type="image/jpeg",
        ),
        thumbnail=CompressedImage(
            data=thumb_bytes,
            width=thumb_img.width,
            height=thumb_img.height,
            content_type="image/jpeg",
        ),
    )


def _fit_within(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    """Resize to fit within max dimensions, preserving aspect ratio. Never upscale."""
    w, h = img.size
    if w <= max_w and h <= max_h:
        return img.copy()

    ratio = min(max_w / w, max_h / h)
    new_w = int(w * ratio)
    new_h = int(h * ratio)
    return img.resize((new_w, new_h), Image.Resampling.LANCZOS)


def _to_jpeg(img: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()
