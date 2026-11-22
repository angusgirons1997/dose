import Dexie, { type EntityTable } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type { CapacityMl, SyringeType } from './calc';

export interface Vial {
  id?: number;
  createdAt: string; // YYYY-MM-DD the vial was reconstituted
  peptideName: string;
  vialMg: number;
  waterMl: number;
  concentrationMgPerMl: number;
  syringeType: SyringeType;
  doseMg?: number; // planned dose, used for "jabs left"
  active: boolean;
}
export interface Jab {
  id?: number;
  date: string; // YYYY-MM-DD
  units: number;
  doseMg: number;
  vialId?: number;
  newVial: boolean;
  note?: string;
}
export interface Weight {
  id?: number;
  date: string;
  kg: number;
  photoId?: number;
}
export interface Photo {
  id?: number;
  date: string;
  blob: Blob;
  note?: string;
}
export interface Setting {
  key: string;
  value: unknown;
}

export const db = new Dexie('dose') as Dexie & {
  vials: EntityTable<Vial, 'id'>;
  jabs: EntityTable<Jab, 'id'>;
  weights: EntityTable<Weight, 'id'>;
  photos: EntityTable<Photo, 'id'>;
  settings: EntityTable<Setting, 'key'>;
};

// Booleans aren't indexable in IndexedDB, so `active` is filtered in memory (a handful of vials).
db.version(1).stores({
  vials: '++id, createdAt',
  jabs: '++id, date, vialId',
  weights: '++id, date',
  photos: '++id, date',
  settings: 'key',
});

// ---------- settings ----------
export interface SavedVial {
  peptideName: string;
  vialMg: number;
  waterMl: number;
  doseMg: number;
  concentrationMgPerMl: number;
  syringeType: SyringeType;
}
export interface Prefs {
  syringeType: SyringeType;
  capacityMl: CapacityMl;
}
export const defaultPrefs: Prefs = { syringeType: 'U-100', capacityMl: 1 };

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}
export const setSetting = (key: string, value: unknown) => db.settings.put({ key, value });

export function useSetting<T>(key: string, fallback: T): T {
  return useLiveQuery(() => getSetting(key, fallback), [key], fallback);
}
export const usePrefs = () => ({ ...defaultPrefs, ...useSetting<Partial<Prefs>>('prefs', {}) });

// ---------- vials / jabs ----------
export const getActiveVial = async () => (await db.vials.toArray()).find((v) => v.active);

/** Save a jab. With newVial, retire the active vial and start a fresh one from `vial`. */
export async function saveJab(jab: Jab, vial?: Omit<Vial, 'id' | 'active' | 'createdAt'>) {
  return db.transaction('rw', db.vials, db.jabs, async () => {
    if (jab.newVial && vial && jab.id == null) {
      await db.vials.toCollection().modify({ active: false });
      jab.vialId = await db.vials.add({ ...vial, createdAt: jab.date, active: true });
    }
    if (jab.vialId == null) jab.vialId = (await getActiveVial())?.id;
    return db.jabs.put(jab);
  });
}

// ---------- body ----------
/** Downscale to max 1600px long edge, JPEG 0.85. */
export async function downscale(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode photo'))), 'image/jpeg', 0.85),
  );
}

export async function saveWeight(date: string, kg: number, photo?: Blob, existing?: Weight) {
  const blob = photo ? await downscale(photo) : undefined;
  return db.transaction('rw', db.weights, db.photos, async () => {
    let photoId = existing?.photoId;
    if (blob) {
      if (photoId != null) await db.photos.delete(photoId);
      photoId = await db.photos.add({ date, blob });
    } else if (photoId != null) {
      await db.photos.update(photoId, { date });
    }
    return db.weights.put({ ...existing, date, kg, photoId });
  });
}

export async function deleteWeight(w: Weight) {
  await db.transaction('rw', db.weights, db.photos, async () => {
    if (w.photoId != null) await db.photos.delete(w.photoId);
    await db.weights.delete(w.id!);
  });
}

// ---------- dates ----------
const pad = (n: number) => String(n).padStart(2, '0');
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoDate(new Date());
export const daysAgo = (iso: string) => Math.round((Date.parse(today() + 'T00:00') - Date.parse(iso + 'T00:00')) / 864e5);
export const fmtDate =(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Date(iso + 'T00:00').toLocaleDateString(undefined, opts);
