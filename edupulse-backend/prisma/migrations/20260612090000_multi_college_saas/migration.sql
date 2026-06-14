-- Multi-college SaaS foundation.
-- Existing demo data is backfilled into the default GL Bajaj tenant.

CREATE TABLE "College" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "domain" TEXT,
  "logoUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "College_pkey" PRIMARY KEY ("id")
);

INSERT INTO "College" ("id", "name", "code", "domain", "isActive", "updatedAt")
VALUES (
  'college_glbajaj',
  'G.L. Bajaj Institute of Technology and Management',
  'GLBAJAJ',
  'glbitm.ac.in',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Department" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "User" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "AcademicTerm" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "FeedbackCategory" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "FeedbackQuestion" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "FeedbackSubmission" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "FeedbackResponse" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "Grievance" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "AnalysisReport" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "ThemeInsight" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "ActionItem" ADD COLUMN "collegeId" TEXT;

UPDATE "Department" SET "collegeId" = 'college_glbajaj' WHERE "collegeId" IS NULL;
UPDATE "User" SET "collegeId" = 'college_glbajaj' WHERE "collegeId" IS NULL;
UPDATE "AcademicTerm" SET "collegeId" = 'college_glbajaj' WHERE "collegeId" IS NULL;
UPDATE "FeedbackCategory" SET "collegeId" = 'college_glbajaj' WHERE "collegeId" IS NULL;
UPDATE "FeedbackQuestion" SET "collegeId" = 'college_glbajaj' WHERE "collegeId" IS NULL;
UPDATE "FeedbackSubmission" SET "collegeId" = 'college_glbajaj' WHERE "collegeId" IS NULL;
UPDATE "FeedbackResponse" SET "collegeId" = 'college_glbajaj' WHERE "collegeId" IS NULL;
UPDATE "Grievance" SET "collegeId" = 'college_glbajaj' WHERE "collegeId" IS NULL;
UPDATE "AnalysisReport" SET "collegeId" = 'college_glbajaj' WHERE "collegeId" IS NULL;
UPDATE "ThemeInsight" SET "collegeId" = 'college_glbajaj' WHERE "collegeId" IS NULL;
UPDATE "ActionItem" SET "collegeId" = 'college_glbajaj' WHERE "collegeId" IS NULL;

ALTER TABLE "Department" ALTER COLUMN "collegeId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "collegeId" SET NOT NULL;
ALTER TABLE "AcademicTerm" ALTER COLUMN "collegeId" SET NOT NULL;
ALTER TABLE "FeedbackCategory" ALTER COLUMN "collegeId" SET NOT NULL;
ALTER TABLE "FeedbackQuestion" ALTER COLUMN "collegeId" SET NOT NULL;
ALTER TABLE "FeedbackSubmission" ALTER COLUMN "collegeId" SET NOT NULL;
ALTER TABLE "FeedbackResponse" ALTER COLUMN "collegeId" SET NOT NULL;
ALTER TABLE "Grievance" ALTER COLUMN "collegeId" SET NOT NULL;
ALTER TABLE "AnalysisReport" ALTER COLUMN "collegeId" SET NOT NULL;
ALTER TABLE "ThemeInsight" ALTER COLUMN "collegeId" SET NOT NULL;
ALTER TABLE "ActionItem" ALTER COLUMN "collegeId" SET NOT NULL;

DROP INDEX IF EXISTS "Department_name_key";
DROP INDEX IF EXISTS "Department_code_key";
DROP INDEX IF EXISTS "AcademicTerm_name_key";
DROP INDEX IF EXISTS "AcademicTerm_isActive_idx";
DROP INDEX IF EXISTS "FeedbackCategory_name_key";

CREATE UNIQUE INDEX "College_code_key" ON "College"("code");
CREATE INDEX "College_isActive_idx" ON "College"("isActive");

CREATE UNIQUE INDEX "Department_collegeId_code_key" ON "Department"("collegeId", "code");
CREATE UNIQUE INDEX "Department_collegeId_name_key" ON "Department"("collegeId", "name");
CREATE INDEX "Department_collegeId_idx" ON "Department"("collegeId");

CREATE INDEX "User_collegeId_idx" ON "User"("collegeId");
CREATE INDEX "User_collegeId_role_idx" ON "User"("collegeId", "role");

CREATE UNIQUE INDEX "AcademicTerm_collegeId_name_key" ON "AcademicTerm"("collegeId", "name");
CREATE INDEX "AcademicTerm_collegeId_idx" ON "AcademicTerm"("collegeId");
CREATE INDEX "AcademicTerm_collegeId_isActive_idx" ON "AcademicTerm"("collegeId", "isActive");

CREATE UNIQUE INDEX "FeedbackCategory_collegeId_name_key" ON "FeedbackCategory"("collegeId", "name");
CREATE INDEX "FeedbackCategory_collegeId_idx" ON "FeedbackCategory"("collegeId");

CREATE INDEX "FeedbackQuestion_collegeId_idx" ON "FeedbackQuestion"("collegeId");
CREATE INDEX "FeedbackQuestion_collegeId_isActive_idx" ON "FeedbackQuestion"("collegeId", "isActive");

CREATE INDEX "FeedbackSubmission_collegeId_idx" ON "FeedbackSubmission"("collegeId");
CREATE INDEX "FeedbackSubmission_collegeId_termId_idx" ON "FeedbackSubmission"("collegeId", "termId");

CREATE INDEX "FeedbackResponse_collegeId_idx" ON "FeedbackResponse"("collegeId");
CREATE INDEX "FeedbackResponse_collegeId_categoryId_idx" ON "FeedbackResponse"("collegeId", "categoryId");
CREATE INDEX "FeedbackResponse_collegeId_rating_idx" ON "FeedbackResponse"("collegeId", "rating");

CREATE INDEX "Grievance_collegeId_idx" ON "Grievance"("collegeId");
CREATE INDEX "Grievance_collegeId_status_idx" ON "Grievance"("collegeId", "status");
CREATE INDEX "Grievance_collegeId_severity_idx" ON "Grievance"("collegeId", "severity");

CREATE INDEX "AnalysisReport_collegeId_idx" ON "AnalysisReport"("collegeId");
CREATE INDEX "AnalysisReport_collegeId_termId_idx" ON "AnalysisReport"("collegeId", "termId");

CREATE INDEX "ThemeInsight_collegeId_idx" ON "ThemeInsight"("collegeId");
CREATE INDEX "ThemeInsight_collegeId_priority_idx" ON "ThemeInsight"("collegeId", "priority");

CREATE INDEX "ActionItem_collegeId_idx" ON "ActionItem"("collegeId");
CREATE INDEX "ActionItem_collegeId_status_idx" ON "ActionItem"("collegeId", "status");

ALTER TABLE "Department" ADD CONSTRAINT "Department_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackCategory" ADD CONSTRAINT "FeedbackCategory_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackQuestion" ADD CONSTRAINT "FeedbackQuestion_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackSubmission" ADD CONSTRAINT "FeedbackSubmission_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnalysisReport" ADD CONSTRAINT "AnalysisReport_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ThemeInsight" ADD CONSTRAINT "ThemeInsight_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
