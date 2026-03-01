-- AlterTable
ALTER TABLE "exam_results" ADD COLUMN     "academic_year" TEXT,
ADD COLUMN     "student_level" TEXT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "level" TEXT NOT NULL DEFAULT 'Year 1';
