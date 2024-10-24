ALTER TABLE "node" RENAME COLUMN "password" TO "apiPort";--> statement-breakpoint
ALTER TABLE "node" DROP CONSTRAINT "node_password_unique";--> statement-breakpoint
ALTER TABLE "node" ADD CONSTRAINT "node_apiPort_unique" UNIQUE("apiPort");