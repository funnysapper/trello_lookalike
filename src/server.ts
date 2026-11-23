import server from "./app.ts";
import http from 'node:http';
import { initSocket } from "./middleware/socket.ts";

const PORT= Number(process.env.PORT);
const INSTANCE = process.env.INSTANCE_ID ?? 'A';
const httpServer = http.createServer(server);
initSocket(httpServer);


httpServer.listen(PORT, ()=>{
    console.log(`HELLO MATE, SERVER IS RUNNING ON PORT ${PORT}, AND ITS INSTANCE ${INSTANCE}, HAVE A BLAST!!!`);
})