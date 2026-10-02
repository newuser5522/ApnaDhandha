import { useEffect, useState } from "react";

const DATABASE_NAME = "apna-dhandha";
const DATABASE_VERSION = 1;
const STORE_NAME = "collections";

const openDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readCollection = async (key) => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const writeCollection = async (key, value) => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export function useDatabaseCollection(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadCollection = async () => {
      try {
        const response = await fetch(`/api/data/${encodeURIComponent(key)}`, {
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error("Unable to load business data.");

        const result = await response.json();
        let nextValue = result.value;
        if (nextValue === null) {
          const localValue = await readCollection(key).catch(() => undefined);
          nextValue = localValue === undefined ? initialValue : localValue;

          if (localValue !== undefined) {
            const migrationResponse = await fetch(
              `/api/data/${encodeURIComponent(key)}`,
              {
                method: "PUT",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value: localValue }),
              },
            );
            if (!migrationResponse.ok) {
              throw new Error("Could not migrate existing browser data.");
            }
          }
        }

        if (mounted) {
          setValue(nextValue);
          setLoaded(true);
          setError("");
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message);
          setLoaded(true);
        }
      }
    };

    loadCollection();
    return () => {
      mounted = false;
    };
  }, [key]);

  useEffect(() => {
    if (!loaded || error) return undefined;

    let mounted = true;
    fetch(`/api/data/${encodeURIComponent(key)}`, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to save business data.");
      })
      .catch((writeError) => {
        if (mounted) setError(writeError.message);
      });

    return () => {
      mounted = false;
    };
  }, [key, value, loaded, error]);

  return [value, setValue, loaded, error];
}
