import server from "./app.ts";
import http from 'node:http';
import { initSocket } from "./middleware/socket.ts";

const PORT= Number(process.env.PORT);
const httpServer = http.createServer(server);
initSocket(httpServer);


httpServer.listen(PORT, ()=>{
    console.log(`HELLO MATE, SERVER IS RUNNING ON PORT ${PORT}, HAVE A BLAST!!!`);
})