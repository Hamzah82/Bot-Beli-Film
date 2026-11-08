/**
 * Application configuration
 */

require('dotenv').config();

module.exports = {
  // Telegram Bot Token
  botToken: process.env.BOT_TOKEN,
  
  // Bot username (without @)
  botUsername: process.env.BOT_USERNAME,
  
  // Admin Telegram User IDs
  adminIds: process.env.ADMIN_IDS
    ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()))
    : [],
  
  // QRIS Image File ID
  qrisImageFileId: process.env.QRIS_IMAGE_FILE_ID,
  
  // Transaction status
  transactionStatus: {
    WAITING_PAYMENT: 'WAITING_PAYMENT',
    WAITING_VERIFICATION: 'WAITING_VERIFICATION',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
  },
  
  // Delivery status
  deliveryStatus: {
    PENDING: 'PENDING',
    SENT: 'SENT',
    FAILED: 'FAILED'
  },
  
  // Pagination
  pagination: {
    itemsPerPage: 1
  }
};
