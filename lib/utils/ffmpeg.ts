import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { resolve } from 'path';
import fs from 'fs';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function convertWebmToMp4(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.webm$/, '.mp4');

  if (!fs.existsSync(inputPath) || fs.statSync(inputPath).size === 0) {
    throw new Error(`Input file is empty or does not exist: ${inputPath}`);
  }

  console.log(`[FFMPEG] Converting ${inputPath} to ${outputPath}`);

  try {
    return await attemptConversion(inputPath, outputPath, false);
  } catch (primaryError) {
    const primaryErrorMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
    console.warn(`[FFMPEG] Primary conversion failed, attempting fallback. Reason: ${primaryErrorMessage}`);
    
    try {
      return await attemptConversion(inputPath, outputPath, true);
    } catch (fallbackError) {
      const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.error(`[FFMPEG] All conversions failed for ${inputPath}`);
      throw new Error(`FFmpeg conversion failed. Fallback Reason: ${fallbackErrorMessage}`);
    }
  }
}

async function attemptConversion(inputPath: string, outputPath: string, useFallback: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);
    const conversionType = useFallback ? 'fallback' : 'primary';
    
    if (useFallback) {
      // More lenient fallback settings
      command = command
        .videoCodec('libx264').audioCodec('aac')
        .outputOptions(['-movflags faststart', '-pix_fmt yuv420p', '-preset ultrafast', '-crf 23', '-ac 2', '-ar 44100', '-b:a 128k'])
        .inputOptions(['-err_detect ignore_err', '-fflags +genpts+igndts', '-avoid_negative_ts make_zero']);
    } else {
      // Primary, more compatible settings
      command = command
        .videoCodec('libx264').audioCodec('aac')
        .outputOptions(['-movflags faststart', '-pix_fmt yuv420p', '-profile:v baseline', '-level 3.0', '-ac 2', '-ar 44100', '-b:a 128k'])
        .inputOptions(['-fflags +genpts', '-avoid_negative_ts make_zero']);
    }

    command
      .on('end', () => {
        console.log(`[FFMPEG] ${conversionType} conversion completed: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err, stdout, stderr) => {
        const errorMessage = `FFmpeg ${conversionType} conversion failed: ${err.message}\nStderr: ${stderr}`;
        // Clean up failed output file
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(new Error(errorMessage));
      });

    command.save(outputPath);
  });
}

export async function testFFmpegInstallation(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg()
      .on('end', () => resolve(true))
      .on('error', (err) => {
        console.error('[FFMPEG-TEST] FFmpeg is not installed or configured correctly:', err.message);
        resolve(false);
      })
      .format('null')
      .input('testsrc=duration=1:size=1x1:rate=1')
      .inputFormat('lavfi')
      .output('/dev/null')
      .run();
  });
}