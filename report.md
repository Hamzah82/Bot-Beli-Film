# SECURITY AND CODE QUALITY REVIEW REPORT

## Project: dramacinaBot (Telegram Film Store Bot)
**Review Date:** November 8, 2026  
**Scope:** Security vulnerabilities, error handling, code quality, production readiness

---

## EXECUTIVE SUMMARY

This review identified **18 issues** across the codebase:
- **CRITICAL:** 3 issues
- **HIGH:** 6 issues  
- **MEDIUM:** 5 issues
- **LOW:** 4 issues

The most critical concerns are:
1. Race conditions in concurrent operations leading to data corruption
2. Missing authorization on debug endpoints
3. Lack of rate limiting enabling abuse
4. Insecure transaction ID generation

---

## DETAILED FINDINGS

### CRITICAL SEVERITY ISSUES

#### 1. **Race Condition in Transaction Creation**
- **File:** `src/services/transactionService.js` (lines 12-21)
- **Problem:** The check for pending transactions and creation of new transaction are not atomic. Between the check and creation, another request can create a transaction for the same user.
- **Why it matters:** Allows users to create multiple concurrent transactions by rapidly clicking "Buy" button, bypassing the one-pending-transaction limit. Can lead to:
  - Multiple payments for same film
  - Data corruption in JSON storage
  - Financial discrepancies
- **Recommended fix:** 
  ```javascript
  // Implement a locking mechanism for transaction creation
  // Or use a proper database with transactions
  // Or add user-level mutex/lock before checking/creating
  ```

#### 2. **Race Condition in JSON Storage writeJSON Function**
- **File:** `src/database/jsonStorage.js` (lines 93-103)
- **Problem:** The write queue mechanism doesn't properly await the `processWriteQueue`. The Promise resolves/rejects inside the queue but there's no guarantee the queue processor is still running.
- **Why it matters:** When multiple writes happen concurrently:
  - Queue can be processed multiple times simultaneously
  - Writes can be lost or corrupted
  - The `isFirst` check is not atomic - race condition exists
- **Recommended fix:**
  ```javascript
  async function writeJSON(filename, data) {
    return new Promise((resolve, reject) => {
      const queue = getWriteQueue(filename);
      const isFirst = queue.length === 0;
      
      queue.push({ data, resolve, reject });
      
      if (isFirst) {
        // Ensure we await and handle errors properly
        processWriteQueue(filename).catch(err => {
          console.error('Queue processing error:', err);
        });
      }
    });
  }
  ```

#### 3. **Debug Endpoint Left in Production**
- **File:** `src/bot.js` (lines 86-114)
- **Problem:** The `/getfileid` command is accessible to ALL USERS, not just admins. This is a debug utility that should be removed or secured.
- **Why it matters:** 
  - Any user can extract file IDs from any media
  - Could be used to discover QRIS image ID or other sensitive media
  - Information disclosure vulnerability
- **Recommended fix:**
  ```javascript
  bot.command('getfileid', adminOnly, async (ctx) => {
    // ... existing code
  });
  // OR remove entirely before production
  ```

---

### HIGH SEVERITY ISSUES

#### 4. **Transaction ID Collision Vulnerability**
- **File:** `src/utils/generateTransactionId.js` (lines 5-14)
- **Problem:** Uses `Math.random()` which is not cryptographically secure. With only 8 characters from 36 possible (2.8 trillion combinations), birthday paradox means collision risk after ~1.6 million transactions.
- **Why it matters:**
  - Transaction ID collisions could occur
  - Predictable IDs enable enumeration attacks
  - An attacker who observes patterns could predict valid transaction IDs
- **Recommended fix:**
  ```javascript
  const crypto = require('crypto');
  
  function generateTransactionId() {
    const bytes = crypto.randomBytes(6); // 12 hex chars
    return `TRX-${bytes.toString('hex').toUpperCase()}`;
  }
  ```

#### 5. **Missing Rate Limiting**
- **File:** `src/handlers/payment.js` (line 13)
- **Problem:** No rate limiting on payment button clicks. Users can spam the payment system.
- **Why it matters:**
  - DoS attacks on payment system
  - Resource exhaustion
  - JSON file corruption from concurrent writes
- **Recommended fix:** Implement per-user rate limiting middleware
  ```javascript
  // Add rate limiting middleware
  const userRequests = new Map();
  const RATE_LIMIT = 5000; // 5 seconds
  
  function rateLimit(ctx, next) {
    const userId = ctx.from.id;
    const now = Date.now();
    const lastRequest = userRequests.get(userId) || 0;
    
    if (now - lastRequest < RATE_LIMIT) {
      return ctx.answerCbQuery('Please wait before trying again.');
    }
    
    userRequests.set(userId, now);
    return next();
  }
  ```

