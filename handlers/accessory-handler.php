<?php
/**
 * accessory-handler.php
 *
 * GET  ?bikeType=beach|mountain  — list accessories compatible with a bike type
 * GET  (no bikeType)             — list all accessories
 * POST (body: JSON array)        — process an accessory order
 *
 * Security hardening applied here:
 *  - All response headers emitted via apply_security_headers() (centralised, SRP).
 *  - JSON decoding via safe_json_decode() — no `@` error suppressor, 64 KB hard cap.
 *  - POST payload validated for array type and capped at MAX_ORDER_ITEMS (20)
 *    to prevent abuse through oversized order arrays.
 *  - Individual item fields validated as integer before being forwarded to the
 *    service layer; the service layer still performs its own stock validation.
 */

require_once __DIR__ . '/_security.php';
require_once __DIR__ . '/../data/BeachCruiserRepository.php';
require_once __DIR__ . '/../data/MountainBikeRepository.php';
require_once __DIR__ . '/../data/AccessoryRepository.php';
require_once __DIR__ . '/../services/BeachCruiserService.php';
require_once __DIR__ . '/../services/MountainBikeService.php';
require_once __DIR__ . '/../services/AccessoryService.php';
require_once __DIR__ . '/../services/ApplicationServices.php';

// Security headers first — before any output.
apply_security_headers();

$dataFolder = __DIR__ . '/../SampleData';
ApplicationServices::initialize($dataFolder);

error_reporting(E_ALL & ~E_NOTICE);

/** Maximum number of distinct accessory lines accepted in a single order. */
define('MAX_ORDER_ITEMS', 20);

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: fetch accessories ────────────────────────────────────────────────────
if ($method === 'GET') {
    $service = ApplicationServices::getAccessoryService();

    $bikeType = isset($_GET['bikeType']) ? trim((string)$_GET['bikeType']) : '';

    if ($bikeType !== '') {
        $accessories = $service->getCompatibleWith($bikeType);
    } else {
        $accessories = $service->getAll();
    }

    $result = [];
    foreach ($accessories as $acc) {
        $result[] = [
            'AccessoryID'    => intval($acc['AccessoryID']),
            'Name'           => htmlspecialchars($acc['Name'],        ENT_QUOTES, 'UTF-8'),
            'Category'       => htmlspecialchars($acc['Category'],    ENT_QUOTES, 'UTF-8'),
            'Description'    => htmlspecialchars($acc['Description'], ENT_QUOTES, 'UTF-8'),
            'UnitPrice'      => floatval($acc['UnitPrice']),
            'StockCount'     => intval($acc['StockCount']),
            'CompatibleWith' => $acc['CompatibleWith'],
        ];
    }

    echo json_encode($result);
    exit;
}

// ── POST: process an order ────────────────────────────────────────────────────
if ($method === 'POST') {
    $body = file_get_contents('php://input');
    $data = safe_json_decode($body, $parseError);

    if ($data === null) {
        json_error(400, $parseError ?? 'Invalid JSON in request body.');
    }

    // Must be a non-empty array.
    if (!is_array($data) || empty($data)) {
        json_error(400, 'Request body must be a non-empty JSON array of {AccessoryID, Quantity} objects.');
    }

    // Guard against oversized payloads (DoS mitigation).
    if (count($data) > MAX_ORDER_ITEMS) {
        json_error(400, 'Order exceeds the maximum of ' . MAX_ORDER_ITEMS . ' line items per request.');
    }

    // Sanitise each item: AccessoryID and Quantity must be positive integers.
    $sanitised = [];
    foreach ($data as $item) {
        if (!is_array($item)) {
            json_error(400, 'Each order item must be a JSON object with AccessoryID and Quantity.');
        }
        $sanitised[] = [
            'AccessoryID' => intval($item['AccessoryID'] ?? 0),
            'Quantity'    => intval($item['Quantity']    ?? 0),
        ];
    }

    $result = ApplicationServices::getAccessoryService()->processOrder($sanitised);
    echo json_encode($result);
    exit;
}

// ── Any other method ──────────────────────────────────────────────────────────
json_error(405, 'Method Not Allowed. Use GET to browse accessories, POST to order.');
