-- AlterTable
ALTER TABLE "cohorts" ADD COLUMN     "program_id" INTEGER;

-- AddForeignKey
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
