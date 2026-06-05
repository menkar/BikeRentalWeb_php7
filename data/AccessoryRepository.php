<?php
/**
 * AccessoryRepository
 *
 * Loads accessory data from JSON, caches it with serialize().
 * Third repository. Third time doing the exact same caching pattern.
 * We could have abstracted this into a base class. We did not.
 * Copy-paste is also a design pattern. It is not a good one.
 * But here we are, and it works, and refactoring it is left as an exercise
 * for the developer who gets handed this codebase in 2026 and says "what is this."
 */
class AccessoryRepository {

    private $dataPath;
    private $cachePath;

    public function __construct($dataFolder) {
        $this->dataPath  = $dataFolder . DIRECTORY_SEPARATOR . 'accessories.json';
        $this->cachePath = $this->dataPath . '.cache';
    }

    /**
     * Get all accessories.
     *
     * Cache check → unserialize → return. Or: reload from JSON → serialize → return.
     * The cycle of life. Birth (load), storage (serialize), retrieval (unserialize), death (request ends).
     * PHP is very Buddhist about object lifetime. Everything is impermanent. Especially static variables.
     *
     * @return array
     */
    public function getAll() {
        if ($this->isCacheFresh()) {
            $cached = unserialize(file_get_contents($this->cachePath));
            if ($cached !== false) {
                return $cached;
            }
            // If you're here, the cache lied. We reload without complaint.
        }

        $accessories = $this->loadFromJson();
        file_put_contents($this->cachePath, serialize($accessories));
        return $accessories;
    }

    /**
     * Save accessories to JSON and refresh the cache.
     * Overwrites the file completely on every save.
     * There are no partial updates. There are no transactions.
     * If the server crashes between writing the JSON and writing the cache,
     * the cache will be stale and the JSON will be current and everything will be fine
     * because isCacheFresh() will catch it. Probably.
     *
     * @param array $accessories
     */
    public function save($accessories) {
        $json = json_encode($accessories, JSON_PRETTY_PRINT);
        file_put_contents($this->dataPath, $json);
        file_put_contents($this->cachePath, serialize($accessories));
    }

    /**
     * Returns true if the cache sidecar is newer than the JSON source.
     * Two file_exists() calls. No locking. No atomicity.
     * Works fine in development where one person uses it at a time.
     * "Works fine in development" is the motto of this entire codebase.
     */
    private function isCacheFresh() {
        if (!file_exists($this->cachePath)) {
            return false;
        }
        if (!file_exists($this->dataPath)) {
            return false;
        }
        return filemtime($this->cachePath) >= filemtime($this->dataPath);
    }

    /**
     * Load accessories from JSON.
     * Fields: AccessoryID, Name, Category, Description, UnitPrice, StockCount, CompatibleWith.
     * CompatibleWith is an array of strings like ["beach", "mountain"] or ["all"].
     * (array) cast on an already-array value is harmless. On a non-array value it is forgiving.
     * PHP is nothing if not forgiving. Sometimes too forgiving. This is one of those times.
     */
    private function loadFromJson() {
        $contents = file_get_contents($this->dataPath);
        $decoded  = json_decode($contents, true);

        if ($decoded === null) {
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
                'CompatibleWith' => (array)$item['CompatibleWith'],
            ];
        }

        return $accessories;
    }
}
