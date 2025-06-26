import { Worker } from "bullmq";
import { convertWebmToMp4 } from "@/lib/utils/ffmpeg";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/utils/prisma";
import B2 from "backblaze-b2";

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID!,
  applicationKey: process.env.B2_APPLICATION_KEY!,
});

new Worker("media-processing", async (job) => {
  const { inputPath, sessionId, userId, type = "AUDIO_VIDEO" } = job.data;

  const outputPath = inputPath.replace(".webm", ".mp4");

  try {
    // 1. Convert using FFmpeg
    console.log(" Converting:", inputPath);
    await convertWebmToMp4(inputPath);

    // 2. Authorize and upload to Backblaze
    await b2.authorize();
    const { data: uploadUrlData } = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID!,
    });

    const buffer = fs.readFileSync(outputPath);
    const fileName = `media/${uuidv4()}.mp4`;

    await b2.uploadFile({
      uploadUrl: uploadUrlData.uploadUrl,
      uploadAuthToken: uploadUrlData.authorizationToken,
      fileName,
      data: buffer,
      mime: "video/mp4",
      hash: "do_not_verify",
    });

    const fileUrl = `${process.env.B2_PUBLIC_URL}/${fileName}`;

    // 3. Save metadata to DB
    await prisma.mediaFile.create({
      data: {
        sessionId,
        url: fileUrl,
        type,
        status: "COMPLETE",
        s3Key: fileName,
        isFinal: false,
      },
    });

    // 4. Cleanup
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    console.log(" Job completed:", job.id);
  } catch (err) {
    console.error(" Worker failed:", err);
    throw err; // will trigger retry if enabled
  }
}, {
  connection: {
    url: process.env.REDIS_URL!,
  },
});
