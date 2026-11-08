/**
 * JSON Storage Engine
 * Handles all JSON file operations with atomic write and write queue
 */

const fs = require('fs').promises;
const path = require('path');
const fsSync = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');

// Write queue to prevent concurrent write conflicts
const writeQueues = new Map();

/**
 * Get or create a write queue for a specific file
 */
function getWriteQueue(filename) {
  if (!writeQueues.has(filename)) {
    writeQueues.set(filename, []);
  }
  return writeQueues.get(filename);
}

/**
 * Process write queue sequentially
 */
async function processWriteQueue(filename) {
  const queue = getWriteQueue(filename);
  
  while (queue.length > 0) {
    const { data, resolve, reject } = queue[0];
    
    try {
      await atomicWrite(filename, data);
      resolve();
    } catch (error) {
      reject(error);
    }
    
    queue.shift();
  }
}

/**
 * Atomic write operation using temporary file and rename
 */
async function atomicWrite(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  const tempPath = filePath + '.tmp';
  
  try {
    // Write to temporary file
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
    
    // Rename temp file to actual file (atomic operation)
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch (e) {
      // Ignore if file doesn't exist
    }
    throw error;
  }
}

/**
 * Read JSON file
 */
async function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    // If file doesn't exist, return null
    if (error.code === 'ENOENT') {
      return null;
    }
    
    // If JSON is corrupted, log error and return null
    console.error(`Error reading JSON file ${filename}:`, error.message);
    return null;
  }
}

/**
 * Write JSON file with queue mechanism
 */
async function writeJSON(filename, data) {
  return new Promise((resolve, reject) => {
    const queue = getWriteQueue(filename);
    const isFirst = queue.length === 0;
    
    queue.push({ data, resolve, reject });
    
    if (isFirst) {
      processWriteQueue(filename);
    }
  });
}

/**
 * Update JSON file using an updater function
 */
async function updateJSON(filename, updater) {
  const data = await readJSON(filename) || {};
  const updatedData = await updater(data);
  await writeJSON(filename, updatedData);
  return updatedData;
}

/**
 * Initialize storage - create default JSON files if they don't exist
 */
async function initializeStorage() {
  // Ensure data directory exists
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }

  // Default structures
  const defaults = {
    'films.json': { films: [] },
    'transactions.json': { transactions: [] },
    'users.json': { users: [] },
    'admins.json': { admins: [] }
  };

  // Create files if they don't exist
  for (const [filename, defaultData] of Object.entries(defaults)) {
    const filePath = path.join(DATA_DIR, filename);
    
    try {
      await fs.access(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await atomicWrite(filename, defaultData);
        console.log(`Created ${filename}`);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Validate JSON structure
 */
function validateJSON(data, requiredFields = []) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  for (const field of requiredFields) {
    if (!(field in data)) {
      return false;
    }
  }
  
  return true;
}

module.exports = {
  readJSON,
  writeJSON,
  updateJSON,
  initializeStorage,
  validateJSON,
  DATA_DIR
};
