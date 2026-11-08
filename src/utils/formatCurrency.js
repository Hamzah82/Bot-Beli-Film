/**
 * Format number to Indonesian Rupiah currency format
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  return 'Rp' + amount.toLocaleString('id-ID');
}

module.exports = formatCurrency;
