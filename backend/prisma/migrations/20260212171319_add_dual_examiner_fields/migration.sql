-- AlterTable
ALTER TABLE "exam_results" ADD COLUMN     "assessor_number" INTEGER,
ADD COLUMN     "final_submitted_by" INTEGER,
ADD COLUMN     "is_final_submission" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reconciliation_id" TEXT,
ADD COLUMN     "reconciliation_notes" TEXT;

-- CreateIndex
CREATE INDEX "exam_results_reconciliation_id_idx" ON "exam_results"("reconciliation_id");
