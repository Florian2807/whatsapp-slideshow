import { deleteMedia, getDb } from "@/lib/media-store";
import { getSettings } from "@/lib/settings";

export type CleanupResult = {
  deletedCount: number;
  freedBytes: number;
  failedCount: number;
  timestamp: string;
  reason: string;
};

type MediaCleanupRow = {
  id: number;
  size_bytes: number;
  created_at: string;
};

export async function enforceStoragePolicies(): Promise<CleanupResult> {
  const settings = await getSettings();

  if (!settings.storageCleanupEnabled) {
    return {
      deletedCount: 0,
      freedBytes: 0,
      failedCount: 0,
      timestamp: new Date().toISOString(),
      reason: "Cleanup disabled",
    };
  }

  const db = getDb();
  const media = db
    .prepare(
      `
      SELECT id, size_bytes, created_at
      FROM media
      WHERE hidden = 0
      ORDER BY created_at ASC, id ASC
    `,
    )
    .all() as MediaCleanupRow[];

  const selectedForDeletion = new Set<number>();
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const reasons: string[] = [];
  let remainingCount = media.length;
  let remainingBytes = media.reduce((total, item) => total + item.size_bytes, 0);

  function selectForDeletion(item: MediaCleanupRow) {
    if (selectedForDeletion.has(item.id)) {
      return false;
    }

    selectedForDeletion.add(item.id);
    remainingCount -= 1;
    remainingBytes -= item.size_bytes;
    return true;
  }

  if (settings.storageMaxFiles > 0 && remainingCount > settings.storageMaxFiles) {
    let removedByCount = 0;

    for (const item of media) {
      if (remainingCount <= settings.storageMaxFiles) {
        break;
      }

      if (selectForDeletion(item)) {
        removedByCount += 1;
      }
    }

    if (removedByCount > 0) {
      reasons.push(`Max files exceeded (${removedByCount} Dateien entfernt)`);
    }
  }

  if (settings.storageMaxBytes > 0 && remainingBytes > settings.storageMaxBytes) {
    let removedBySize = 0;

    for (const item of media) {
      if (remainingBytes <= settings.storageMaxBytes) {
        break;
      }

      if (selectForDeletion(item)) {
        removedBySize += 1;
      }
    }

    if (removedBySize > 0) {
      reasons.push(`Max storage exceeded (${removedBySize} Dateien entfernt)`);
    }
  }

  if (settings.storageMaxDays > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.storageMaxDays);
    const cutoffIso = cutoffDate.toISOString();
    let removedByAge = 0;

    for (const item of media) {
      if (item.created_at >= cutoffIso) {
        continue;
      }

      if (selectForDeletion(item)) {
        removedByAge += 1;
      }
    }

    if (removedByAge > 0) {
      reasons.push(
        `Retention policy: ${removedByAge} Dateien aelter als ${settings.storageMaxDays} Tage entfernt`,
      );
    }
  }

  const deletionResults = await Promise.allSettled(
    Array.from(selectedForDeletion).map(async (id) => {
      const item = mediaById.get(id);

      if (!item) {
        return 0;
      }

      await deleteMedia(id);
      return item.size_bytes;
    }),
  );

  let deletedCount = 0;
  let freedBytes = 0;
  let failedCount = 0;

  for (const result of deletionResults) {
    if (result.status === "fulfilled") {
      deletedCount += 1;
      freedBytes += result.value;
    } else {
      failedCount += 1;
    }
  }

  if (failedCount > 0) {
    reasons.push(`${failedCount} Dateien konnten nicht geloescht werden`);
  }

  return {
    deletedCount,
    freedBytes,
    failedCount,
    timestamp: new Date().toISOString(),
    reason: reasons.length > 0 ? reasons.join("; ") : "No cleanup needed",
  };
}
