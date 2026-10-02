import {Request, Response,NextFunction} from 'express';

const users = new Map<string, number[]>();
const MAX_REQUESTS = 6;
const WINDOW = 5*60*1000;

function rateLimiter(req:Request,res:Response,next:NextFunction){
    const user = String(req.ip);
    const now = Date.now();
    const cutoff = now - WINDOW;
    const timeStamps = users.get(user) ?? [];
    const recents= timeStamps.filter(t => t > cutoff);
    if(recents.length >= MAX_REQUESTS){
        const oldest = recents[0];
        const timeLeft = Math.ceil((oldest + WINDOW -now)/1000);
        return res.status(429).json({message: `Too many requests from you, Relax and then try again in ${timeLeft}s`});
    }


 recents.push(now);
    users.set(user,recents);
    next();
}

setInterval(()=>{
    const cutoff = Date.now() - WINDOW;
    for(const [ip, timestamps] of users){
       const recent = timestamps.filter(t => t > cutoff);
       if(recent.length === 0){
          users.delete(ip);
       }else{
        users.set(ip,recent);
       }
    } 
},WINDOW);

export default rateLimiter;