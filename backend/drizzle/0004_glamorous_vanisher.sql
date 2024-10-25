ALTER TABLE "node" DROP CONSTRAINT "node_apiPort_unique";--> statement-breakpoint
ALTER TABLE "node" DROP CONSTRAINT "node_wsPort_unique";--> statement-breakpoint
ALTER TABLE "node" ADD COLUMN "password" varchar(255);--> statement-breakpoint
ALTER TABLE "node" DROP COLUMN IF EXISTS "apiPort";--> statement-breakpoint
ALTER TABLE "node" DROP COLUMN IF EXISTS "wsPort";