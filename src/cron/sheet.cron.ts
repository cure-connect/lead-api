import cron from 'node-cron';
import { syncAllClinicsToSheet } from '../services/sheet.service';

export function startSheetSyncCron() {
    // ทุกชั่วโมง นาทีที่ 5
    cron.schedule(
        '5 * * * *',
        async () => {
            console.log('[sheet-sync] cron start');
            try {
                const results = await syncAllClinicsToSheet();
                console.log('[sheet-sync] done', { count: results.length });
            } catch (err) {
                console.error('[sheet-sync] cron failed', err);
            }
        },
        { timezone: 'Asia/Bangkok' },
    );
}