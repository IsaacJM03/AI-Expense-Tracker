/**
 * Offline Sync Queue Service
 *
 * Provides offline-first support by queuing API operations when
 * the device is offline and automatically syncing when connectivity
 * is restored.
 *
 * Queue is stored in memory for this implementation.
 * Production: use AsyncStorage or SQLite for persistence.
 */

class OfflineSyncQueue {
  constructor() {
    this.queue = [];
    this.isOnline = true;
    this.isSyncing = false;
    this.listeners = [];
  }

  setOnline(online) {
    const wasOffline = !this.isOnline;
    this.isOnline = online;
    if (online && wasOffline) {
      this.processQueue();
    }
    this.notifyListeners();
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(l => l({
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.queue.length,
    }));
  }

  enqueue(operation) {
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
      ...operation,
    };
    this.queue.push(item);
    this.notifyListeners();
    return item;
  }

  async processQueue() {
    if (this.isSyncing || !this.isOnline || this.queue.length === 0) return;

    this.isSyncing = true;
    this.notifyListeners();

    const failed = [];

    while (this.queue.length > 0) {
      const item = this.queue.shift();

      try {
        await item.execute();
      } catch (error) {
        if (item.retryCount < item.maxRetries) {
          item.retryCount++;
          failed.push(item);
        } else {
          console.warn(`Sync item ${item.id} failed after ${item.maxRetries} retries:`, error.message);
          if (item.onFailed) {
            item.onFailed(error);
          }
        }
      }
    }

    this.queue = failed;
    this.isSyncing = false;
    this.notifyListeners();
  }

  getPendingCount() {
    return this.queue.length;
  }

  clearQueue() {
    this.queue = [];
    this.notifyListeners();
  }
}

export default new OfflineSyncQueue();
