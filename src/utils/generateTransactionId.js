/**
 * Generate unique transaction ID
 * @returns {string} Transaction ID in format TRX-XXXXXXXX
 */
function generateTransactionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'TRX-';
  
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

module.exports = generateTransactionId;
