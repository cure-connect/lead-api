import cron from "node-cron";
import { UserModel } from "../models/user";
import { getClinicMonthlySummary, getNewPatientsOfMonth, formatPatientListMessages } from "./clinic-summary.service";
import { pushMessage } from "./line.service";
import logger from "./logger.service";

export const startSummaryCronJob = () => {
    // ทุกวันที่ 1 เวลา 08:00 น. (Asia/Bangkok)
    cron.schedule(
        "0 8 1 * *",
        async () => {
            logger.info("Running monthly summary cron job");

            // เดือนที่แล้ว
            const now = new Date();
            const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
            const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

            const thMonth = new Date(year, lastMonth, 1).toLocaleString("th-TH", {
                month: "long",
                year: "numeric",
                timeZone: "Asia/Bangkok",
            });

            // ดึงทุกคลินิกที่มี lineGroupId
            const clinics = await UserModel.find({
                lineGroupId: { $ne: null },
            }).lean();

            for (const clinic of clinics) {
                try {
                    const [summary, patients] = await Promise.all([
                        getClinicMonthlySummary(clinic.clinicId, year, lastMonth),
                        getNewPatientsOfMonth(clinic.clinicId, year, lastMonth),
                    ]);

                    const summaryMessage = [
                        `📊 สรุปประจำเดือน ${thMonth}`,
                        `${clinic.clinicName} - ${clinic.branch}\n`,
                        `นัดหมายทั้งหมด: ${summary.totalAppointments} ครั้ง`,
                        `คนไข้ใหม่: ${summary.newPatients} คน`,
                        `ยอดรับสุทธิ: ${summary.totalRevenue.toLocaleString("th-TH")} บาท`,
                    ].join("\n");

                    await pushMessage(clinic.lineGroupId!, summaryMessage);

                    if (patients && patients.length > 0) {
                        const patientMessages = formatPatientListMessages(patients, thMonth);
                        for (const msg of patientMessages) {
                            await pushMessage(clinic.lineGroupId!, msg);
                        }
                    }

                    logger.info("Monthly summary sent", { clinicId: clinic.clinicId });
                } catch (err: any) {
                    logger.error("Failed to send monthly summary", {
                        clinicId: clinic.clinicId,
                        error: err.message,
                    });
                }
            }
        },
        { timezone: "Asia/Bangkok" }
    );

    logger.info("Monthly summary cron job scheduled");
};