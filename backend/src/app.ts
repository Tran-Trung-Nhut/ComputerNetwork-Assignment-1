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
const port = process.env.API_PORT;

export let certainClient: ClientDto | null = null
export let fileNames: string = ''

export const resetFileName = () => {
    fileNames = ''
}

export const resetCertainClient = () => {
    certainClient = null
}

export class App{
    constructor() {
        this.loginIn()

        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
        });
    }

    public loginIn = () =>{
        app.post('/login', async (req: Request, res: Response) => {
            const { username } = req.body

            const client = await db
            .select()
            .from(node)
            .where(eq(node.username, username))

            if (client.length === 0){
                let avaiPort;
                let port = 3001
                for (;port < 3999; port++) {
                    avaiPort = await db
                    .select()
                    .from(node)
                    .where(eq(node.port, port))

                    if(avaiPort.length === 0) break;
                }
                
                await db
                .insert(node)
                .values({
                    port: port,
                    username: username,
                    apiPort: port + 1000,
                    wsPort:  port + 2000 
                })

                const newUser = await db
                .select()
                .from(node)
                .where(eq(node.username, username));

                certainClient = newUser[0]

                res.status(200).json({
                    client: newUser[0],
                })

                return
            }

            const data = await db
            .select()
            .from(nodeFile)
            .where(eq(nodeFile.port, client[0].port))

            fileNames = data.map((dt) => dt.name).join(',')
            certainClient = client[0]


            res.status(200).json({
                client: client[0],
            })
        })
    }
}
