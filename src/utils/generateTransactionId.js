/**
 * Generate unique transaction ID using cryptographically secure random bytes
 */

const crypto = require('crypto');

/**
 * Generate transaction ID
 * @returns {string} Transaction ID in format TRX-XXXXXXXXXXXX (12 hex chars)
 */
function generateTransactionId() {
  const bytes = crypto.randomBytes(6); // 6 bytes = 12 hex chars
  return `TRX-${bytes.toString('hex').toUpperCase()}`;
}

module.exports = generateTransactionId;
