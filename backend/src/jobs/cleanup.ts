import { cleanupOrphanAttachments } from '../services/attachments';

/**
 * Cron-style job: every hour, delete Attachment rows with messageId IS NULL
 * older than 24h and remove their files from disk.
 */
export function startOrphanCleanup() {
  setInterval(async () => {
    try {
      const count = await cleanupOrphanAttachments();
      if (count > 0) console.log(`[Cleanup] Removed ${count} orphan attachment(s)`);
    } catch (err) {
      console.error('[Cleanup] Orphan cleanup failed:', err);
    }
  }, 60 * 60 * 1000);
}
