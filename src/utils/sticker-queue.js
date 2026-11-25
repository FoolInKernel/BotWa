import { createJobQueue } from './job-queue.js'

// Batas 2 job berat bersamaan agar aman di STB RAM 2 GB.
export const enqueueStickerJob = createJobQueue(2)
