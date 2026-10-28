import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { verifyToken } from '../config/tokens.ts';
import { SocketData } from '../socket.types.ts';
import prisma from '../config/prisma.ts';
import {getMembership} from '../services/workspace.service.ts';

let websocketEngine: Server;

export function initSocket(httpServer:HttpServer){
    websocketEngine = new Server<{},{},{},SocketData>(httpServer,{
        cors: {origin: '*'}
    })
    
    websocketEngine.use((socket,next)=>{
        const token = socket.handshake.auth.token;
        if(!token){
            return next(new Error('No token provided'))
        }
        try{   
        const user = verifyToken(token);
        socket.data.userId = user.userId;
        next();
        }catch{
        next(new Error('Invalid token'))
        }
    })

    websocketEngine.on('connect',(socket)=>{
        console.log(`user ${socket.data.userId} connected`);
        socket.on('disconnect', ()=>{
            console.log(`user ${socket.data.userId} disconnected`)
        });
        
        socket.on('board:join', async(boardId:number)=>{
        try{
            const userId = socket.data.userId;
            const board = await prisma.board.findUnique({
                where: { id : boardId},
                select:{workspaceId:true}
            });
            if(!board){
                socket.emit('board:join:error',"This board doesn't belong to any workspace");
                return;
            }
            const member = await getMembership(userId, board.workspaceId);
            if(!member){
                socket.emit('board:join:error',"You're not a member of the workspace this board belongs to!");
                return;
            }
            socket.join(`board:${boardId}`);
            socket.emit('board:joined', {boardId})
        
        }catch(error){
            console.error(error);
            socket.emit('board:join:error', {message:'Failed to join'});
        }});
        socket.on('board:leave', async(boardId: number)=>{
            socket.leave(`board:${boardId}`)
        })
    })
    
    return websocketEngine;
};


export function getEngine():Server{
    if(!websocketEngine){
        throw new Error('Socket.io has not been initialized')
    }
    return websocketEngine;
}

export function emitToBoard(boardId:number, event:string, data:any){
    try{
      getEngine().to(`board:${boardId}`).emit(event, data)
    }catch(error){
      console.error('Failed to broadcast the message', error)
    }

}