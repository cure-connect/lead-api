import { UserModel } from "../models/user";
import { sendLineGroupMessage } from "./line.service";

export const notifyNewLead = async (
    clinicId: number,
    patientName: string,
    status: string,
    interests: string[],
    appointmentDate?: Date,
    depositAmount?: number,
    referralChannel?: string
): Promise<void> => {
    const clinic = await UserModel.findOne({ clinicId }).lean();
    if (!clinic?.lineGroupId) return;

    const statusLabel: Record<string, string> = {
        pending: "ยังไม่นัด",
        scheduled: "นัดแล้ว",
    };

    const interestText =
        interests.length > 0 ? `สนใจ: ${interests.join(", ")}` : "";

    let appointmentText = "";
    if (status === "scheduled" && appointmentDate) {
        const date = new Date(appointmentDate);
        const formatted = date.toLocaleString("th-TH", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
        appointmentText = `นัดหมาย: ${formatted}`;
    }

    const depositText = depositAmount && depositAmount > 0
        ? `มัดจำ: ${depositAmount.toLocaleString("th-TH")} บาท`
        : "";

    const referralText = referralChannel
        ? `ช่องทาง: ${referralChannel}`
        : "";

    const message = [
        `📥 มี Lead ใหม่เข้ามา!`,
        `${clinic.clinicName} - ${clinic.branch}`,
        `\nชื่อ: ${patientName}`,
        `สถานะ: ${statusLabel[status] || status}`,
        appointmentText,
        interestText,
        depositText,
        referralText,
    ]
        .filter(Boolean)
        .join("\n");

    await sendLineGroupMessage(clinic.lineGroupId, message);
};

export const notifyStatusChange = async (
    clinicId: number,
    patientName: string,
    status: "rescheduled" | "cancelled",
    note?: string,
    appointmentDate?: Date
): Promise<void> => {
    const clinic = await UserModel.findOne({ clinicId }).lean();
    if (!clinic?.lineGroupId) return;

    const isRescheduled = status === "rescheduled";

    let dateText = "";
    if (isRescheduled && appointmentDate) {
        const formatted = new Date(appointmentDate).toLocaleString("th-TH", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
        dateText = `นัดใหม่: ${formatted}`;
    }

    const noteText = note ? `หมายเหตุ: ${note}` : "";

    const message = [
        isRescheduled ? `🔄 มีการเลื่อนนัดหมาย!` : `❌ มีการยกเลิกนัดหมาย!`,
        `${clinic.clinicName} - ${clinic.branch}\n`,
        `ชื่อ: ${patientName}`,
        dateText,
        noteText,
    ]
        .filter(Boolean)
        .join("\n");

    await sendLineGroupMessage(clinic.lineGroupId, message);
};