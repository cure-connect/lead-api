import { AppointmentModel } from "../models/appointment";
import { PatientModel } from "../models/patient";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const getNewPatientIds = async (
    clinicId: number,
    startOfMonth: Date,
    endOfMonth: Date
): Promise<string[]> => {
    // หา appointment ที่มีวันนัดในเดือนนี้
    const appointmentsThisMonth = await AppointmentModel.find({
        "clinic.clinicId": clinicId,
        "appointments.date": { $gte: startOfMonth, $lte: endOfMonth },
        patientId: { $ne: null },
    }).lean();

    const patientIds = [...new Set(
        appointmentsThisMonth
            .map(a => a.patientId?.toString())
            .filter(Boolean) as string[]
    )];

    if (patientIds.length === 0) return [];

    // เช็คว่าแต่ละ patient มี appointment ก่อนเดือนนี้ไหม
    // ถ้าไม่มี = คนไข้ใหม่ของเดือนนี้
    const existingPatients = await AppointmentModel.find({
        "clinic.clinicId": clinicId,
        patientId: { $in: patientIds },
        "appointments.date": { $lt: startOfMonth },
    }).distinct("patientId");

    const existingSet = new Set(existingPatients.map(id => id.toString()));

    return patientIds.filter(id => !existingSet.has(id));
};


// export const getClinicMonthlySummary = async (
//     clinicId: number,
//     year: number,
//     month: number
// ) => {

//     // const startOfMonth = new Date(year, month, 1);
//     // const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

//     // const [appointments, newPatients] = await Promise.all([
//     //     AppointmentModel.find({
//     //         "clinic.clinicId": clinicId,
//     //         createdAt: { $gte: startOfMonth, $lte: endOfMonth },
//     //     }).lean(),
//     //     PatientModel.countDocuments({
//     //         clinicId,
//     //         createdAt: { $gte: startOfMonth, $lte: endOfMonth },
//     //     }),
//     // ]);

//     const startOfMonth = dayjs.tz(
//         `${year}-${String(month + 1).padStart(2, "0")}-01`,
//         "Asia/Bangkok"
//     ).startOf("month").toDate();

//     const endOfMonth = dayjs.tz(
//         `${year}-${String(month + 1).padStart(2, "0")}-01`,
//         "Asia/Bangkok"
//     ).endOf("month").toDate();

//     const [appointments, newPatients] = await Promise.all([
//         AppointmentModel.find({
//             "clinic.clinicId": clinicId,
//             "appointments.status": { $in: ["arrived", "scheduled"] },
//             "appointments.date": { $gte: startOfMonth, $lte: endOfMonth },
//         }).lean(),
//         PatientModel.countDocuments({
//             clinicId,
//             createdAt: { $gte: startOfMonth, $lte: endOfMonth },
//         }),
//     ]);

//     console.log('startOfMonth', startOfMonth)
//     console.log('endOfMonth', endOfMonth)
//     // ยอดสุทธิ = netAmount ถ้ามี service charge, ไม่งั้นใช้ amount
//     const totalRevenue = appointments.reduce((sum, appt) => {
//         const payment = appt.payments;
//         if (!payment?.amount) return sum;
//         const net = payment.serviceCharge?.netAmount ?? payment.amount;
//         return sum + net;
//     }, 0);

//     return {
//         totalAppointments: appointments.length,
//         newPatients,
//         totalRevenue,
//     };
// };

export const getClinicMonthlySummary = async (
    clinicId: number,
    year: number,
    month: number
) => {
    const startOfMonth = dayjs.tz(
        `${year}-${String(month + 1).padStart(2, "0")}-01`,
        "Asia/Bangkok"
    ).startOf("month").toDate();

    const endOfMonth = dayjs.tz(
        `${year}-${String(month + 1).padStart(2, "0")}-01`,
        "Asia/Bangkok"
    ).endOf("month").toDate();

    console.log("startOfMonth:", startOfMonth);
    console.log("endOfMonth:", endOfMonth);

    const [appointments, newPatientIds] = await Promise.all([
        AppointmentModel.find({
            "clinic.clinicId": clinicId,
            "appointments.status": { $in: ["arrived", "scheduled"] },
            "appointments.date": { $gte: startOfMonth, $lte: endOfMonth },
        }).lean(),
        getNewPatientIds(clinicId, startOfMonth, endOfMonth),
    ]);

    const totalRevenue = appointments.reduce((sum, appt) => {
        const payment = appt.payments;
        if (!payment?.amount) return sum;
        const net = payment.serviceCharge?.netAmount ?? payment.amount;
        return sum + net;
    }, 0);

    return {
        totalAppointments: appointments.length,
        newPatients: newPatientIds.length,
        totalRevenue,
    };
};

