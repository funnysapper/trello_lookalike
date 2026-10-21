import 'dotenv/config';
import {Redis} from "ioredis";
const url = process.env.REDIS_URL;
if(!url){
    throw new Error('Redis url has not been set or cannot be found')
}
const redis = new Redis(url,{maxRetriesPerRequest: 1,
    connectTimeout: 1000,});
redis.on('connect',()=>{
    console.log('Redis connection established')
})
redis.on('error',(error:Error)=>{
    console.error('Redis error: ',error)
})

export default redis;