ALTER TABLE "file" ALTER COLUMN "size" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "file" ALTER COLUMN "pieceSize" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "file" ALTER COLUMN "noPiece" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "node" ALTER COLUMN "port" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "node" ALTER COLUMN "apiPort" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "node" ALTER COLUMN "wsPort" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "node" ALTER COLUMN "wsPort" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "nodeFile" ALTER COLUMN "port" SET DATA TYPE integer;