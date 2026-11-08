/**
 * Main Bot Entry Point
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');
const config = require('./config');
const db = require('./database');

// Middlewares
const { adminOnly } = require('./middlewares/admin');
const { trackUser, getPendingTransaction } = require('./middlewares/user');

// Handlers
const { handleStart } = require('./handlers/start');
const { handlePaymentButton } = require('./handlers/payment');
const { handleProofUpload, handleNonPhotoPayment } = require('./handlers/proof');
const { handleMenu } = require('./handlers/menu');
const {
  handleAddFilm,
  handleAddMedia,
  handleFilmList,
  handleFilmPagination,
  handleApproveCommand,
  handleRejectCommand,
  handleApproveButton,
  handleRejectButton,
  handleAdminHelp
} = require('./handlers/admin');

// Validate configuration
if (!config.botToken) {
  console.error('Error: BOT_TOKEN is required in .env file');
  process.exit(1);
}

if (!config.botUsername) {
  console.warn('Warning: BOT_USERNAME is not set. Share links may not work correctly.');
}

// Create bot instance
const bot = new Telegraf(config.botToken);

/**
 * Initialize storage on startup
 */
async function initialize() {
  try {
    await db.initializeStorage();
    console.log('Database initialized successfully');
    
    // Sync admin IDs from config to database
    for (const adminId of config.adminIds) {
      await db.admins.add(adminId);
    }
    console.log('Admin IDs synchronized');
    
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

/**
 * Setup middlewares
 */
function setupMiddlewares() {
  // Track user on every message
  bot.use(trackUser);
}

/**
 * Setup handlers
 */
function setupHandlers() {
  // Start command - handles deep links
  bot.command('start', handleStart);
  
  // Menu command - user guide
  bot.command('menu', handleMenu);
  
  // Payment button callback
  bot.action(/^pay_(.+)$/, async (ctx) => {
    const filmId = ctx.match[1];
    await handlePaymentButton(ctx, filmId);
  });
  
  // Payment proof upload (photo)
  bot.on('photo', async (ctx) => {
    await handleProofUpload(ctx);
  });
  
  // Handle text messages for payment instructions
  bot.on('text', async (ctx, next) => {
    // Skip commands
    if (ctx.message.text.startsWith('/')) {
      return next();
    }
    
    // Check if user has pending transaction
    const transaction = await getPendingTransaction(ctx);
    
    if (transaction) {
      await handleNonPhotoPayment(ctx);
    } else {
      // No pending transaction, ignore
      return next();
    }
  });
  
  // Admin commands
  bot.command('admin', adminOnly, handleAdminHelp);
  bot.command('addfilm', adminOnly, handleAddFilm);
  bot.command('addmedia', adminOnly, handleAddMedia);
  bot.command('film', adminOnly, handleFilmList);
  bot.command('terima', adminOnly, handleApproveCommand);
  bot.command('tolak', adminOnly, handleRejectCommand);
  
  // Admin button callbacks for film pagination
  bot.action('film_prev', adminOnly, async (ctx) => {
    await handleFilmPagination(ctx, 'prev');
  });
  
  bot.action('film_next', adminOnly, async (ctx) => {
    await handleFilmPagination(ctx, 'next');
  });
  
  // Admin button callbacks for payment verification
  bot.action(/^approve_(TRX-[A-Z0-9]{8})$/, adminOnly, async (ctx) => {
    const transactionId = ctx.match[1];
    await handleApproveButton(ctx, transactionId);
  });
  
  bot.action(/^reject_(TRX-[A-Z0-9]{8})$/, async (ctx) => {
    const transactionId = ctx.match[1];
    await handleRejectButton(ctx, transactionId);
  });
  
  // Error handling
  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('⚠️ Terjadi kesalahan. Silakan coba lagi.');
  });
}

/**
 * Start bot
 */
async function startBot() {
  await initialize();
  setupMiddlewares();
  setupHandlers();
  
  // Start polling
  bot.launch();
  
  console.log('Bot started successfully!');
  console.log(`Bot username: @${config.botUsername || 'not set'}`);
  
  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

// Start the bot
startBot().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});
