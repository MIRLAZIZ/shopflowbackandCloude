
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// --- Dinamik O‘zbekiston vaqti format ---
const tashkentTime = winston.format((info) => {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000);
  info.timestamp = now.toISOString().replace("T", " ").split(".")[0];
  return info;
});

// --- Pretty JSON format ---
const prettyFormat = winston.format.printf(({ timestamp, level, message, stack }) => {
  return JSON.stringify(
    {
      time: timestamp,
      level,
      message,
      stack: stack || null,
    },
    null,
    2
  );
});

// --- Winston Config ---
export const winstonErrorConfig = {
  level: 'debug',  // <<---- Faqat error emas, barcha loglar ko‘rinsin
  format: winston.format.combine(
    tashkentTime(),
    winston.format.errors({ stack: true }),
    prettyFormat
  ),
  transports: [
    // File transport
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),

    // Console transport
    new winston.transports.Console({
      level: 'debug',
    
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
  ],
};
  
