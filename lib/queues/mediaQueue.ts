import { Queue } from "bullmq";

export const mediaQueue = new Queue('media-processing' , {
    connection:{
        url:process.env.REDIS_URL!
    }
})