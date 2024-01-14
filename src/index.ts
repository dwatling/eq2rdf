import * as http from "http";
import { app } from "./app";

const port = 80;

const server = http.createServer(app);
server.timeout = 10000;

server.listen(port, () => {
    console.info(`Listening on port ${port}`);
});
