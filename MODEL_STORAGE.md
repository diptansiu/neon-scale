# Model Storage

Models cached in IndexedDB database "neon-scale-models", store "models", keyed by `${id}:${variant}`. Each record: { buffer, sha256, size, variant, downloadedAt }.

Download verifies file size and SHA-256; rejects on mismatch. Delete via UI ("Delete cached model") or `deleteCachedModel`. Object URLs revoked after use.