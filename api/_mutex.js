/**
 * In-process Mutex Lock Utility for Serializing Storage Writes
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

module.exports = { Mutex };
