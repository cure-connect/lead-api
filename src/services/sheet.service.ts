import { google } from 'googleapis';
import { AppointmentModel, LeadDocument } from '../models/appointment';
import { UserModel, UserDocument } from '../models/user';

const TZ = 'Asia/Bangkok';
const SHEET_TAB = 'leads';

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(
        Buffer.from(process.env.GOOGLE_SA_KEY_B64!, 'base64').toString('utf8'),
    ),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const HEADER = [
    'ชื่อ-นามสกุล', 'ชื่อเล่น', 'เบอร์โทร', 'วันที่', 'เวลา', 'รายการ',
    'ยอด (บาท)', 'ช่องทาง', 'ยอดสุทธิ (บาท)', 'ทำจริง', 'หมายเหตุ',
];

const PAYMENT_METHOD_TH: Record<string, string> = {
    cash: 'เงินสด',
    transfer: 'โอนเงิน',
    card: 'บัตร',
    free: 'ฟรี',
};

const LABELS = {
    next_appointment: 'นัดหมายถัดไป',
    no_date: 'ยังไม่ระบุวันนัดหมาย',
    no_follow_up: 'ไม่มีนัดหมายต่อ',
    cancelled: 'ยกเลิกนัด',
} as const;

const EMPTY_ROW = ['', '', '', '', '', '', '', '', '', '', ''];

// ───── Date helpers ──────────────────────────────────────────
function fmtDate(d?: Date | null): string {
    if (!d) return '';
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ,
        day: '2-digit', month: '2-digit', year: 'numeric',
    }).formatToParts(new Date(d));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('day')}/${get('month')}/${get('year')}`;
}

function fmtTime(d?: Date | null): string {
    if (!d) return '';
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ,
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(new Date(d));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('hour')}:${get('minute')}:${get('second')}`;
}

function parsePrice(price: any): number {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') return parseFloat(price) || 0;
    return 0;
}

// ───── Sheet tab helper ──────────────────────────────────────
async function ensureSheetTab(spreadsheetId: string, title: string) {
    const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties(title,sheetId)',
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
                const arrivedMark = '';

                const list = procs.length > 0 ? procs : [{ name: '', price: '0' }];

                list.forEach((p: any, idx) => {
                    const price = parsePrice(p.price);
                    const net = +(price * (1 - rate / 100)).toFixed(2);

                    if (idx === 0) {
                        rows.push([
                            nameCol(), nicknameCol(), phoneCol(),
                            fmtDate(apt.date), fmtTime(apt.date),
                            p.name,
                            price || '', channel, net || '',
                            arrivedMark, note,
                        ]);
                        firstRow = false;
                    } else {
                        rows.push([
                            '', '', '', '', '',
                            p.name,
                            price || '', '', net || '',
                            '', '',
                        ]);
                    }
                });
                break;
            }

            case 'pending':
                rows.push([
                    nameCol(), nicknameCol(), phoneCol(),
                    LABELS.no_date, '',
                    LABELS.next_appointment,
                    '', '', '', '', note,
                ]);
                firstRow = false;
                break;

            case 'scheduled':
            case 'rescheduled':
                rows.push([
                    nameCol(), nicknameCol(), phoneCol(),
                    fmtDate(apt.date), fmtTime(apt.date),
                    LABELS.next_appointment,
                    '', '', '', '', note,
                ]);
                firstRow = false;
                break;

            case 'cancelled':
                rows.push([
                    nameCol(), nicknameCol(), phoneCol(),
                    fmtDate(apt.date), fmtTime(apt.date),
                    LABELS.cancelled,
                    '', '', '', '', note,
                ]);
                firstRow = false;
                break;
        }
    }

    const lastStatus = sorted[sorted.length - 1].appointments.status;
    if (lastStatus === 'arrived') {
        rows.push(['', '', '', '', '', LABELS.no_follow_up, '', '', '', '', '']);
    }

    rows.push(EMPTY_ROW);
    return rows;
}

function leadNeedsSync(lead: LeadDocument): boolean {
    // ยังไม่เคย sync
    if (!lead.syncedAt) return true;

    // status เปลี่ยนตั้งแต่ sync ล่าสุด
    if (lead.appointments.status !== lead.syncedStatus) return true;

    // มีการแก้ข้อมูลอื่นๆ ตั้งแต่ sync ล่าสุด (procedures, payments, note ฯลฯ)
    if (lead.updatedAt && new Date(lead.updatedAt) > new Date(lead.syncedAt)) {
        return true;
    }

    return false;
}

// ───── Main sync ─────────────────────────────────────────────

export async function syncClinicLeadsToSheet(user: UserDocument) {
    if (!user.googleSheetId || !user.sheetSyncEnabled) {
        return { skipped: true, reason: 'sheet not configured' };
    }

    const leads = await AppointmentModel
        .find({ 'clinic.clinicId': user.clinicId })
        .lean<LeadDocument[]>();

    if (leads.length === 0) {
        return { skipped: true, reason: 'no leads' };
    }

    const needsSync = leads.some(leadNeedsSync);
    if (!needsSync) {
        return {
            skipped: true,
            reason: 'no changes since last sync',
            leadCount: leads.length,
        };
    }

    await ensureSheetTab(user.googleSheetId, SHEET_TAB);

    // group + sort + build rows (เหมือนเดิม)
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

    await sheets.spreadsheets.values.clear({
        spreadsheetId: user.googleSheetId,
        range: `${SHEET_TAB}!A:K`,
    });
    await sheets.spreadsheets.values.update({
        spreadsheetId: user.googleSheetId,
        range: `${SHEET_TAB}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
    });

    const now = new Date();
    await AppointmentModel.bulkWrite(
        leads.map((lead) => ({
            updateOne: {
                filter: { _id: lead._id },
                update: {
                    $set: {
                        syncedAt: now,
                        syncedStatus: lead.appointments.status,
                    },
                },
                // ป้องกัน timestamps:true ดัน updatedAt ขึ้นทุกครั้ง (จะทำให้ลูปไม่จบ)
                timestamps: false,
            },
        })),
        { ordered: false },
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