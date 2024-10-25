import express, { Request, Response } from 'express';
import dotenv from 'dotenv'
import cors from 'cors';
import { db } from './db/db';
import { node, nodeFile } from './db/schema';
import { eq } from 'drizzle-orm';
import { ClientDto } from './dtos/client.dto';

dotenv.config()

export const app = express();
app.use(cors())
app.use(express.json())

export let certainClient: ClientDto | null = null

export const resetCertainClient = () => {
    certainClient = null
}