// export const getNewPatientsOfMonth = async (
//     clinicId: number,
//     year: number,
//     month: number
// ) => {
//     const startOfMonth = new Date(year, month, 1);
//     const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

//     const newPatients = await PatientModel.find({
//         clinicId,
//         createdAt: { $gte: startOfMonth, $lte: endOfMonth },
//     }).lean();

//     if (newPatients.length === 0) return null;

//     const patientIds = newPatients.map(p => p._id);

//     const appointments = await AppointmentModel.find({
//         "clinic.clinicId": clinicId,
//         patientId: { $in: patientIds },
//     }).lean();

//     const appointmentMap = new Map<string, any>();
//     for (const appt of appointments) {
//         const pid = appt.patientId?.toString();
//         if (!pid) continue;
//         const existing = appointmentMap.get(pid);
//         if (!existing || new Date(appt.createdAt!) < new Date(existing.createdAt)) {
//             appointmentMap.set(pid, appt);
//         }
//     }

//     return newPatients.map(p => ({
//         fullname: p.fullname,
//         interest: p.interest || null,
//         appointmentDate: appointmentMap.get(p._id.toString())?.appointments?.date || null,
//     }));
// };

export const getNewPatientsOfMonth = async (
    clinicId: number,
    year: number,
    month: number
) => {
    const startOfMonth = dayjs.tz(
        `${year}-${String(month + 1).padStart(2, "0")}-01`,
        "Asia/Bangkok"
    ).startOf("month").toDate();

    const endOfMonth = dayjs.tz(
        `${year}-${String(month + 1).padStart(2, "0")}-01`,
        "Asia/Bangkok"
    ).endOf("month").toDate();

    const newPatientIds = await getNewPatientIds(clinicId, startOfMonth, endOfMonth);
    if (newPatientIds.length === 0) return null;

    const patients = await PatientModel.find({
        _id: { $in: newPatientIds },
    }).lean();

    // ✅ filter เฉพาะ appointment ในเดือนนั้น
    const appointments = await AppointmentModel.find({
        "clinic.clinicId": clinicId,
        patientId: { $in: newPatientIds },
        "appointments.date": { $gte: startOfMonth, $lte: endOfMonth },
    }).lean();

    const appointmentMap = new Map<string, any>();
    for (const appt of appointments) {
        const pid = appt.patientId?.toString();
        if (!pid) continue;
        const existing = appointmentMap.get(pid);
        if (!existing || new Date(appt.createdAt!) < new Date(existing.createdAt)) {
            appointmentMap.set(pid, appt);
        }
    }

    return patients.map(p => ({
        fullname: p.fullname,
        interest: p.interest || null,
        appointmentDate: appointmentMap.get(p._id.toString())?.appointments?.date || null,
    }));
};

export const formatPatientListMessages = (
    patients: { fullname: string; interest: string | null; appointmentDate: Date | null }[],
    thMonth: string,
): string[] => {
    const LIMIT = 4500;
    const messages: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;
    let isFirstChunk = true;

    const header = [
        `รายชื่อคนไข้ใหม่\n`,
    ].join("\n");

    const footer = [
        `\nทั้งหมด: ${patients.length} คน`,
    ].join("\n");

    patients.forEach((p, i) => {
        const text = `${i + 1}. ${p.fullname}`;
        if (currentLength + text.length + footer.length > LIMIT) {
            const chunkHeader = isFirstChunk ? header : `(ต่อ)`;
            messages.push([chunkHeader, ...currentChunk].join("\n"));
            currentChunk = [text];
            currentLength = text.length;
            isFirstChunk = false;
        } else {
            currentChunk.push(text);
            currentLength += text.length;
        }
    });

    if (currentChunk.length > 0) {
        const chunkHeader = isFirstChunk ? header : `(ต่อ)`;
        messages.push([chunkHeader, ...currentChunk, footer].join("\n"));
    }

    return messages;
};