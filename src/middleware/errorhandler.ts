import {Request, Response, NextFunction} from 'express';
import {AppError} from './error.ts';

export function errorHandler(error:any, _:Request, res: Response, next: NextFunction){
    if(error instanceof AppError){
       return res.status(error.statusCode).json({error: error.message});
    }
    console.error(error);

    const isDev = process.env.NODE_ENV !== 'PRODUCTION';
    return res.status(500).json({
        error: "Internal Server Error",
        ...(isDev && {detail:error.message})
    })

}