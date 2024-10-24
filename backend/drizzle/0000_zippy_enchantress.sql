CREATE TABLE IF NOT EXISTS "file" (
	"name" varchar(255) PRIMARY KEY NOT NULL,
	"size" numeric NOT NULL,
	"pieceSize" numeric NOT NULL,
	"noPiece" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "node" (
	"port" numeric PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" numeric NOT NULL,
	CONSTRAINT "node_username_unique" UNIQUE("username"),
	CONSTRAINT "node_password_unique" UNIQUE("password")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nodeFile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"port" numeric NOT NULL,
	"name" varchar(255) NOT NULL
);
