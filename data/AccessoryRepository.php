<?php
require_once __DIR__ . '/AbstractFileRepository.php';

/**
 * AccessoryRepository
 *
 * Persists accessory data as JSON with a serialize() cache sidecar.
 * Extends AbstractFileRepository — inherits caching, locking, and secure
 * deserialization. Only accessory-specific JSON handling lives here.
 *
 * SOLID:
 *  - S: Responsible only for accessory JSON parsing and serialisation.
 *  - O: Cache strategy changes in the base; JSON format changes here only.
 *  - L: Fully substitutable for AbstractFileRepository in tests.
 */
class AccessoryRepository extends AbstractFileRepository {

    public function __construct($dataFolder) {
        $this->dataPath  = $dataFolder . DIRECTORY_SEPARATOR . 'accessories.json';
        $this->cachePath = $this->dataPath . '.cache';
    }

    /**
     * Save accessories to JSON and refresh the cache.
     *
     * @param array $accessories
     */
    public function save(array $accessories) {
        $this->_writeFile(json_encode($accessories, JSON_PRETTY_PRINT));
        $this->_writeCache($accessories);
    }

    // ─── AbstractFileRepository contract ─────────────────────────────────────

    /**
     * Parse accessories.json into a plain PHP array.
     * CompatibleWith is cast to array so callers always receive an array,
     * never null or a scalar, even when the JSON value is unexpected.
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

        $accessories = [];
        foreach ($decoded as $item) {
            $accessories[] = [
                'AccessoryID'    => intval($item['AccessoryID']),
                'Name'           => (string)$item['Name'],
                'Category'       => (string)$item['Category'],
                'Description'    => (string)$item['Description'],
                'UnitPrice'      => floatval($item['UnitPrice']),
                'StockCount'     => intval($item['StockCount']),
                'CompatibleWith' => isset($item['CompatibleWith']) && is_array($item['CompatibleWith'])
                                    ? $item['CompatibleWith']
                                    : [],
            ];
        }

        return $accessories;
    }
}
