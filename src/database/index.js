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
      if (tx.status === 'APPROVED' || tx.status === 'REJECTED' || tx.status === 'EXPIRED') return false;
      
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

module.exports = {
  films,
  transactions,
  users,
  admins,
  initializeStorage: jsonStorage.initializeStorage,
  acquireUserLock,
  releaseUserLock
};
