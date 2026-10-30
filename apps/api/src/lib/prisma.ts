import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Auto-migrate SQLite schema columns safely if missing in local dev.db
export async function ensureDbColumns() {
  const alterStatements = [
    'ALTER TABLE Booking ADD COLUMN currentEtaMinutes INTEGER;',
    'ALTER TABLE Booking ADD COLUMN polylineRoute TEXT;',
    'ALTER TABLE Booking ADD COLUMN lastKnownLatitude REAL;',
    'ALTER TABLE Booking ADD COLUMN lastKnownLongitude REAL;',
  ];

  for (const sql of alterStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      // Column already exists or table not ready yet; safely ignored
    }
  }
}

ensureDbColumns().catch(() => {});