#### 6. **No Input Validation on Film ID**
- **File:** `src/handlers/admin.js` (line 45)
- **Problem:** Film ID is taken directly from user input without validation. Only converted to uppercase.
- **Why it matters:**
  - Malicious IDs could contain special characters
  - No length limits - could store extremely long strings
  - Could potentially break callback_data limits (64 bytes)
- **Recommended fix:**
  ```javascript
  const id = args[0].toUpperCase();
  
  // Add validation
  if (!/^[A-Z0-9_-]{3,20}$/.test(id)) {
    return ctx.reply('⚠️ ID film harus 3-20 karakter, hanya huruf, angka, underscore, dan strip.');
  }
  ```

#### 7. **Unchecked Admin Notification Update Failures**
- **File:** `src/handlers/admin.js` (lines 306-315, 419-428)
- **Problem:** Errors when editing admin notification messages are caught but only logged. The transaction proceeds without updating the admin message.
- **Why it matters:**
  - Admins see stale transaction status
  - Could approve/reject transactions twice if messages aren't updated
  - No audit trail integrity
- **Recommended fix:**
  ```javascript
  // Make admin message update critical, not silent failure
  try {
    await ctx.telegram.editMessageCaption(...);
  } catch (error) {
    console.error('Failed to update admin notification:', error.message);
    // Consider notifying admin or retrying
    await ctx.reply('⚠️ Peringatan: Pesan admin mungkin tidak ter-update. Silakan verifikasi manual.');
  }
  ```

#### 8. **Session State Issue in Reject Button Handler**
- **File:** `src/handlers/admin.js` (lines 527-533)
- **Problem:** Uses `ctx.session` which requires session middleware, but no session middleware is configured in `bot.js`. This will throw an error or silently fail.
- **Why it matters:**
  - Reject button prompts for reason but then fails
  - Poor user experience
  - Feature is effectively broken
- **Recommended fix:**
  ```javascript
  // Either add session middleware or change the flow
  // Option 1: Add session
  const { session } = require('telegraf-session-local');
  bot.use(session());
  
  // Option 2: Direct modeless approach
  async function handleRejectButton(ctx, transactionId) {
    await ctx.editMessageCaption(
      ctx.message.caption + '\n\n Tolak transaksi ini?',
      {
        reply_markup: {
          inline_keyboard: [[
            { text: 'Ya, Tolak', callback_data: `confirm_reject_${transactionId}` },
            { text: 'Batal', callback_data: 'cancel_action' }
          ]]
        }
      }
    );
  }
  ```

#### 9. **Missing Validation in Film Price**
- **File:** `src/handlers/admin.js` (lines 49-52)
- **Problem:** Price is validated as integer but:
  - No maximum limit (could create absurdly high prices)
  - Doesn't prevent overflow issues
  - No minimum realistic price check
- **Why it matters:**
  - Admin could accidentally set price to extremely high value
  - Integer overflow could cause negative prices
  - Business logic errors
- **Recommended fix:**
  ```javascript
  const price = parseInt(args[1]);
  const MIN_PRICE = 1000;
  const MAX_PRICE = 100000000; // 100 million IDR
  
  if (isNaN(price) || price < MIN_PRICE || price > MAX_PRICE) {
    return ctx.reply(`⚠️ Harga harus antara ${formatCurrency(MIN_PRICE)} dan ${formatCurrency(MAX_PRICE)}.`);
  }
  ```

---

### MEDIUM SEVERITY ISSUES

#### 10. **Missing Pagination State Cleanup**
- **File:** `src/handlers/admin.js` (lines 11-12, 141-145)
- **Problem:** `paginationStates` Map grows indefinitely. Old states are never cleaned up when messages are deleted or sessions expire.
- **Why it matters:**
  - Memory leak over time
  - Stale pagination states could be exploited
  - Bot memory usage grows unbounded
- **Recommended fix:**
  ```javascript
  // Add TTL cleanup
  const paginationStates = new Map();
  
  setInterval(() => {
    paginationStates.forEach((state, adminId) => {
      if (Date.now() - state.timestamp > 3600000) { // 1 hour
        paginationStates.delete(adminId);
      }
    });
  }, 300000); // Check every 5 minutes
  ```

