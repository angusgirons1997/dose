import { db, setSetting, type Photo } from './db';

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });

export async function exportBackup(): Promise<void> {
  const photos = await db.photos.toArray();
  const data = {
    app: 'dose',
    version: 1,
    exportedAt: new Date().toISOString(),
    vials: await db.vials.toArray(),
    jabs: await db.jabs.toArray(),
    weights: await db.weights.toArray(),
    settings: await db.settings.toArray(),
    photos: await Promise.all(photos.map(async (p) => ({ ...p, blob: await blobToDataUrl(p.blob) }))),
  };
  const name = `dose-backup-${data.exportedAt.slice(0, 10)}.json`;
  const file = new File([JSON.stringify(data)], name, { type: 'application/json' });

  // iOS home-screen apps handle the share sheet better than downloads ("Save to Files").
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // user cancelled: don't record a backup
      throw e;
    }
  } else {
    const url = URL.createObjectURL(file);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  await setSetting('lastBackup', data.exportedAt);
}

/** Replaces all data with the backup's. Throws (and changes nothing) if the file isn't a Dose backup. */
export async function importBackup(file: File): Promise<void> {
  let data: any;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const tables = ['vials', 'jabs', 'weights', 'settings', 'photos'] as const;
  if (data?.app !== 'dose' || !tables.every((t) => Array.isArray(data[t])))
    throw new Error("That file isn't a Dose backup.");

  const photos: Photo[] = await Promise.all(
    data.photos.map(async (p: Photo & { blob: string }) => {
      // only decode inline data: URLs — never fetch anything a file points at
      if (typeof p.blob !== 'string' || !p.blob.startsWith('data:image/'))
        throw new Error('Backup contains an invalid photo.');
      return { ...p, blob: await (await fetch(p.blob)).blob() };
    }),
  );
  await db.transaction('rw', [db.vials, db.jabs, db.weights, db.settings, db.photos], async () => {
    await Promise.all([db.vials, db.jabs, db.weights, db.settings, db.photos].map((t) => t.clear()));
    await db.vials.bulkAdd(data.vials);
    await db.jabs.bulkAdd(data.jabs);
    await db.weights.bulkAdd(data.weights);
    await db.settings.bulkAdd(data.settings);
    await db.photos.bulkAdd(photos);
    await db.settings.put({ key: 'lastBackup', value: data.exportedAt });
  });
}
