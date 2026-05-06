# Upload Security Runbook

Referenced by A.17 §2. Defenses for receipt and statement file uploads.

## Magic-Byte Validation

Never trust `Content-Type`. Use libmagic to validate file type from magic bytes.

**Allowed types:**
- `image/jpeg` (JPEG receipts)
- `image/png` (PNG receipts)
- `image/heic` (HEIC receipts from iOS)
- `application/pdf` (PDF receipts and statements)

**Rejected types:**
- `image/svg+xml` (XSS surface — always reject)
- All other MIME types

## Size Limits

| Upload Type | Max Size |
|------------|----------|
| Receipt image (JPEG/PNG/HEIC) | 10 MB |
| Receipt PDF (single-page) | 5 MB |
| Statement PDF | 25 MB |

## Filename Handling

Server-issued opaque identifier (UUID) replaces original filename. Original filename is NEVER echoed to the client or stored in user-accessible fields.

## PDF Sandboxing

PDF parsing runs in a sandboxed worker (seccomp-bpf or equivalent). CVE-watch on the PDF library (poppler / pdfminer / pdfplumber) feeds the SCA pipeline at A.18.

## Implementation Status

- [ ] libmagic validation middleware
- [ ] Size-limit enforcement per upload type
- [ ] Opaque filename generation
- [ ] PDF sandboxed worker setup
- [ ] CVE-watch integration with SCA pipeline
