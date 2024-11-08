CREATE TABLE IF NOT EXISTS "file" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"uploadTime" integer NOT NULL,
	"completedFile" integer NOT NULL,
	"peerID" varchar(255) NOT NULL,
	CONSTRAINT "file_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "peer" (
	"ID" varchar(255) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "peerConnectPeer" (
	"peerID1" varchar(255) NOT NULL,
	"peerID2" varchar(255) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file" ADD CONSTRAINT "file_peerID_peer_ID_fk" FOREIGN KEY ("peerID") REFERENCES "public"."peer"("ID") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
