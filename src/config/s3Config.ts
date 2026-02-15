import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const s3Config: any = {
    region: process.env.AWS_REGION || "us-east-1",
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
};

if (process.env.AWS_S3_ENDPOINT) {
    s3Config.endpoint = process.env.AWS_S3_ENDPOINT;
}

export const s3 = new S3Client(s3Config);

export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "";

if (!BUCKET_NAME || !process.env.AWS_ACCESS_KEY_ID) {
    console.warn('WARNING: AWS S3 credentials or bucket name are missing in .env file.');
}
