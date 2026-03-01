-- Insert unique cohorts from Student table
INSERT INTO "cohorts" ("name", "created_at", "updated_at")
SELECT DISTINCT "cohort", NOW(), NOW()
FROM "students"
WHERE "cohort" IS NOT NULL AND "cohort" != ''
ON CONFLICT ("name") DO NOTHING;

-- Update students to link to the new cohorts
UPDATE "students"
SET "cohort_id" = "cohorts"."id"
FROM "cohorts"
WHERE "students"."cohort" = "cohorts"."name";