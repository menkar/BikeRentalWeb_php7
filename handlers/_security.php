<?php
/**
 * _security.php — Centralised HTTP security headers and input-guard helpers.
 *
 * Single Responsibility: one file owns all security-header logic so that
 * every handler stays consistent without repeating the same header calls.
 * Adding a new header (e.g. Permissions-Policy) requires a change in one
 * place only.
 *
 * Call `apply_security_headers()` as the very first thing in each handler,
 * before any output is written.
 *
 * Headers applied:
 *  - Content-Type: application/json          — prevents MIME sniffing attacks
 *  - X-Content-Type-Options: nosniff         — enforces declared MIME type
 *  - X-Frame-Options: DENY                   — blocks clickjacking via iframes
 *  - X-XSS-Protection: 1; mode=block         — legacy XSS filter (old browsers)
 *  - Referrer-Policy: strict-origin-when-cross-origin — limits referrer leakage
 *  - Cache-Control / Pragma / Expires        — prevents API response caching
 */

/**
 * Emit all required security and cache-control response headers.
 * Must be called before any output.
 */
function apply_security_headers() {
    header('Content-Type: application/json; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
}

/**
 * Safely decode a JSON request body.
 *
 * Replaces the `@json_decode(...)` anti-pattern used in handlers.
 * The `@` operator silently swallows parse errors and makes debugging hard.
 * This function checks `json_last_error()` explicitly and returns a
 * descriptive error string so the caller can respond with HTTP 400.
 *
 * @param  string      $body     Raw request body string
 * @param  string|null &$error   Set to a human-readable error on failure
 * @return mixed|null            Decoded value, or null on failure
 */
function safe_json_decode($body, &$error = null) {
    if ($body === '' || $body === false) {
        $error = 'Empty request body.';
        return null;
    }

    // Enforce a hard body size limit (64 KB) to prevent memory exhaustion.
    if (strlen($body) > 65536) {
        $error = 'Request body exceeds maximum allowed size.';
        return null;
    }

    $decoded = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        $error = 'Invalid JSON: ' . json_last_error_msg();
        return null;
    }

    return $decoded;
}

/**
 * Respond with a JSON error payload and the given HTTP status code, then halt.
 *
 * Centralises the repetitive `http_response_code() + echo json_encode() + exit`
 * pattern used across handlers.
 *
 * @param int    $status   HTTP status code (400, 405, etc.)
 * @param string $message  Human-readable error message
 */
function json_error($status, $message) {
    http_response_code($status);
    echo json_encode([
        'Success' => false,
        'Message' => $message,
    ]);
    exit;
}
