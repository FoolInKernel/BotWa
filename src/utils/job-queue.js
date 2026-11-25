/**
 * Antrian job in-memory sederhana untuk membatasi pekerjaan berat
 * (konversi stiker/ffmpeg) di perangkat RAM terbatas seperti STB.
 */
export function createJobQueue(maxConcurrent) {
  let activeJobs = 0
  const queue = []

  function processQueue() {
    while (activeJobs < maxConcurrent && queue.length > 0) {
      const job = queue.shift()
      activeJobs++
      job().finally(() => {
        activeJobs--
        processQueue()
      })
    }
  }

  return function enqueue(task) {
    return new Promise((resolve, reject) => {
      queue.push(async () => {
        try {
          resolve(await task())
        } catch (err) {
          reject(err)
        }
      })
      processQueue()
    })
  }
}
