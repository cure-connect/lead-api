import logger from "./logger.service";

const LINE_API = "https://api.line.me/v2/bot/message/push";

export const sendLineGroupMessage = async (
    groupId: string,
    message: string
): Promise<void> => {
    const token = process.env.LINE_CHANNEL_TOKEN;
    if (!token) {
        logger.warn("LINE_CHANNEL_TOKEN not set, skipping notification");
        return;
    }

    try {
        const res = await fetch(LINE_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                to: groupId,
                messages: [{ type: "text", text: message }],
            }),
        });

        if (!res.ok) {
            const err = await res.json();
            logger.error("LINE push failed", { groupId, error: err });
        } else {
            logger.info("LINE notification sent", { groupId });
        }
    } catch (error: any) {
        logger.error("LINE push error", { error: error.message });
    }
};

export const pushMessage = async (to: string, text: string): Promise<void> => {
    const token = process.env.LINE_CHANNEL_TOKEN;
    if (!token) return;

    try {
        await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                to,
                messages: [{ type: "text", text }],
            }),
        });
    } catch (error: any) {
        logger.error("LINE push error", { error: error.message });
    }
};