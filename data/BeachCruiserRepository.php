<?php
/**
 * BeachCruiserRepository
 *
 * Loads beach cruiser data from XML, caches it with serialize().
 *
 * serialize()/unserialize() — PHP's version of "I'll just save this as a blob."
 * Works great until someone manually edits the .cache file, at which point
 * unserialize() returns false and offers no further comment on the matter.
 * The PHP equivalent of opening a mystery tupperware from the fridge.
 * You asked for leftovers. You got false. No refunds.
 */
class BeachCruiserRepository {

    private $dataPath;
    private $cachePath;

    public function __construct($dataFolder) {
        $this->dataPath  = $dataFolder . DIRECTORY_SEPARATOR . 'beach_cruisers.xml';
        $this->cachePath = $this->dataPath . '.cache';
    }

    /**
     * Get all beach cruisers.
     *
     * Checks if the .cache sidecar is newer than the .xml source.
     * If yes: deserializes the blob and returns it. Fast. Opaque. Trusting.
     * If no: parses the XML, serializes the result, saves it, returns it.
     * If the cache is corrupt: silently falls back to XML with the energy of
     * someone who has been through this before and no longer finds it interesting.
     *
     * @return array
     */
    public function getAll() {
        if ($this->isCacheFresh()) {
            $cached = unserialize(file_get_contents($this->cachePath));
            if ($cached !== false) {
                return $cached;
            }
            // unserialize() returned false. The cache file is either corrupt,
            // edited by hand, or haunted. All three are equally possible.
            // We fall through to the XML and say nothing of it.
        }

        $bikes = $this->loadFromXml();
        file_put_contents($this->cachePath, serialize($bikes));
        return $bikes;
    }

    /**
     * Save bikes back to XML and refresh the cache.
     * The file is the database. The cache is the optimization.
     * Together they are a persistence layer with exactly zero transactions.
     *
     * @param array $bikes
     */
    public function save($bikes) {
        $this->writeToXml($bikes);
        file_put_contents($this->cachePath, serialize($bikes));
    }

    /**
     * Returns true if the cache file exists and is newer than the data file.
     * filemtime() is unaware of time zones and doesn't care. Neither do we.
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
     * Load bikes from XML using SimpleXML.
     * SimpleXML turns XML nodes into magic objects that look like arrays,
     * act like strings, and are secretly neither. Cast everything to string
     * or PHP will hand you a SimpleXMLElement when you asked for a name.
     * You've been warned. We learned the hard way so you didn't have to.
     */
    private function loadFromXml() {
        $xml = simplexml_load_file($this->dataPath);
        $bikes = [];

        foreach ($xml->Bike as $bikeNode) {
            $bikes[] = [
                'bike_id'      => intval((string)$bikeNode->bike_id),
                'model_name'   => (string)$bikeNode->model_name,
                'color'        => (string)$bikeNode->color,
                'frame_size'   => (string)$bikeNode->frame_size,
                'daily_rate'   => floatval((string)$bikeNode->daily_rate),
                'is_available' => ((string)$bikeNode->is_available === 'true'),
            ];
        }

        return $bikes;
    }

    /**
     * Write bikes back to XML.
     *
     * Uses each() to iterate over the array with the internal array pointer.
     * each() was already old when most PHP developers learned to code.
     * foreach() has been the right answer since PHP 4. We use each() anyway.
     * You will notice this when you run it on PHP 8, because each() will be gone
     * and replaced by a very clear error message. Consider this foreshadowing.
     * reset() is called first because each() will start wherever the pointer is,
     * and if something moved it, we'd skip bikes. We reset. We iterate. We persist.
     */
    private function writeToXml($bikes) {
        $xml = new SimpleXMLElement('<?xml version="1.0" encoding="utf-8"?><BeachCruisers/>');

        reset($bikes); // Reset internal array pointer. each() needs this. foreach() would not.
        while ($entry = each($bikes)) { // each() — been deprecated since 7.2, gone in 8.0. A ghost that still works here.
            $bike = $entry['value'];
            $bikeNode = $xml->addChild('Bike');
            $bikeNode->addChild('bike_id',      $bike['bike_id']);
            $bikeNode->addChild('model_name',   htmlspecialchars($bike['model_name']));
            $bikeNode->addChild('color',        htmlspecialchars($bike['color']));
            $bikeNode->addChild('frame_size',   htmlspecialchars($bike['frame_size']));
            $bikeNode->addChild('daily_rate',   $bike['daily_rate']);
            $bikeNode->addChild('is_available', $bike['is_available'] ? 'true' : 'false');
        }

        $dom = dom_import_simplexml($xml)->ownerDocument;
        $dom->formatOutput = true;
        $dom->save($this->dataPath);
    }
}
