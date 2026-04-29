import { Router, Request, Response } from "express";
import crypto from "crypto";
import { UserModel } from "../models/user";
import { AppointmentModel } from "../models/appointment";
import { PatientModel } from "../models/patient";
import logger from "../services/logger.service";
import { getClinicMonthlySummary, getNewPatientsOfMonth, formatPatientListMessages } from "../services/clinic-summary.service";

const router = Router();

function verifySignature(rawBody: string, signature: string): boolean {
    const hash = crypto
        .createHmac("SHA256", process.env.LINE_CHANNEL_SECRET!)
        .update(rawBody)
        .digest("base64");
    return hash === signature;
}

router.post("/webhook/line", async (req: Request, res: Response) => {
    const signature = req.headers["x-line-signature"] as string;

    const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : JSON.stringify(req.body);

    if (!verifySignature(rawBody, signature)) {
        return res.sendStatus(401);
    }

    const payload = JSON.parse(rawBody);
    const events = payload.events ?? [];

    for (const event of events) {
        if (event.source?.type !== "group") continue;

        const groupId: string = event.source.groupId;

        // ดึง userId ของคนที่พิมพ์ → หา clinicId จาก User model
        // แต่ใน lead-api เราไม่รู้ว่า userId ของ LINE map กับ clinicId ไหน
        // → ใช้ text command "/connect {clinicId}" แทน
        if (event.type === "message" && event.message?.type === "text") {
            const text: string = event.message.text.trim();

            if (text === "/myid") {
                const userId = event.source.userId;
                await replyMessage(event.replyToken, `LINE User ID ของคุณ:\n${userId}`);
            }

            const addAdminMatch = text.match(/^\/addadmin\s+(.+)$/);
            if (addAdminMatch) {
                const clinicName = addAdminMatch[1].trim();
                const userId = event.source.userId;

                const clinic = await UserModel.findOne({
                    clinicName: { $regex: new RegExp(`^${clinicName}$`, "i") },
                });

                if (!clinic) {
                    await replyMessage(event.replyToken, `❌ ไม่พบคลินิก: ${clinicName}`);
                    continue;
                }

                // ถ้ามี admin แล้ว ต้องเป็น admin เท่านั้นถึงเพิ่มได้
                if (clinic.lineAdminIds && clinic.lineAdminIds.length > 0) {
                    if (!clinic.lineAdminIds.includes(userId)) {
                        await replyMessage(event.replyToken, `❌ คุณไม่มีสิทธิ์เพิ่มแอดมิน`);
                        continue;
                    }
                }

                await UserModel.findOneAndUpdate(
                    { clinicName: { $regex: new RegExp(`^${clinicName}$`, "i") } },
                    { $addToSet: { lineAdminIds: userId } }
                );

                await replyMessage(event.replyToken, `✅ เพิ่มแอดมินสำเร็จ!\n${clinic.clinicName}`);
            }

            const removeAdminMatch = text.match(/^\/removeadmin\s+(.+)$/);
            if (removeAdminMatch) {
                const clinicName = removeAdminMatch[1].trim();
                const userId = event.source.userId;

                const clinic = await UserModel.findOne({
                    clinicName: { $regex: new RegExp(`^${clinicName}$`, "i") },
                    lineAdminIds: userId, // ต้องเป็น admin ของคลินิกนี้ถึงลบได้
                });

                if (!clinic) {
                    await replyMessage(event.replyToken, `❌ ไม่พบคลินิก หรือคุณไม่ได้เป็นแอดมินของ: ${clinicName}`);
                    continue;
                }

                await UserModel.findOneAndUpdate(
                    { clinicName: { $regex: new RegExp(`^${clinicName}$`, "i") } },
                    { $pull: { lineAdminIds: userId } }
                );

                await replyMessage(event.replyToken, `✅ ลบแอดมินสำเร็จ!\n${clinic.clinicName}`);
            }

            const connectMatch = text.match(/^\/connect\s+(.+)$/);
            if (connectMatch) {
                const clinicName = connectMatch[1].trim();
                const userId = event.source.userId;

                if (!await isAuthorized(clinicName, userId)) {
                    await replyMessage(event.replyToken, `❌ คุณไม่มีสิทธิ์เชื่อมต่อคลินิก: ${clinicName}`);
                    continue;
                }

                const clinic = await UserModel.findOneAndUpdate(
                    { clinicName: { $regex: new RegExp(`^${clinicName}$`, "i") } },
                    { lineGroupId: groupId },
                    { new: true }
                );

                if (clinic) {
                    logger.info("LINE group connected", { clinicName, groupId });
                    await replyMessage(event.replyToken, `✅ เชื่อมต่อกลุ่มสำเร็จ!\n${clinic.clinicName} - ${clinic.branch}`);
                } else {
                    await replyMessage(event.replyToken, `❌ ไม่พบคลินิก : ${clinicName}`);
                }
            }

            const disconnectMatch = text.match(/^\/disconnect\s+(.+)$/);
            if (disconnectMatch) {
                const clinicName = disconnectMatch[1].trim();
                const userId = event.source.userId;

                if (!await isAuthorized(clinicName, userId)) {
                    await replyMessage(event.replyToken, `❌ คุณไม่มีสิทธิ์ยกเลิกเชื่อมต่อคลินิก: ${clinicName}`);
                    continue;
                }

                const clinic = await UserModel.findOneAndUpdate(
                    {
                        clinicName: { $regex: new RegExp(`^${clinicName}$`, "i") },
                        lineGroupId: groupId  // ห้าม disconnect ข้ามกลุ่ม
                    },
                    { lineGroupId: null },
                    { new: true }
                );

                if (clinic) {
                    logger.info("LINE group disconnected", { clinicName: clinic.clinicName, groupId });
                    await replyMessage(event.replyToken, `✅ ยกเลิกการเชื่อมต่อสำเร็จ!\n${clinic.clinicName} - ${clinic.branch}`);
                } else {
                    await replyMessage(event.replyToken, `❌ ไม่พบคลินิก: ${clinicName} ในกลุ่มนี้`);
                }
            }

            if (text === "/คนไข้ใหม่") {
                const clinic = await UserModel.findOne({ lineGroupId: groupId }).lean();

                if (!clinic) {
                    await replyMessage(event.replyToken, `❌ กลุ่มนี้ยังไม่ได้เชื่อมต่อกับคลินิกใด`);
                    continue;
                }

                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

                const newPatients = await PatientModel.find({
                    clinicId: clinic.clinicId,
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
                }).lean();

                if (newPatients.length === 0) {
                    await replyMessage(event.replyToken, `ไม่มีคนไข้ใหม่ในเดือนนี้`);
                    continue;
                }

                // ดึง appointment ล่าสุดของแต่ละ patient
                const patientIds = newPatients.map(p => p._id);

                const appointments = await AppointmentModel.find({
                    "clinic.clinicId": clinic.clinicId,
                    patientId: { $in: patientIds },
                }).lean();

                // map appointment ล่าสุดเข้า patient
                const appointmentMap = new Map<string, any>();
                for (const appt of appointments) {
                    const pid = appt.patientId?.toString();
                    if (!pid) continue;
                    const existing = appointmentMap.get(pid);
                    if (!existing || new Date(appt.createdAt!) > new Date(existing.createdAt)) {
                        appointmentMap.set(pid, appt);
                    }
                }

                // รวม patient + appointment แล้วแยกกลุ่ม
                const combined = newPatients.map(p => ({
                    fullname: p.fullname,
                    interest: p.interest || null,
                    appointmentDate: appointmentMap.get(p._id.toString())?.appointments?.date || null,
                }));

                const scheduled = combined
                    .filter(p => p.appointmentDate)
                    .sort((a, b) => new Date(a.appointmentDate!).getTime() - new Date(b.appointmentDate!).getTime());

                const unscheduled = combined.filter(p => !p.appointmentDate);
                const sorted = [...scheduled, ...unscheduled];

                const formatDate = (date: Date) =>
                    new Date(date).toLocaleString("th-TH", {
                        timeZone: "Asia/Bangkok",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    });

                const formatLead = (p: any, index: number) => {
                    const interest = p.interest || "-";
                    const date = p.appointmentDate ? formatDate(p.appointmentDate) : "ยังไม่นัด";
                    return `${index}. ${p.fullname}\n   - ${interest}\n   - ${date}`;
                };

                const thMonth = now.toLocaleString("th-TH", {
                    month: "long",
                    year: "numeric",
                    timeZone: "Asia/Bangkok",
                });

                const header = [
                    `👤 คนไข้ใหม่ ${thMonth}`,
                    `${clinic.clinicName} - ${clinic.branch}\n`,
                ].join("\n");

                const footer = [
                    `\nนัดแล้ว: ${scheduled.length} คน  ยังไม่นัด: ${unscheduled.length} คน`,
                ].join("\n");

                const LIMIT = 4500;
                const messages: string[] = [];
                let currentChunk: string[] = [];
                let currentLength = header.length;
                let isFirstChunk = true;

                sorted.forEach((p, i) => {
                    const leadText = formatLead(p, i + 1);

                    if (currentLength + leadText.length + footer.length > LIMIT) {
                        const chunkHeader = isFirstChunk ? header : `📋 (ต่อ) ${thMonth}`;
                        messages.push([chunkHeader, ...currentChunk].join("\n"));
                        currentChunk = [leadText];
                        currentLength = leadText.length;
                        isFirstChunk = false;
                    } else {
                        currentChunk.push(leadText);
                        currentLength += leadText.length;
                    }
                });

                if (currentChunk.length > 0) {
                    const chunkHeader = isFirstChunk ? header : `📋 (ต่อ) ${thMonth}`;
                    messages.push([chunkHeader, ...currentChunk, footer].join("\n"));
                }

                await replyMessage(event.replyToken, messages[0]);
                for (let i = 1; i < messages.length; i++) {
                    await pushMessage(groupId, messages[i]);
                }
            }

            if (text === "/สรุป") {
                const clinic = await UserModel.findOne({ lineGroupId: groupId }).lean();
                if (!clinic) {
                    await replyMessage(event.replyToken, `❌ กลุ่มนี้ยังไม่ได้เชื่อมต่อกับคลินิกใด`);
                    continue;
                }

                const now = new Date();
                const [summary, patients] = await Promise.all([
                    getClinicMonthlySummary(clinic.clinicId, now.getFullYear(), now.getMonth()),
                    getNewPatientsOfMonth(clinic.clinicId, now.getFullYear(), now.getMonth()),
                ]);

                const thMonth = now.toLocaleString("th-TH", {
                    month: "long", year: "numeric", timeZone: "Asia/Bangkok",
                });

                const summaryMessage = [
                    `📊 สรุปประจำเดือน ${thMonth}`,
                    `${clinic.clinicName} - ${clinic.branch}\n`,
                    `นัดหมายทั้งหมด: ${summary.totalAppointments} ครั้ง`,
                    `คนไข้ใหม่: ${summary.newPatients} คน`,
                    `ยอดรับสุทธิ: ${summary.totalRevenue.toLocaleString("th-TH")} บาท`,
                ].join("\n");

                // ส่ง summary ด้วย reply
                await replyMessage(event.replyToken, summaryMessage);

                // ส่ง patient list ด้วย push
                if (patients && patients.length > 0) {
                    const patientMessages = formatPatientListMessages(patients, thMonth);
                    for (const msg of patientMessages) {
                        await pushMessage(groupId, msg);
                    }
                }
            }
        }
    }

    res.sendStatus(200);
});

async function replyMessage(replyToken: string, text: string) {
    await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LINE_CHANNEL_TOKEN}`,
        },
        body: JSON.stringify({
            replyToken,
            messages: [{ type: "text", text }],
        }),
    });
}

async function pushMessage(to: string, text: string) {
    await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LINE_CHANNEL_TOKEN}`,
        },
        body: JSON.stringify({
            to,
            messages: [{ type: "text", text }],
        }),
    });
}

async function isAuthorized(clinicName: string, userId: string): Promise<boolean> {
    const clinic = await UserModel.findOne({
        clinicName: { $regex: new RegExp(`^${clinicName}$`, "i") },
    }).lean();

    if (!clinic) return false;
    if (!clinic.lineAdminIds || clinic.lineAdminIds.length === 0) return true; // bootstrap ครั้งแรก
    return clinic.lineAdminIds.includes(userId);
}

export default router;