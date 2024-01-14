import express from "express";
const app = express();

import { rss } from "./controllers/rss";

app.get('/rss', (request: express.Request, response: express.Response) => {
    rss(request, response)
});

export { app };