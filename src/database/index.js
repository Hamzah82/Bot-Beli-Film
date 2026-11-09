/**
 * Database module - provides high-level access to data
 */

const jsonStorage = require('./jsonStorage');

// User-level locks for preventing race conditions
const userLocks = new Map();

/**
 * Acquire lock for user
 */
async function acquireUserLock(userId) {
  while (userLocks.has(userId)) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  userLocks.set(userId, true);
}

/**
 * Release lock for user
 */
function releaseUserLock(userId) {
  userLocks.delete(userId);
}

/**
 * Films operations
 */
const films = {
  async getAll() {
    const data = await jsonStorage.readJSON('films.json');
    return data?.films || [];
  },

  async getById(id) {
    const allFilms = await this.getAll();
    return allFilms.find(film => film.id === id) || null;
  },

  async create(filmData) {
    return await jsonStorage.updateJSON('films.json', (data) => {
      data.films.push(filmData);
      return data;
    });
  },

  async update(id, updates) {
    return await jsonStorage.updateJSON('films.json', (data) => {
      const index = data.films.findIndex(film => film.id === id);
      if (index !== -1) {
        data.films[index] = { ...data.films[index], ...updates, updated_at: new Date().toISOString() };
      }
      return data;
    });
  },

  async delete(id) {
    return await jsonStorage.updateJSON('films.json', (data) => {
      data.films = data.films.filter(film => film.id !== id);
      return data;
    });
  },

  async exists(id) {
    const film = await this.getById(id);
    return film !== null;
  }
};

/**
 * Transactions operations
 */
const transactions = {
  async getAll() {
    const data = await jsonStorage.readJSON('transactions.json');
    return data?.transactions || [];
  },

  async getById(id) {
    const allTransactions = await this.getAll();
    return allTransactions.find(tx => tx.id === id) || null;
  },

  async getByUserId(userId) {
    const allTransactions = await this.getAll();
    return allTransactions.filter(tx => tx.user_id === userId);
  },

  async getPendingByUserId(userId) {
    const allTransactions = await this.getAll();
    const now = new Date();
    const EXPIRY_HOURS = 24;
    
    return allTransactions.find(tx => {
      if (tx.user_id !== userId) return false;
      
      // Exclude final statuses
      if (['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(tx.status)) return false;
      
      // Check expiry
      const created = new Date(tx.created_at);
      if (now - created > EXPIRY_HOURS * 3600000) {
        // Auto-expire old transaction
        this.update(tx.id, { status: 'EXPIRED' });
        return false;
      }
      
      return true;
    });
  },

  async create(transactionData) {
    return await jsonStorage.updateJSON('transactions.json', (data) => {
      data.transactions.push(transactionData);
      return data;
    });
  },

  async update(id, updates) {
    return await jsonStorage.updateJSON('transactions.json', (data) => {
      const index = data.transactions.findIndex(tx => tx.id === id);
      if (index !== -1) {
        data.transactions[index] = { 
          ...data.transactions[index], 
          ...updates, 
          updated_at: new Date().toISOString() 
        };
      }
      return data;
    });
  },

  async isProcessed(id) {
    const tx = await this.getById(id);
    return tx && (tx.status === 'APPROVED' || tx.status === 'REJECTED');
  }
};

/**
 * Users operations
 */
const users = {
  async getAll() {
    const data = await jsonStorage.readJSON('users.json');
    return data?.users || [];
  },

  async getByTelegramId(telegramId) {
    const allUsers = await this.getAll();
    return allUsers.find(user => user.telegram_id === telegramId) || null;
  },

  async createOrUpdate(userData) {
    const existing = await this.getByTelegramId(userData.telegram_id);
    
    if (existing) {
      return existing;
    }

    await jsonStorage.updateJSON('users.json', (data) => {
      data.users.push({
        ...userData,
        created_at: new Date().toISOString()
      });
      return data;
    });

    return await this.getByTelegramId(userData.telegram_id);
  }
};

/**
 * Admins operations
 */
const admins = {
  async getAll() {
    const data = await jsonStorage.readJSON('admins.json');
    return data?.admins || [];
  },

  async isAdmin(telegramId) {
    const allAdmins = await this.getAll();
    return allAdmins.some(admin => admin.telegram_id === telegramId);
  },

  async add(telegramId) {
    const isAdmin = await this.isAdmin(telegramId);
    if (isAdmin) return;

    await jsonStorage.updateJSON('admins.json', (data) => {
      data.admins.push({ telegram_id: telegramId });
      return data;
    });
  },

  async remove(telegramId) {
    await jsonStorage.updateJSON('admins.json', (data) => {
      data.admins = data.admins.filter(admin => admin.telegram_id !== telegramId);
      return data;
    });
  }
};

module.exports = {
  films,
  transactions,
  users,
  admins,
  initializeStorage: jsonStorage.initializeStorage,
  acquireUserLock,
  releaseUserLock
};
