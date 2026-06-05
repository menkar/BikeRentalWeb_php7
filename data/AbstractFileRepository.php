<?php
/**
 * AbstractFileRepository
 *
 * Base class for all file-backed repositories.
 *
 * Eliminates the three-way code duplication in BeachCruiserRepository,
 * MountainBikeRepository, and AccessoryRepository.
 *
 * Design pattern: Template Method — this class owns the caching algorithm;
 * subclasses provide only the data-format-specific `loadFromSource()`.
 *
 * SOLID:
 *  - S: Owns caching/persistence only; data parsing delegated to subclasses.
 *  - O: New storage formats (e.g. SQLite) just require a new subclass.
 *  - L: Every concrete repo is a valid FileRepository substitutable here.
 *  - I: Exposes only `getAll()` to consumers; write helpers are protected.
 *  - D: Handlers depend on concrete service classes; repos are implementation detail.
 *
 * Security:
 *  - `unserialize()` is called with `['allowed_classes' => false]` to block
 *    PHP Object Injection (CVE class: untrusted deserialization).
 *  - All file writes use LOCK_EX to prevent data corruption from concurrent
 *    requests (last-write-wins with a locked write is safe; no-lock is not).
 */
abstract class AbstractFileRepository {

    /** @var string Absolute path to the primary data file (XML or JSON) */
    protected $dataPath;

    /** @var string Absolute path to the serialised PHP cache sidecar */
    protected $cachePath;

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Return all records.
     *
     * Reads from the cache when fresh; falls back to `loadFromSource()` and
     * rebuilds the cache when stale or corrupt.
     *
     * @return array
     */
    public function getAll() {
        $cached = $this->_readCache();
        if ($cached !== null) {
            return $cached;
        }

        $data = $this->loadFromSource();
        $this->_writeCache($data);
        return $data;
    }

    // ─── Abstract — subclass contract ─────────────────────────────────────────

    /**
     * Parse the primary data file and return a plain PHP array.
     * Called only when the cache is absent or stale.
     *
     * @return array
     */
    abstract protected function loadFromSource();

    // ─── Protected helpers — available to subclasses ─────────────────────────

    /**
     * Serialise `$data` and write it to the cache file with an exclusive lock.
     *
     * @param array $data
     */
    protected function _writeCache(array $data) {
        file_put_contents($this->cachePath, serialize($data), LOCK_EX);
    }

    /**
     * Write an arbitrary string to the primary data file with an exclusive lock.
     * Subclasses call this when saving updated data (JSON / XML string).
     *
     * @param string $content
     */
    protected function _writeFile($content) {
        file_put_contents($this->dataPath, $content, LOCK_EX);
    }

    // ─── Private — cache management ───────────────────────────────────────────

    /**
     * Read and validate the cache.
     *
     * Returns the cached array on success, or null if the cache is absent,
     * stale, corrupt, or deserialised into a non-array.
     *
     * Security: `allowed_classes => false` prevents PHP Object Injection by
     * refusing to instantiate any class during unserialisation.
     *
     * @return array|null
     */
    private function _readCache() {
        if (!$this->_isCacheFresh()) {
            return null;
        }

        $raw = file_get_contents($this->cachePath);
        if ($raw === false) {
            return null;
        }

        // allowed_classes: false blocks PHP Object Injection attacks.
        // unserialize() with an untrusted file can otherwise instantiate
        // arbitrary classes and trigger destructors. We will not allow that.
        $data = unserialize($raw, ['allowed_classes' => false]);

        return (is_array($data)) ? $data : null;
    }

    /**
     * Returns true only when both files exist and the cache is at least as
     * new as the primary data file.
     *
     * @return bool
     */
    private function _isCacheFresh() {
        return file_exists($this->cachePath)
            && file_exists($this->dataPath)
            && filemtime($this->cachePath) >= filemtime($this->dataPath);
    }
}