#### 11. **No Transaction Replay Protection**
- **File:** `src/handlers/admin.js` (lines 170-178)
- **Problem:** Callback button regex doesn't verify transaction is still pending. Admin can click approve multiple times rapidly before buttons are updated.
- **Why it matters:**
  - Double-processing of same transaction
  - Race condition if both approve and reject clicked fast
  - Database state inconsistency
- **Recommended fix:**
  ```javascript
  // Already has isProcessed check in service, but buttons should be disabled immediately
  async function handleApproveButton(ctx, transactionId) {
    // Disable buttons immediately
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    
    // Then process
    // ... existing code
  }
  ```

#### 12. **Potential Bot Block by User Not Handled**
- **File:** `src/handlers/admin.js` (lines 319-338, 499-519)
- **Problem:** When sending video to user, if user has blocked the bot, the error is caught but transaction is marked as `FAILED`. User won't receive video even if they unblock.
- **Why it matters:**
  - User paid but can't receive product
  - No retry mechanism
  - Customer dissatisfaction
- **Recommended fix:**
  ```javascript
  catch (error) {
    if (error.description?.includes('bot was blocked')) {
      // Mark for manual delivery or retry later
      await transactionService.update(transactionId, {
        delivery_status: 'BLOCKED',
        delivery_notes: 'User blocked bot'
      });
      // Notify admin for manual intervention
    }
  }
  ```

#### 13. **Markdown Injection in User-Generated Content**
- **File:** `src/handlers/admin.js` (lines 67-74, 121-124)
- **Problem:** Film titles from user input are inserted into Markdown messages without escaping special characters.
- **Why it matters:**
  - Special Markdown characters ( `*`, `_`, `[`, `]`, etc.) could break message formatting
  - Potential for injection if Telegram supports more complex rendering
- **Recommended fix:**
  ```javascript
  function escapeMarkdown(text) {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
  }
  
  const title = escapeMarkdown(args.slice(2).join(' '));
  ```

#### 14. **Config Validation Too Lenient**
- **File:** `src/bot.js` (lines 36-39)
- **Problem:** `BOT_USERNAME` is only logged as warning if missing, but it will cause share links to break.
- **Why it matters:**
  - Share links will be malformed
  - Deep links won't work
  - Poor user experience
- **Recommended fix:**
  ```javascript
  if (!config.botUsername) {
    console.error('Error: BOT_USERNAME is required for share links to work');
    // Either exit or disable share link generation
  }
  ```

---

### LOW SEVERITY ISSUES

#### 15. **No Transaction Expiry Mechanism**
- **File:** `src/services/transactionService.js` (lines 12-44)
- **Problem:** Transactions in `WAITING_PAYMENT` status never expire. Old abandoned transactions accumulate.
- **Why it matters:**
  - Users can't start new purchase if they abandon an old one
  - Database bloat
  - Pending transaction check prevents legitimate purchases
- **Recommended fix:**
  ```javascript
  // Add expiry check
  async function getPendingByUserId(userId) {
    const allTransactions = await this.getAll();
    const now = new Date();
    const EXPIRY_HOURS = 24;
    
    return allTransactions.find(tx => {
      if (tx.user_id !== userId) return false;
      if (tx.status === 'APPROVED' || tx.status === 'REJECTED') return false;
      
      // Check expiry
      const created = new Date(tx.created_at);
      if (now - created > EXPIRY_HOURS * 3600000) {
        // Auto-expire
        this.update(tx.id, { status: 'EXPIRED' });
        return false;
      }
      
      return true;
    });
  }
  ```

#### 16. **Missing Error Context in Logging**
- **File:** `src/handlers/payment.js` (lines 17, 29, 39, 44, etc.)
- **Problem:** Console logs use generic messages without structured error information. Critical for debugging production issues.
- **Why it matters:**
  - Difficult to trace issues in production
  - No correlation IDs for request tracking
  - Insufficient forensics capability
- **Recommended fix:**
  ```javascript
  console.error('Payment failed:', {
    userId: ctx.from.id,
    filmId,
    error: error.message,
    stack: error.stack,
    transactionId: transaction?.id
  });
  ```

#### 17. **Inconsistent Error Handling Patterns**
- **File:** Multiple files
- **Problem:** Some errors return user-facing messages, some just log to console, some silently fail. Inconsistent patterns make debugging difficult.
- **Why it matters:**
  - Poor maintainability
  - Missing error context
  - Users see generic errors without actionable info
- **Recommended fix:** Implement centralized error handling
  ```javascript
  // utils/errors.js
  class BotError extends Error {
    constructor(message, userMessage, code) {
      super(message);
      this.userMessage = userMessage;
      this.code = code;
    }
  }
  
  // Central handler
  bot.catch((err, ctx) => {
    if (err instanceof BotError) {
      ctx.reply(err.userMessage);
    } else {
      ctx.reply('Terjadi kesalahan sistem. Silakan coba lagi.');
    }
    console.error('Bot error:', err);
  });
  ```

