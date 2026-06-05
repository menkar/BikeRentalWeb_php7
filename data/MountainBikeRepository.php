<?php
/**
 * MountainBikeRepository
 *
 * Loads mountain bike data from JSON, caches it with serialize().
 *
 * serialize()/unserialize(): same approach as BeachCruiserRepository.
 * You might wonder why we serialize a PHP array back to disk when we could
 * just re-parse the JSON. The answer is "performance" and "legacy reasons"
 * and the faint smell of decisions made at 11pm. The cache is fast. The JSON parse is slower.
 * This is the optimization. It works. It is also the kind of thing you replace
 * with Redis or Memcached and feel very modern for exactly one sprint.
 */
class MountainBikeRepository {

    private $dataPath;
    private $cachePath;

    public function __construct($dataFolder) {
        $this->dataPath  = $dataFolder . DIRECTORY_SEPARATOR . 'mountain_bikes.json';
        $this->cachePath = $this->dataPath . '.cache';
    }

    /**
     * Get all mountain bikes.
     *
     * Cache freshness check via filemtime() comparison.
     * If the cache is fresh: unserialize and return. Zero JSON parsing.
     * If not: load from JSON, serialize to cache, return.
     * PascalCase keys because the JSON uses PascalCase and we respect the source.
     * Even when it's inconsistent with every other file in this project.
     * Especially then.
     *
     * @return array
     */
    public function getAll() {
        if ($this->isCacheFresh()) {
            $cached = unserialize(file_get_contents($this->cachePath));
            if ($cached !== false) {
                return $cached;
            }
            // Cache is fresh but unserialize() returned false.
            // Someone edited it by hand or PHP is having a moment. Either way: reload.
        }

        $bikes = $this->loadFromJson();
        file_put_contents($this->cachePath, serialize($bikes));
        return $bikes;
    }

    /**
     * Save bikes to JSON and refresh the cache.
     * JSON_PRETTY_PRINT because we are courteous to future humans who open the file directly.
     * The cache file has no such courtesy. It is for machines.
     *
     * @param array $bikes
     */
    public function save($bikes) {
        $json = json_encode($bikes, JSON_PRETTY_PRINT);
        file_put_contents($this->dataPath, $json);
        file_put_contents($this->cachePath, serialize($bikes));
    }

    /**
     * Returns true if the cache sidecar exists and is newer than the JSON data file.
     * file_exists() called twice. In a world with better architecture, this would be atomic.
     * In this world, there is a race condition nobody has ever triggered. Yet.
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
     * Load bikes from JSON.
     * json_decode() with true returns an associative array, not an object.
     * The true parameter has been there since PHP 5.2 and has caused exactly
     * one argument per team about whether it should be the default.
     * It is not the default. You must remember to pass it.
     * We remember. Today.
     */
    private function loadFromJson() {
        $contents = file_get_contents($this->dataPath);
        $decoded  = json_decode($contents, true);

        if ($decoded === null) {
            return []; // JSON failed to parse. No explanation offered. Very PHP.
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
