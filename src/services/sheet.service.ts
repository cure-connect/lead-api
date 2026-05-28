import { google } from 'googleapis';
import { AppointmentModel, LeadDocument } from '../models/appointment';
import { UserModel, UserDocument } from '../models/user';

const TZ = 'Asia/Bangkok';
const SHEET_TAB = 'leads';
const MAX_SLIP_COLUMNS: number = 5;
const RECEIPT_BASE_URL = (process.env.RECEIPT_BASE_URL ?? '').replace(/\/+$/, '');

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(
        Buffer.from(process.env.GOOGLE_SA_KEY_B64!, 'base64').toString('utf8'),
    ),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const SLIP_HEADERS = MAX_SLIP_COLUMNS === 1
    ? ['สลิป']
    : Array.from({ length: MAX_SLIP_COLUMNS }, (_, i) => `สลิป ${i + 1}`);

const HEADER = [
    'ชื่อ-นามสกุล', 'ชื่อเล่น', 'เบอร์โทร', 'วันที่', 'เวลา', 'รายการ',
    'ยอด (บาท)', 'ช่องทาง', 'ยอดสุทธิ (บาท)', 'ทำจริง', 'หมายเหตุ',
    ...SLIP_HEADERS,
];

const TOTAL_COLS = 11 + MAX_SLIP_COLUMNS;
const EMPTY_ROW = Array(TOTAL_COLS).fill('');

const PAYMENT_METHOD_TH: Record<string, string> = {
    cash: 'เงินสด', transfer: 'โอนเงิน', card: 'บัตร', free: 'ฟรี',
};

const LABELS = {
    next_appointment: 'นัดหมายถัดไป',
    no_date: 'ยังไม่ระบุวันนัดหมาย',
    no_follow_up: 'ไม่มีนัดหมายต่อ',
    cancelled: 'ยกเลิกนัด',
} as const;

// ───── Helpers ───────────────────────────────────────────────
function fmtDate(d?: Date | null): string {
    if (!d) return '';
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
    }).formatToParts(new Date(d));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('day')}/${get('month')}/${get('year')}`;
}

function fmtTime(d?: Date | null): string {
    if (!d) return '';
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(new Date(d));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('hour')}:${get('minute')}:${get('second')}`;
}

function parsePrice(price: any): number {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') return parseFloat(price) || 0;
    return 0;
}

function toAbsoluteUrl(path: string): string {
    if (!path) return '';
    const full = /^https?:\/\//i.test(path)
        ? path
        : `${RECEIPT_BASE_URL}/${path.replace(/^\/+/, '')}`;
    return encodeURI(full);
}

// สร้าง slip cells แบบ array ความยาว = MAX_SLIP_COLUMNS
function buildSlipCells(lead: LeadDocument): string[] {
    const slips = [lead.receiptUrl, ...(lead.receiptUrls ?? [])]
        .filter(Boolean)
        .map((u) => toAbsoluteUrl(u as string));
    const unique = [...new Set(slips)];

    const cells: string[] = [];
    for (let i = 0; i < MAX_SLIP_COLUMNS; i++) {
        if (unique[i]) {
            cells.push(`=HYPERLINK("${unique[i]}","ดูสลิป")`);
        } else {
            cells.push(i === 0 && unique.length === 0 ? '-' : '');
        }
    }
    return cells;
}

const emptySlipCells = (): string[] => Array(MAX_SLIP_COLUMNS).fill('');

// ───── Sheet tab helper ──────────────────────────────────────
async function ensureSheetTab(spreadsheetId: string, title: string) {
    const meta = await sheets.spreadsheets.get({
        spreadsheetId, fields: 'sheets.properties(title,sheetId)',
    });
    const exists = meta.data.sheets?.some((s) => s.properties?.title === title);
    if (exists) return;

    const defaultSheet = meta.data.sheets?.find((s) => s.properties?.title === 'Sheet1');
    if (defaultSheet && meta.data.sheets?.length === 1) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{
                    updateSheetProperties: {
                        properties: { sheetId: defaultSheet.properties!.sheetId!, title },
                        fields: 'title',
                    },
                }],
            },
        });
        return;
    }
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
}

// ───── Patient helpers ───────────────────────────────────────
function getPatientKey(lead: LeadDocument): string {
    if (lead.patientId) return String(lead.patientId);
    return lead.patient.tel || lead.patient.fullname || String(lead._id);
}

function getOrderKey(lead: LeadDocument): number {
    return (lead.appointments.date ?? lead.createdAt ?? new Date(0)).getTime();
}

function leadNeedsSync(lead: LeadDocument): boolean {
    if (!lead.syncedAt) return true;
    if (lead.appointments.status !== lead.syncedStatus) return true;
    if (lead.updatedAt && new Date(lead.updatedAt) > new Date(lead.syncedAt)) return true;
    return false;
}

