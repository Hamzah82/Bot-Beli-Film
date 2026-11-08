/**
 * Transaction Service - Business logic for transactions
 */

const db = require('../database');
const generateTransactionId = require('../utils/generateTransactionId');
const config = require('../config');

/**
 * Create new transaction with user locking to prevent race conditions
 */
async function createTransaction(userId, filmId, amount) {
  try {
    // Acquire lock for this user to prevent concurrent transaction creation
    await db.acquireUserLock(userId);
    
    // Check if user has pending transaction
    const pending = await db.transactions.getPendingByUserId(userId);
    if (pending) {
      return { 
        success: false, 
        error: 'Anda memiliki transaksi yang masih pending',
        transaction: pending
      };
    }
    
    const transactionId = generateTransactionId();
    const now = new Date().toISOString();
    
    const transactionData = {
      id: transactionId,
      user_id: userId,
      film_id: filmId,
      amount,
      status: config.transactionStatus.WAITING_PAYMENT,
      proof_file_id: null,
      rejection_reason: null,
      admin_id: null,
      admin_message_id: null,
      admin_chat_id: null,
      delivery_status: config.deliveryStatus.PENDING,
      created_at: now,
      updated_at: now
    };
    
    await db.transactions.create(transactionData);
    
    return { success: true, transaction: transactionData };
  } finally {
    // Always release lock
    db.releaseUserLock(userId);
  }
}

/**
 * Get transaction by ID
 */
async function getTransactionById(id) {
  return await db.transactions.getById(id);
}

/**
 * Update transaction status to waiting verification
 */
async function submitPaymentProof(transactionId, proofFileId) {
  const transaction = await db.transactions.getById(transactionId);
  
  if (!transaction) {
    return { success: false, error: 'Transaksi tidak ditemukan' };
  }
  
  if (transaction.status !== config.transactionStatus.WAITING_PAYMENT) {
    return { success: false, error: 'Transaksi tidak dalam status menunggu pembayaran' };
  }
  
  await db.transactions.update(transactionId, {
    proof_file_id: proofFileId,
    status: config.transactionStatus.WAITING_VERIFICATION
  });
  
  return { success: true };
}

/**
 * Approve transaction
 */
async function approveTransaction(transactionId, adminId) {
  const transaction = await db.transactions.getById(transactionId);
  
  if (!transaction) {
    return { success: false, error: 'Transaksi tidak ditemukan' };
  }
  
  if (await db.transactions.isProcessed(transactionId)) {
    return { success: false, error: 'Transaksi sudah diproses' };
  }
  
  await db.transactions.update(transactionId, {
    status: config.transactionStatus.APPROVED,
    admin_id: adminId
  });
  
  return { success: true };
}

/**
 * Reject transaction
 */
async function rejectTransaction(transactionId, adminId, reason) {
  const transaction = await db.transactions.getById(transactionId);
  
  if (!transaction) {
    return { success: false, error: 'Transaksi tidak ditemukan' };
  }
  
  if (await db.transactions.isProcessed(transactionId)) {
    return { success: false, error: 'Transaksi sudah diproses' };
  }
  
  if (!reason || reason.trim() === '') {
    return { success: false, error: 'Alasan penolakan wajib diisi' };
  }
  
  await db.transactions.update(transactionId, {
    status: config.transactionStatus.REJECTED,
    rejection_reason: reason,
    admin_id: adminId
  });
  
  return { success: true };
}

/**
 * Update admin notification message info
 */
async function setAdminNotificationInfo(transactionId, messageId, chatId) {
  await db.transactions.update(transactionId, {
    admin_message_id: messageId,
    admin_chat_id: chatId
  });
}

/**
 * Update delivery status
 */
async function updateDeliveryStatus(transactionId, status) {
  await db.transactions.update(transactionId, {
    delivery_status: status
  });
}

/**
 * Get user's pending transaction
 */
async function getUserPendingTransaction(userId) {
  return await db.transactions.getPendingByUserId(userId);
}

module.exports = {
  createTransaction,
  getTransactionById,
  submitPaymentProof,
  approveTransaction,
  rejectTransaction,
  setAdminNotificationInfo,
  updateDeliveryStatus,
  getUserPendingTransaction
};
