CREATE TYPE "AuditAction" AS ENUM (
  'LOGIN',
  'FEEDBACK_SUBMITTED',
  'FEEDBACK_FORM_PUBLISHED',
  'FEEDBACK_FORM_TURNED_OFF',
  'GRIEVANCE_SUBMITTED',
  'GRIEVANCE_VIEWED',
  'ANALYSIS_RUN',
  'REPORT_VIEWED',
  'REPORT_DOWNLOADED',
  'ACTION_ITEM_CREATED',
  'ACTION_STATUS_UPDATED'
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" "AuditAction" NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_collegeId_idx" ON "AuditLog"("collegeId");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_collegeId_action_idx" ON "AuditLog"("collegeId", "action");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
