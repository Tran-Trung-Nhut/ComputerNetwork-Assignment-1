CREATE TABLE IF NOT EXISTS "file" (
	"name" varchar(255) PRIMARY KEY NOT NULL,
	"size" integer NOT NULL,
	"pieceSize" integer NOT NULL,
	"noPiece" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "node" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255),
	CONSTRAINT "node_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nodeFile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nodeId" uuid NOT NULL,
	"name" varchar(255) NOT NULL
);
