ALTER TABLE "node" ADD COLUMN "wsPort" numeric;--> statement-breakpoint
ALTER TABLE "node" ADD CONSTRAINT "node_wsPort_unique" UNIQUE("wsPort");