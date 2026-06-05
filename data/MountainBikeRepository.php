<?php
require_once __DIR__ . '/AbstractFileRepository.php';

/**
 * MountainBikeRepository
 *
 * Persists mountain bike data as JSON with a serialize() cache sidecar.
 * Extends AbstractFileRepository — inherits caching, locking, and secure
 * deserialization. Only mountain-bike-specific JSON handling lives here.
 *
 * SOLID:
 *  - S: Responsible only for mountain-bike JSON parsing and serialisation.
 *  - O: Cache strategy changes in the base; JSON format changes here only.
 *  - L: Fully substitutable for AbstractFileRepository in tests.
 */
class MountainBikeRepository extends AbstractFileRepository {

    public function __construct($dataFolder) {
        $this->dataPath  = $dataFolder . DIRECTORY_SEPARATOR . 'mountain_bikes.json';
        $this->cachePath = $this->dataPath . '.cache';
    }

    /**
     * Save bikes to JSON and refresh the cache.
     * JSON_PRETTY_PRINT keeps the file human-readable when inspected directly.
     *
     * @param array $bikes
     */
    public function save(array $bikes) {
        $this->_writeFile(json_encode($bikes, JSON_PRETTY_PRINT));
        $this->_writeCache($bikes);
    }

    // ─── AbstractFileRepository contract ─────────────────────────────────────

    /**
     * Parse mountain_bikes.json into a plain PHP array.
     * Each field is cast to its correct scalar type so callers never
     * receive raw mixed values from json_decode.
     *
     * @return array
     */
    protected function loadFromSource() {
        if (!file_exists($this->dataPath)) {
            return [];
        }

        $contents = file_get_contents($this->dataPath);
        $decoded  = json_decode($contents, true);

        if (!is_array($decoded)) {
            return [];
        }

        $bikes = [];
        foreach ($decoded as $item) {
            $bikes[] = [
                'BikeID'         => intval($item['BikeID']),
                'ModelName'      => (string)$item['ModelName'],
                'Brand'          => (string)$item['Brand'],
                'GearCount'      => intval($item['GearCount']),
                'SuspensionType' => (string)$item['SuspensionType'],
                'FrameMaterial'  => (string)$item['FrameMaterial'],
                'DailyRate'      => floatval($item['DailyRate']),
                'IsAvailable'    => (bool)$item['IsAvailable'],
                'Terrain'        => (string)$item['Terrain'],
                'WeightKg'       => floatval($item['WeightKg']),
            ];
        }

        return $bikes;
    }
}
