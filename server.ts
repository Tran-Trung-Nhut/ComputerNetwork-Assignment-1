import { exec } from "child_process";

const DATABASE_START_COMMAND = 'cd backend && docker compose up'
const TRACKER_START_COMMAND = 'ts-node backend/src/server/tracker.ts'
// npm run dev:tracker --prefix backend


exec(DATABASE_START_COMMAND)

exec(TRACKER_START_COMMAND)