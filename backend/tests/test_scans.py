"""Tests for scan submission endpoint and image compression service."""

import io
import uuid
from unittest.mock import patch

import pytest
from PIL import Image

from app.services.image import (
    MAX_HEIGHT,
    MAX_WIDTH,
    THUMB_HEIGHT,
    THUMB_WIDTH,
    compress_receipt_image,
)


def _make_test_jpeg(width: int = 800, height: int = 600, color: str = "red") -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def _make_test_png_rgba(width: int = 400, height: int = 300) -> bytes:
    img = Image.new("RGBA", (width, height), color=(255, 0, 0, 128))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestImageCompression:
    def test_small_image_not_upscaled(self):
        raw = _make_test_jpeg(200, 300)
        result = compress_receipt_image(raw)
        assert result.main.width == 200
        assert result.main.height == 300

    def test_large_image_resized_to_fit(self):
        raw = _make_test_jpeg(3000, 4000)
        result = compress_receipt_image(raw)
        assert result.main.width <= MAX_WIDTH
        assert result.main.height <= MAX_HEIGHT

    def test_thumbnail_dimensions(self):
        raw = _make_test_jpeg(1600, 2000)
        result = compress_receipt_image(raw)
        assert result.thumbnail.width <= THUMB_WIDTH
        assert result.thumbnail.height <= THUMB_HEIGHT

    def test_rgba_png_converts_to_rgb_jpeg(self):
        raw = _make_test_png_rgba()
        result = compress_receipt_image(raw)
        assert result.main.content_type == "image/jpeg"
        img = Image.open(io.BytesIO(result.main.data))
        assert img.mode == "RGB"

    def test_compressed_size_smaller(self):
        raw = _make_test_jpeg(2400, 3200)
        result = compress_receipt_image(raw)
        assert len(result.main.data) < len(raw)

    def test_aspect_ratio_preserved(self):
        raw = _make_test_jpeg(2400, 1600)
        result = compress_receipt_image(raw)
        original_ratio = 2400 / 1600
        result_ratio = result.main.width / result.main.height
        assert abs(original_ratio - result_ratio) < 0.01


class TestScanEndpoint:
    @pytest.mark.asyncio
    async def test_submit_valid_jpeg(self, client, tmp_path):
        with patch("app.api.scans.settings") as mock_settings:
            mock_settings.scan_storage_dir = str(tmp_path)
            raw = _make_test_jpeg(800, 600)
            response = await client.post(
                "/api/v1/scans",
                files={"file": ("receipt.jpg", raw, "image/jpeg")},
            )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["status"] == "submitted"
        assert data["original_filename"] == "receipt.jpg"
        assert data["content_type"] == "image/jpeg"
        assert data["file_size_bytes"] == len(raw)

    @pytest.mark.asyncio
    async def test_submit_png_accepted(self, client, tmp_path):
        with patch("app.api.scans.settings") as mock_settings:
            mock_settings.scan_storage_dir = str(tmp_path)
            raw = _make_test_png_rgba()
            response = await client.post(
                "/api/v1/scans",
                files={"file": ("receipt.png", raw, "image/png")},
            )

        assert response.status_code == 201
        assert response.json()["content_type"] == "image/jpeg"

    @pytest.mark.asyncio
    async def test_reject_unsupported_content_type(self, client):
        response = await client.post(
            "/api/v1/scans",
            files={"file": ("doc.pdf", b"fake-pdf", "application/pdf")},
        )
        assert response.status_code == 422
        assert "Unsupported image type" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_reject_empty_file(self, client):
        response = await client.post(
            "/api/v1/scans",
            files={"file": ("empty.jpg", b"", "image/jpeg")},
        )
        assert response.status_code == 422
        assert "Empty file" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_reject_oversized_file(self, client):
        with patch("app.api.scans.MAX_FILE_SIZE", 100):
            raw = _make_test_jpeg(200, 200)
            response = await client.post(
                "/api/v1/scans",
                files={"file": ("big.jpg", raw, "image/jpeg")},
            )
        assert response.status_code == 413

    @pytest.mark.asyncio
    async def test_files_written_to_disk(self, client, tmp_path):
        with patch("app.api.scans.settings") as mock_settings:
            mock_settings.scan_storage_dir = str(tmp_path)
            raw = _make_test_jpeg(1600, 2000)
            response = await client.post(
                "/api/v1/scans",
                files={"file": ("photo.jpg", raw, "image/jpeg")},
            )

        assert response.status_code == 201
        data = response.json()
        scan_id = data["id"]

        scan_dirs = list(tmp_path.rglob(scan_id))
        assert len(scan_dirs) == 1
        scan_dir = scan_dirs[0]
        assert (scan_dir / "receipt.jpg").exists()
        assert (scan_dir / "thumb.jpg").exists()

    @pytest.mark.asyncio
    async def test_scan_id_is_valid_uuid(self, client, tmp_path):
        with patch("app.api.scans.settings") as mock_settings:
            mock_settings.scan_storage_dir = str(tmp_path)
            raw = _make_test_jpeg()
            response = await client.post(
                "/api/v1/scans",
                files={"file": ("test.jpg", raw, "image/jpeg")},
            )

        scan_id = response.json()["id"]
        uuid.UUID(scan_id)
