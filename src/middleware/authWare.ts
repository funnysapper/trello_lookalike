import { Request, Response, NextFunction} from 'express';
import { verifyToken } from '../config/tokens.ts';
import {AppError} from './error.ts';


export function requireToken(req:Request, res:Response, next:NextFunction){
    const header = req.headers.authorization;
    if(!header || !header.startsWith('Bearer ')){
       throw new AppError(401,"No token present")
    }
    
    const token = header.split(" ")[1];
    req.user = verifyToken(token);
    if(!req.user){
       throw new AppError(401,"Invalid or expired token!")
    }
    next();
}
