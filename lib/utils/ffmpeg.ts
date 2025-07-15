import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { resolve } from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);


export async function convertWebmToMp4(inputPath:string): Promise<string> {
  const outputPath = inputPath.replace(/\.webm$/,'.mp4');

  return new Promise((resolve,reject) => {
    ffmpeg(inputPath)
      .videoCodec('copy')
      .audioCodec('copy')
      .outputOption('-movflags faststart')
      .on('end',() => { 
        console.log('Conversion completed succesfully ');
        resolve(outputPath);
        
      })
      .on('error' , (err) => {
        console.log('conversion failed ' , err.message);
        reject(new Error(`FFmpeg conversion failed: ${err.message}`));
      })

      .save(outputPath);
  });
}