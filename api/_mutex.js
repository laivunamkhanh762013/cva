/**
 * In-process Mutex Lock Utility for Serializing Storage Writes
 *
 * Lưu ý: chỉ tuần tự hóa trong CÙNG một instance Node. Mọi handler phải dùng
 * chung `storeMutex` để create/approve/register không ghi đè lẫn nhau.
 * Giữa các instance serverless khác nhau vẫn có thể xảy ra race (Gist không
 * hỗ trợ ghi có điều kiện).
 */
class Mutex {
  constructor() {
    this._queue = Promise.resolve();
  }

  async run(taskFn) {
    let release;
    const waitPromise = new Promise(resolve => { release = resolve; });
    const previousQueue = this._queue;
    this._queue = this._queue.then(() => waitPromise);

    await previousQueue;
    try {
      return await taskFn();
    } finally {
      release();
    }
  }
}

// Một khóa dùng chung cho toàn bộ dữ liệu Gist (orders + users + processed)
const storeMutex = new Mutex();

module.exports = { Mutex, storeMutex };
