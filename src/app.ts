import express from "express";
const app = express();

import { rss } from "./controllers/rss";
import { cache } from "./controllers/cache";

app.get('/rss', (request: express.Request, response: express.Response) => {
    rss(request, response);
});

app.get('/cache', (request: express.Request, response: express.Response) => {
    cache(request, response);
});

export { app };