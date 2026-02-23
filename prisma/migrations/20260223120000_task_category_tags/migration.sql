-- AlterTable
ALTER TABLE "Tag"
ADD COLUMN "labelAr" TEXT,
ADD COLUMN "labelEn" TEXT;

-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "categoryTagId" INTEGER;

-- CreateIndex
CREATE INDEX "Task_categoryTagId_idx" ON "Task"("categoryTagId");

-- AddForeignKey
ALTER TABLE "Task"
ADD CONSTRAINT "Task_categoryTagId_fkey" FOREIGN KEY ("categoryTagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
