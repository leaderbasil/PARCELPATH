import { config } from "@/config";
import { translate } from "@/i18n";
import { isDemoMode } from "@/services/demoMode";

/**
 * Browser object storage.
 *
 * In the demo (or when no upload service is configured) images are stored as
 * Blobs in IndexedDB and referenced by `object:` keys. When
 * `VITE_OBJECT_STORAGE_UPLOAD_URL` is configured, the file is uploaded there
 * and a normal HTTPS URL is returned so the backend can store it as-is.
 */
export const OBJECT_REF_PREFIX = "object:";

const DB_NAME = "parcelpath-object-storage";
const STORE_NAME = "images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

let databasePromise: Promise<IDBDatabase> | null = null;
const objectUrlCache = new Map<string, string>();

export function isObjectRef(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith(OBJECT_REF_PREFIX);
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error(translate("storage.unsupported")));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(translate("storage.openFailed")));
  });
  return databasePromise;
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const request = run(transaction.objectStore(STORE_NAME));
        let result: T;
        request.onsuccess = () => {
          result = request.result;
        };
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error ?? new Error(translate("storage.accessFailed")));
        transaction.onabort = () => reject(transaction.error ?? new Error(translate("storage.operationAborted")));
      })
  );
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-60) || "image";
}

async function uploadToService(file: File): Promise<string> {
  const token = sessionStorage.getItem("access_token");
  const body = new FormData();
  body.append("file", file, file.name);
  const response = await fetch(config.objectStorageUploadUrl, {
    method: "POST",
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(translate("storage.uploadFailed"));
  const payload: unknown = await response.json();
  const record = payload as { data?: { url?: unknown }; url?: unknown } | null;
  const url = record?.data?.url ?? record?.url;
  if (!isHttpUrl(url)) throw new Error(translate("storage.invalidUrl"));
  return url;
}

/** Store an image and return the reference that should be saved on the product. */
export async function putImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(translate("storage.notAnImage"));
  if (file.size > MAX_IMAGE_BYTES) throw new Error(translate("storage.tooLarge"));

  if (!isDemoMode()) return uploadToService(file);

  const key = `${crypto.randomUUID()}-${safeFileName(file.name)}`;
  await withStore("readwrite", (store) => store.put(file, key));
  return `${OBJECT_REF_PREFIX}${key}`;
}

/** Resolve a stored object reference into a URL usable by an `<img>` tag. */
export async function getObjectUrl(reference: string | null | undefined): Promise<string | null> {
  if (!isObjectRef(reference)) return null;
  const cached = objectUrlCache.get(reference);
  if (cached) return cached;

  const key = reference.slice(OBJECT_REF_PREFIX.length);
  const blob = await withStore<Blob | undefined>(
    "readonly",
    (store) => store.get(key) as IDBRequest<Blob | undefined>
  );
  if (!(blob instanceof Blob)) return null;
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(reference, url);
  return url;
}