function buildPatientRows(leads: LeadDocument[]): (string | number)[][] {
    const sorted = [...leads].sort((a, b) => getOrderKey(a) - getOrderKey(b));

    const patient = sorted[0].patient;
    const fullname = patient.fullname ?? '';
    const nickname = patient.nickname?.trim() || '-';
    const phone = patient.tel ? `'${patient.tel}` : '';

    const rows: (string | number)[][] = [];
    let firstRow = true;
    const nameCol = () => (firstRow ? fullname : '');
    const nicknameCol = () => (firstRow ? nickname : '');
    const phoneCol = () => (firstRow ? phone : '');

    for (const lead of sorted) {
        const apt = lead.appointments;
        const note = lead.note ?? '';

        switch (apt.status) {
            case 'arrived': {
                const procs = lead.procedures?.length
                    ? lead.procedures
                    : (lead.interests ?? []).map((i) => ({ name: i.name, price: '0' }));
                const channel = lead.payments?.method
                    ? PAYMENT_METHOD_TH[lead.payments.method] ?? lead.payments.method
                    : '';
                const rate = lead.payments?.serviceCharge?.rate ?? 0;
                const list = procs.length > 0 ? procs : [{ name: '', price: '0' }];

                list.forEach((p: any, idx) => {
                    const price = parsePrice(p.price);
                    const net = +(price * (1 - rate / 100)).toFixed(2);

                    if (idx === 0) {
                        rows.push([
                            nameCol(), nicknameCol(), phoneCol(),
                            fmtDate(apt.date), fmtTime(apt.date),
                            p.name, price || '', channel, net || '',
                            '', note,
                            ...buildSlipCells(lead),
                        ]);
                        firstRow = false;
                    } else {
                        rows.push([
                            '', '', '', '', '',
                            p.name, price || '', '', net || '',
                            '', '',
                            ...emptySlipCells(),
                        ]);
                    }
                });
                break;
            }

            case 'pending':
                rows.push([
                    nameCol(), nicknameCol(), phoneCol(),
                    LABELS.no_date, '', LABELS.next_appointment,
                    '', '', '', '', note,
                    ...buildSlipCells(lead),
                ]);
                firstRow = false;
                break;

            case 'scheduled':
            case 'rescheduled':
                rows.push([
                    nameCol(), nicknameCol(), phoneCol(),
                    fmtDate(apt.date), fmtTime(apt.date), LABELS.next_appointment,
                    '', '', '', '', note,
                    ...buildSlipCells(lead),
                ]);
                firstRow = false;
                break;

            case 'cancelled':
                rows.push([
                    nameCol(), nicknameCol(), phoneCol(),
                    fmtDate(apt.date), fmtTime(apt.date), LABELS.cancelled,
                    '', '', '', '', note,
                    ...buildSlipCells(lead),
                ]);
                firstRow = false;
                break;
        }
    }

    const lastStatus = sorted[sorted.length - 1].appointments.status;
    if (lastStatus === 'arrived') {
        rows.push([
            '', '', '', '', '', LABELS.no_follow_up, '', '', '', '', '',
            ...emptySlipCells(),
        ]);
    }

    rows.push(EMPTY_ROW);
    return rows;
}

// ───── Main sync ─────────────────────────────────────────────
export async function syncClinicLeadsToSheet(user: UserDocument) {
    if (!user.googleSheetId || !user.sheetSyncEnabled) {
        return { skipped: true, reason: 'sheet not configured' };
    }

    const leads = await AppointmentModel
        .find({ 'clinic.clinicId': user.clinicId })
        .lean<LeadDocument[]>();

    const currentCount = leads.length;
    const lastCount = user.lastSyncedLeadCount ?? 0;
    const countChanged = currentCount !== lastCount;

    if (currentCount === 0 && !countChanged) {
        return { skipped: true, reason: 'no leads' };
    }

    const needsSync = countChanged || leads.some(leadNeedsSync);
    if (!needsSync) {
        return { skipped: true, reason: 'no changes since last sync', leadCount: currentCount };
    }

    await ensureSheetTab(user.googleSheetId, SHEET_TAB);

    const byPatient = new Map<string, LeadDocument[]>();
    for (const lead of leads) {
        const key = getPatientKey(lead);
        if (!byPatient.has(key)) byPatient.set(key, []);
        byPatient.get(key)!.push(lead);
    }

    const groups = [...byPatient.values()].sort((a, b) => {
        const maxA = Math.max(...a.map(getOrderKey));
        const maxB = Math.max(...b.map(getOrderKey));
        return maxB - maxA;
    });

    const rows: (string | number)[][] = [HEADER];
    for (const g of groups) rows.push(...buildPatientRows(g));

    // clear กว้างเผื่อ MAX_SLIP_COLUMNS ลดลงในอนาคต
    await sheets.spreadsheets.values.clear({
        spreadsheetId: user.googleSheetId,
        range: `${SHEET_TAB}!A:Z`,
    });
    await sheets.spreadsheets.values.update({
        spreadsheetId: user.googleSheetId,
        range: `${SHEET_TAB}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
    });

    if (leads.length > 0) {
        const now = new Date();
        await AppointmentModel.bulkWrite(
            leads.map((lead) => ({
                updateOne: {
                    filter: { _id: lead._id },
                    update: { $set: { syncedAt: now, syncedStatus: lead.appointments.status } },
                    timestamps: false,
                },
            })),
            { ordered: false },
        );
    }

    await UserModel.updateOne(
        { _id: user._id },
        { $set: { lastSyncedLeadCount: currentCount } },
        { timestamps: false },
    );

    return {
        clinic: user.clinicName,
        branch: user.branch,
        patientCount: groups.length,
        rowsWritten: rows.length,
        syncedLeads: leads.length,
    };
}

export async function syncAllClinicsToSheet() {
    const users = await UserModel.find({
        googleSheetId: { $ne: null },
        sheetSyncEnabled: true,
    });

    const results = [];
    for (const user of users) {
        try {
            const r = await syncClinicLeadsToSheet(user);
            console.log(`[sheet-sync] ${user.clinicName} (${user.branch})`, r);
            results.push({ clinicId: user.clinicId, ...r });
        } catch (err: any) {
            console.error(`[sheet-sync] ${user.clinicName} failed:`, err.message);
            results.push({ clinicId: user.clinicId, error: err.message });
        }
    }
    return results;
}