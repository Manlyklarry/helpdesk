-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('customer', 'agent');

-- AlterTable: add nullable, backfill, then constrain
ALTER TABLE "TicketMessage" ADD COLUMN "senderType" "SenderType";

UPDATE "TicketMessage"
SET "senderType" = CASE
  WHEN direction = 'inbound' THEN 'customer'::"SenderType"
  ELSE 'agent'::"SenderType"
END;

ALTER TABLE "TicketMessage" ALTER COLUMN "senderType" SET NOT NULL;
