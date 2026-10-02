import server from "./app.ts";

const PORT= Number(process.env.PORT);


server.listen(PORT, ()=>{
    console.log(`HELLO MATE, SERVER IS RUNNING ON PORT ${PORT}, HAVE A BLAST!!!`);
})