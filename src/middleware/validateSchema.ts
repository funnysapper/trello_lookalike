import {Request, Response, NextFunction} from 'express';
import { ZodTypeAny } from 'zod';

export function validateSchema(schema:ZodTypeAny){
    return (req:Request, res:Response, next:NextFunction)=>{
        const result = schema.safeParse(req.body);
        if(!result.success){
           return res.status(400).json({
            message:"Invalid Input",
            details: result.error.issues
           })
        }
        req.body = result.data;
        next();
    };
}