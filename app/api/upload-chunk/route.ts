import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/prisma';
import B2 from 'backblaze-b2';
import { v4 as uuidv4 } from 'uuid';

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID ?? '',
  applicationKey: process.env.B2_APP_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId')?.toString();
    const userId = formData.get('userId')?.toString();
    const type = formData.get('type')?.toString() || 'video';

    if (!file || !sessionId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await b2.authorize(); // Authorize the B2 client
    const { data: uploadUrlData } = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID!,
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `media/${uuidv4()}.webm`;

    await b2.uploadFile({
      uploadUrl: uploadUrlData.uploadUrl,
      uploadAuthToken: uploadUrlData.authorizationToken,
      fileName,
      data: buffer,
     
    });

    const fileUrl = `${process.env.B2_PUBLIC_URL}/${fileName}`;

    // Save metadata in the DB
    const media = await prisma.mediaFile.create({
      data: {
        sessionId,
        url: fileUrl,
        type: 'AUDIO_VIDEO',
        status: 'COMPLETE',
        s3Key: fileName,
        isFinal: false,
      },
    });

    return NextResponse.json({ success: true, media }, { status: 201 });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
