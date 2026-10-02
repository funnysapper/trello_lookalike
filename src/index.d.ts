import 'express';
import {Role} from './generated/prisma/client.ts';

declare global{
    namespace Express{
        interface Request{
            user?:{
                userId:number,
                email:string
            },
            membership?: Role
        }
    }
}
