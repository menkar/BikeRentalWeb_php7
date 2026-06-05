<?php
require_once __DIR__ . '/AbstractFileRepository.php';

/**
 * BeachCruiserRepository
 *
 * Persists beach cruiser data as XML with a serialize() cache sidecar.
 *
 * Extends AbstractFileRepository — caching, file locking, and secure
 * deserialization are all inherited. This class provides only the
 * beach-cruiser-specific parsing (loadFromSource) and persistence (save).
 *
 * SOLID:
 *  - S: Responsible only for beach-cruiser XML parsing and serialisation.
 *  - O: Cache strategy changes in the base; XML format changes here only.
 *  - L: Fully substitutable for AbstractFileRepository in tests.
 */
class BeachCruiserRepository extends AbstractFileRepository {

    public function __construct($dataFolder) {
        $this->dataPath  = $dataFolder . DIRECTORY_SEPARATOR . 'beach_cruisers.xml';
        $this->cachePath = $this->dataPath . '.cache';
    }

    /**
     * Save bikes back to XML and refresh the cache.
     *
     * Writes via _writeFile() (inherited) which holds LOCK_EX throughout,
     * preventing concurrent-write corruption.
     *
     * @param array $bikes
     */
    public function save(array $bikes) {
        $this->_writeFile($this->_buildXml($bikes));
        $this->_writeCache($bikes);
    }

    // ─── AbstractFileRepository contract ─────────────────────────────────────

    /**
     * Parse beach_cruisers.xml into a plain PHP array.
     * Cast every SimpleXMLElement value to a scalar type before storing;
     * leaving them as SimpleXMLElement objects causes subtle bugs downstream.
     *
     * @return array
     */
    protected function loadFromSource() {
        if (!file_exists($this->dataPath)) {
            return [];
        }

        $xml = @simplexml_load_file($this->dataPath);
        if ($xml === false) {
            return [];
        }

        $bikes = [];
        foreach ($xml->Bike as $node) {
            $bikes[] = [
                'bike_id'      => intval((string)$node->bike_id),
                'model_name'   => (string)$node->model_name,
                'color'        => (string)$node->color,
                'frame_size'   => (string)$node->frame_size,
                'daily_rate'   => floatval((string)$node->daily_rate),
                'is_available' => ((string)$node->is_available === 'true'),
            ];
        }

        return $bikes;
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    /**
     * Build a well-formed XML string from the bikes array.
     * Returns the string so _writeFile() can write it atomically with LOCK_EX.
     *
     * @param  array  $bikes
     * @return string XML
     */
    private function _buildXml(array $bikes) {
        $xml = new SimpleXMLElement('<?xml version="1.0" encoding="utf-8"?><BeachCruisers/>');

        foreach ($bikes as $bike) {
            $node = $xml->addChild('Bike');
            $node->addChild('bike_id',      $bike['bike_id']);
            $node->addChild('model_name',   htmlspecialchars($bike['model_name']));
            $node->addChild('color',        htmlspecialchars($bike['color']));
            $node->addChild('frame_size',   htmlspecialchars($bike['frame_size']));
            $node->addChild('daily_rate',   $bike['daily_rate']);
            $node->addChild('is_available', $bike['is_available'] ? 'true' : 'false');
        }

        $dom = dom_import_simplexml($xml)->ownerDocument;
        $dom->formatOutput = true;
        return $dom->saveXML();
    }
}
