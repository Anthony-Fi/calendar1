-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organizer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "bio" TEXT,
    "url" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "representativeUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Organizer_representativeUserId_fkey" FOREIGN KEY ("representativeUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Organizer" ("bio", "createdAt", "email", "id", "name", "phone", "updatedAt", "url") SELECT "bio", "createdAt", "email", "id", "name", "phone", "updatedAt", "url" FROM "Organizer";
DROP TABLE "Organizer";
ALTER TABLE "new_Organizer" RENAME TO "Organizer";
CREATE UNIQUE INDEX "Organizer_slug_key" ON "Organizer"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
