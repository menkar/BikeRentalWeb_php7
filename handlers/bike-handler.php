<?php
/**
 * bike-handler.php
 *
 * GET  ?action=beach|mountain  — list all bikes of the requested type
 * POST ?action=rent             — mark one bike as rented
 * POST ?action=reset            — restore all data to factory defaults (dev only)
 *
 * Security hardening applied here:
 *  - All response headers emitted via apply_security_headers() (centralised, SRP).
 *  - JSON decoding via safe_json_decode() — no `@` error suppressor, explicit
 *    size cap (64 KB), and descriptive parse-error messages.
 *  - bikeId validated to be a positive integer before service call.
 *  - Unknown actions and methods return HTTP 400/405; execution halts.
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

$action = isset($_GET['action']) ? (string)$_GET['action'] : '';

switch ($action) {

    // ── GET: list all beach cruisers ──────────────────────────────────────────
    case 'beach':
        $bikes  = ApplicationServices::getBeachCruiserService()->getAll();
        $result = [];
        foreach ($bikes as $bike) {
            $result[] = [
                'bike_id'      => intval($bike['bike_id']),
                'model_name'   => htmlspecialchars($bike['model_name'],   ENT_QUOTES, 'UTF-8'),
                'color'        => htmlspecialchars($bike['color'],        ENT_QUOTES, 'UTF-8'),
                'frame_size'   => htmlspecialchars($bike['frame_size'],   ENT_QUOTES, 'UTF-8'),
                'daily_rate'   => floatval($bike['daily_rate']),
                'is_available' => (bool)$bike['is_available'],
            ];
        }
        echo json_encode($result);
        break;

    // ── GET: list all mountain bikes ──────────────────────────────────────────
    case 'mountain':
        $bikes  = ApplicationServices::getMountainBikeService()->getAll();
        $result = [];
        foreach ($bikes as $bike) {
            $result[] = [
                'BikeID'         => intval($bike['BikeID']),
                'ModelName'      => htmlspecialchars($bike['ModelName'],      ENT_QUOTES, 'UTF-8'),
                'Brand'          => htmlspecialchars($bike['Brand'],          ENT_QUOTES, 'UTF-8'),
                'GearCount'      => intval($bike['GearCount']),
                'SuspensionType' => htmlspecialchars($bike['SuspensionType'], ENT_QUOTES, 'UTF-8'),
                'FrameMaterial'  => htmlspecialchars($bike['FrameMaterial'],  ENT_QUOTES, 'UTF-8'),
                'DailyRate'      => floatval($bike['DailyRate']),
                'IsAvailable'    => (bool)$bike['IsAvailable'],
                'Terrain'        => htmlspecialchars($bike['Terrain'],        ENT_QUOTES, 'UTF-8'),
                'WeightKg'       => floatval($bike['WeightKg']),
            ];
        }
        echo json_encode($result);
        break;

    // ── POST: rent a bike ─────────────────────────────────────────────────────
    case 'rent':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_error(405, 'Method Not Allowed. Use POST to rent a bike.');
        }

        $body = file_get_contents('php://input');
        $data = safe_json_decode($body, $parseError);

        if ($data === null) {
            json_error(400, $parseError ?? 'Invalid request body.');
        }

        $bikeType = isset($data['bikeType']) ? (string)$data['bikeType'] : '';
        $bikeId   = isset($data['bikeId'])   ? intval($data['bikeId'])   : 0;

        // Validate bikeId — must be a positive integer.
        if ($bikeId <= 0) {
            json_error(400, 'Invalid bikeId. Must be a positive integer.');
        }

        // Validate bikeType against the known whitelist.
        if ($bikeType === 'beach') {
            $success = ApplicationServices::getBeachCruiserService()->rentBike($bikeId);
        } elseif ($bikeType === 'mountain') {
            $success = ApplicationServices::getMountainBikeService()->rentBike($bikeId);
        } else {
            json_error(400, 'Unknown bikeType "' . htmlspecialchars($bikeType, ENT_QUOTES, 'UTF-8') . '". Expected "beach" or "mountain".');
        }

        if ($success) {
            echo json_encode(['Success' => true,  'Message' => 'Bike rented successfully. Enjoy the ride.']);
        } else {
            echo json_encode(['Success' => false, 'Message' => 'Bike is not available or does not exist.']);
        }
        break;

    // ── POST: reset all data to defaults (development helper) ─────────────────
    case 'reset':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_error(405, 'Method Not Allowed. Use POST.');
        }

        ApplicationServices::getBeachCruiserService()->resetToDefaults();
        ApplicationServices::getMountainBikeService()->resetToDefaults();
        ApplicationServices::getAccessoryService()->resetToDefaults();

        echo json_encode(['Success' => true, 'Message' => 'All data reset to defaults.']);
        break;

    default:
        json_error(400, 'Unknown action: ' . htmlspecialchars($action, ENT_QUOTES, 'UTF-8'));
}
