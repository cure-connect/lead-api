import multer from "multer";
import path from "path";
import fs from "fs";

const createUploader = (folderName: string, filePrefix: string) => {
    const uploadDir = path.join(__dirname, `../../uploads/${folderName}`);
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = path.extname(file.originalname);
            cb(null, `${filePrefix}-${uniqueSuffix}${ext}`);
        },
    });

    const fileFilter = (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: multer.FileFilterCallback
    ) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG, WEBP, HEIC images are allowed"));
        }
    };

    return multer({
        storage,
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    });
};

export const uploadSlip = createUploader("slips", "slip");
export const uploadReceipt = createUploader("receipts", "receipt");

export const MAX_FILES = 5;