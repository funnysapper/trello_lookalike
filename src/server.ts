import server from "./app.ts";
import redis from './config/redis.ts';

const PORT= Number(process.env.PORT);


server.listen(PORT, ()=>{
    console.log(`HELLO MATE, SERVER IS RUNNING ON PORT ${PORT}, HAVE A BLAST!!!`);
})