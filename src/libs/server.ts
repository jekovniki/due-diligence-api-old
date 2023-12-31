import express, { Express } from "express";
import helmet from "helmet";
import bodyParser from "body-parser";
import cors from "cors";

import { IRestServer, IServerConfiguration } from "../interfaces/server";
import { SERVER } from "../utils/configuration";
import router from "../routes";

class Server implements IRestServer {
    private server: Express;
    private port: number;
    private host: string;

    constructor(configuration: IServerConfiguration) {
        this.server = configuration.server;
        this.port = configuration.port;
        this.host = configuration.host;
    }

    public start(): void {
        this.server.listen(this.port, () => {
            console.info(`Server is listening on: ${this.host}:${this.port}`);
        });
        this.middleware();
    }

    public getServer(): Express {
        return this.server;
    }

    public getPort(): number {
        return this.port;
    }

    private middleware(): void {
        this.server.use(helmet());
        this.server.use(bodyParser.json());
        this.server.use(cors({
            origin: SERVER.ORIGIN(),
            credentials: true
        }));
        this.server.use(router);
    }
}

export const server = new Server({
    port: SERVER.PORT,
    host: SERVER.HOST,
    server: express()
});