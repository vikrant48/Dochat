import multer from "multer";
import multerS3 from "multer-s3";
import { s3, BUCKET_NAME } from "../config/s3Config";

export const upload = multer({
    storage: multerS3({
        s3: s3 as any,
        bucket: BUCKET_NAME,
        metadata: function (req: any, file: any, cb: any) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req: any, file: any, cb: any) {
            const fileExtension = file.originalname?.split('.').pop() || 'jpg';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
            cb(null, `uploads/${fileName}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req: any, file: any, cb: any) => {
        if (file.mimetype?.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'), false);
        }
    }
});
