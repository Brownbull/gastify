/**
 * Input Sanitization Utilities
 *
 * Story 14.15: Scan Flow Integration - Security Enhancement
 *
 * Provides functions to sanitize user input before storing in Firestore.
 * Protects against XSS, injection attacks, and ensures data integrity.
 */

/**
 * Characters that could be used for script injection or special formatting
 * Note: Using simpler patterns to avoid ReDoS (catastrophic backtracking)
 */
const DANGEROUS_PATTERNS = [
  /<script[\s\S]*?<\/script>/gi, // Script tags with content (non-greedy match)
  /<\/?script[^>]*>/gi, // Orphaned opening/closing script tags (reconstruction defense)
  /<[^>]*on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
  /javascript:/gi, // JavaScript protocol
  /data:\s*(\w+\/\w+|[;,])/gi, // Data URIs: MIME types (data:text/html) + MIME-less (data:, data:;base64)
  /vbscript:/gi, // VBScript protocol
  /livescript:/gi, // LiveScript protocol (legacy browsers)
  /mocha:/gi, // Mocha protocol (legacy Netscape)
  /expression\s*\(/gi, // CSS expression() (IE6-IE8)
  /-moz-binding\s*:/gi, // CSS -moz-binding (legacy Firefox)
];

/**
 * Control characters that should be removed (except newlines and tabs in some contexts)
 */
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Maximum sanitization passes to prevent infinite loops in multi-pass removal.
 * Set to 100 per security review (deep nesting vectors may require many passes).
 */
const MAX_SANITIZE_PASSES = 100;

/**
 * Sanitizes a text input string for safe storage and display.
 *
 * Defense-in-depth layers (Story 15-TD-19):
 * 0. Pre-truncates oversized input (maxLength * 10) before regex processing
 * 1. URL-decodes to catch percent-encoded bypass vectors
 * 2. Removes control characters (before patterns — prevents \x00 splitting attacks)
 * 3. Multi-pass dangerous pattern removal (loops until stable)
 * 4. Handles newlines/tabs based on options
 * 5. Normalizes whitespace
 * 6. Trims
 * 7. Limits string length
 *
 * @param input - The raw user input string
 * @param options - Configuration options
 * @returns The sanitized string
 *
 * @example
 * sanitizeInput('  Hello World  ') // "Hello World"
 * sanitizeInput('<script>alert("xss")</script>Test') // "Test"
 */
export function sanitizeInput(
  input: string | null | undefined,
  options: {
    /** Maximum allowed length (default: 1000) */
    maxLength?: number;
    /** Allow newlines in the text (default: false) */
    allowNewlines?: boolean;
    /** Allow tabs in the text (default: false) */
    allowTabs?: boolean;
  } = {}
): string {
  const { maxLength = 1000, allowNewlines = false, allowTabs = false } = options;
  const safeMaxLength = (Number.isFinite(maxLength) && maxLength > 0) ? maxLength : 1000;

  // Handle null/undefined
  if (input == null) return '';

  let result = String(input);

  // 0. Pre-truncate to limit regex processing on oversized inputs (defense-in-depth)
  const preTruncateLimit = safeMaxLength * 10;
  if (result.length > preTruncateLimit) {
    result = result.substring(0, preTruncateLimit);
  }

  // 1. URL-decode to catch percent-encoded bypass vectors (defense-in-depth)
  // Loop until stable to handle arbitrary encoding depth (%25252F → %252F → %2F → /)
  for (let i = 0; i < 5; i++) {
    try {
      const decoded = decodeURIComponent(result);
      if (decoded === result) break;
      result = decoded;
    } catch {
      break;
    }
  }

  // 2. Remove control characters BEFORE pattern matching (defense-in-depth)
  // Must happen after URL-decode (catches %00 → \x00) but before patterns
  // (prevents control chars from splitting patterns like java\x00script:)
  result = result.replace(CONTROL_CHAR_REGEX, '');

  // 3. Remove dangerous patterns — multi-pass until stable (defense-in-depth)
  for (let pass = 0; pass < MAX_SANITIZE_PASSES; pass++) {
    const beforePass = result;
    for (const pattern of DANGEROUS_PATTERNS) {
      result = result.replace(pattern, '');
    }
    if (result === beforePass) break;
  }

  // 4. Handle newlines and tabs based on options
  if (!allowNewlines) {
    result = result.replace(/[\r\n]/g, ' ');
  }
  if (!allowTabs) {
    result = result.replace(/\t/g, ' ');
  }

  // 5. Normalize multiple spaces to single space
  result = result.replace(/\s+/g, ' ');

  // 6. Trim whitespace
  result = result.trim();

  // 7. Limit length to prevent DoS
  if (result.length > safeMaxLength) {
    result = result.substring(0, safeMaxLength);
  }

  return result;
}

/**
 * Sanitizes a merchant name with appropriate settings.
 *
 * Storage-layer limit: 200 chars. Merchant names originate from user input or AI
 * receipt extraction. The 200-char limit matches the Firestore validation rule
 * added in TD-15b-9 (`hasValidFieldBounds`, renamed from `isValidTransactionWrite` in TD-15b-13).
 *
 * @param name - The merchant name from user input or AI extraction
 * @returns Sanitized merchant name
 */
export function sanitizeMerchantName(name: string | null | undefined): string {
  return sanitizeInput(name, { maxLength: 200 });
}

/**
 * Sanitizes an item name with appropriate settings.
 *
 * Storage-layer limit: 200 chars (permits AI-extracted names which may be longer than the UI limit).
 *
 * Two-layer maxLength design (intentional, not a bug):
 * - Storage layer (this helper, maxLength 200): used when saving to Firestore
 *   (TransactionEditorViewInternal.tsx) and in mapping services. AI receipt scans can
 *   produce item names up to ~150 chars; 200 provides headroom.
 * - UI edit layer (EditViewItemsSection.tsx): inline sanitizeInput(100) — stricter
 *   display/edit constraint that prevents overly long names in the UI input field.
 *
 * Firestore stores up to 200 chars; the UI editing surface limits new user input to 100 chars.
 *
 * @param name - The item name from user input or AI extraction
 * @returns Sanitized item name
 */
export function sanitizeItemName(name: string | null | undefined): string {
  return sanitizeInput(name, { maxLength: 200 });
}

/**
 * Sanitizes a location (city/country) name.
 *
 * @param location - The location string from user input
 * @returns Sanitized location string
 */
export function sanitizeLocation(location: string | null | undefined): string {
  return sanitizeInput(location, { maxLength: 100 });
}

/**
 * Sanitizes a subcategory string.
 *
 * Storage-layer limit: 100 chars (permits AI-extracted subcategories which may exceed the UI limit).
 *
 * Two-layer maxLength design (intentional, not a bug):
 * - Storage layer (this helper, maxLength 100): used when saving to Firestore
 *   (TransactionEditorViewInternal.tsx) and in mapping services.
 * - UI edit layer (EditViewItemsSection.tsx): inline sanitizeInput(50) — stricter
 *   display/edit constraint for the subcategory input field.
 *
 * Firestore stores up to 100 chars; the UI editing surface limits new user input to 50 chars.
 *
 * @param subcategory - The subcategory from user input or AI extraction
 * @returns Sanitized subcategory string
 */
export function sanitizeSubcategory(subcategory: string | null | undefined): string {
  return sanitizeInput(subcategory, { maxLength: 100 });
}

/**
 * Validates and sanitizes a numeric string input.
 * Returns the sanitized string or empty string if invalid.
 *
 * @param value - The numeric string from user input
 * @returns Sanitized numeric string
 */
export function sanitizeNumericInput(value: string | null | undefined): string {
  if (value == null) return '';

  // Pre-truncate to prevent processing excessively long inputs (defense-in-depth).
  // 30 chars is sufficient for any realistic numeric value (e.g., "-123456789.123456").
  const MAX_NUMERIC_LENGTH = 30;
  const raw = String(value).substring(0, MAX_NUMERIC_LENGTH);

  // Remove anything that's not a digit, decimal point, or minus sign
  const cleaned = raw.replace(/[^\d.-]/g, '');

  // Ensure only one decimal point and one minus at the start
  const parts = cleaned.split('.');
  let result = parts[0];
  if (parts.length > 1) {
    result += '.' + parts.slice(1).join('');
  }

  // Ensure minus is only at the start
  if (result.includes('-')) {
    const isNegative = result.startsWith('-');
    result = result.replace(/-/g, '');
    if (isNegative) {
      result = '-' + result;
    }
  }

  return result;
}