#### 18. **Missing Health Check Endpoint**
- **File:** `src/bot.js`
- **Problem:** No way to verify bot is running and healthy without sending a message.
- **Why it matters:**
  - Cannot monitor bot health in production
  - No automated health checks
  - Difficult to detect zombie processes
- **Recommended fix:**
  ```javascript
  // Add health check file
  const fs = require('fs');
  const path = require('path');
  
  setInterval(() => {
    fs.writeFileSync(
      path.join(__dirname, '../health.json'),
      JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        pid: process.pid
      })
    );
  }, 30000);
  ```

---

## TELEGRAM BOT SPECIFIC ISSUES

### Telegram-Specific Concerns

#### TS-1. **Callback Data Size Limit**
- **Issue:** Callback data is limited to 64 bytes. Current transaction IDs use 12 chars (`TRX-XXXXXXXX`), but if IDs grow, they'll exceed limit.
- **Files:** `src/handlers/admin.js` (lines 170-178)
- **Recommendation:** Keep transaction IDs short or use callback data references with storage.

#### TS-2. **No User Authorization on /start**
- **Issue:** Any user can start the bot and view film details. No blacklist/whitelist capability.
- **Recommendation:** Consider adding user authorization if needed for business logic.

#### TS-3. **Deep Link Parameter Not Validated**
- **Issue:** The `start` parameter from deep links is used directly to query films without sanitization.
- **File:** `src/handlers/start.js` (line 45)
- **Recommendation:** Validate film ID format before database query.

---

## PRODUCTION READINESS CHECKLIST

### MISSING PRODUCTION REQUIREMENTS

1. ❌ **No authentication/authorization beyond admin checks**
2. ❌ **No rate limiting**
3. ❌ **No request logging/audit trail**
4. ❌ **No backup mechanism for JSON files**
5. ❌ **No health monitoring**
6. ❌ **No graceful degradation**
7. ❌ **No configuration validation beyond BOT_TOKEN**
8. ❌ **No transaction rollback capability**
9. ❌ **No database migration strategy**
10. ❌ **No environment-specific configuration**

---

## RECOMMENDATIONS

### IMMEDIATE ACTIONS (Before Production)

1. **Remove or secure `/getfileid` command** - CRITICAL
2. **Implement proper transaction locking** - CRITICAL
3. **Add rate limiting middleware** - HIGH
4. **Fix session usage in reject button** - HIGH
5. **Switch to cryptographically secure ID generation** - HIGH
6. **Add input validation for all user inputs** - HIGH

### SHORT-TERM IMPROVEMENTS

1. Implement proper error handling middleware
2. Add structured logging with context
3. Create backup mechanism for JSON files
4. Add transaction expiry mechanism
5. Fix memory leak in pagination states
6. Add Markdown escaping for user content

### LONG-TERM ARCHITECTURAL IMPROVEMENTS

1. **Migrate from JSON to proper database** (PostgreSQL, MongoDB, or even SQLite)
   - ACID transactions
   - Concurrent access safety
   - Query performance
   - Data integrity

2. **Implement proper session management**
   - Use database-backed sessions
   - Add session expiry
   - State management

3. **Add comprehensive logging and monitoring**
   - Structured logging
   - Error tracking (Sentry, etc.)
   - Performance monitoring
   - Alerting

4. **Implement API versioning** for future updates

5. **Add comprehensive test suite**
   - Unit tests
   - Integration tests
   - End-to-end tests

---

## TESTING RECOMMENDATIONS

### Security Testing Needed

1. Race condition testing with concurrent requests
2. Input fuzzing on all command handlers
3. Rate limiting stress tests
4. Transaction ID collision testing
5. Callback data injection tests

### Functional Testing Needed

1. Complete payment flow (happy path)
2. Error scenarios
3. Edge cases (blocked users, deleted messages)
4. Concurrent transaction handling
5. Pagination stress testing

---

## CONCLUSION

The bot has fundamental architectural issues stemming from JSON file storage and lack of proper concurrency handling. While functional for low-volume use, it is **NOT production-ready** in its current state.

**Critical blockers:**
- Race conditions can corrupt data
- Debug endpoint exposes sensitive information
- Missing rate limiting enables abuse
- Session mechanism is broken

**Recommendation:** Do not deploy to production without addressing CRITICAL and HIGH severity issues. Consider database migration before scaling.

---
