import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function convertWebmToMp4(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.webm$/, '.mp4');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-movflags faststart'
      ])
      .on('end', () => {
        console.log(' FFmpeg conversion done');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(' FFmpeg error:', err.message);
        reject(err);
      })
      .save(outputPath);
  });
}
