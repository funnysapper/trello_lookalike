import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken } from '../config/tokens.ts';
import prisma from "../config/prisma.ts";
import {AppError} from '../middleware/error.ts';

async function issueTokens(userId:number, email:string){
    const REFRESH_TIME = new Date(Date.now()+ 7*24*60*60*1000);
    const accessToken = generateAccessToken({userId,email});
    const refreshToken = generateRefreshToken();
    await prisma.refreshToken.create({
        data: {
            refreshToken: refreshToken,
            expiresAt: REFRESH_TIME,
            userId: userId
        }
    });
    function formatTimeRemaining(expirationMs: number): string {
        const now = Date.now();
        const diffMs = expirationMs - now;

        if (diffMs <= 0) {
            return 'Expired';
        }

        const seconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} days, ${hours % 24} hours remaining`;
        if (hours > 0) return `${hours} hours, ${minutes % 60} minutes remaining`;
        if (minutes > 0) return `${minutes} minutes remaining`;
        return `${seconds} seconds remaining`;
    }
    return {accessToken, refreshToken, expiresIn: formatTimeRemaining(REFRESH_TIME.getTime())};
}


export const registerUser = async(name:string, email:string, password:string)=>{
    
    const hashedPassword = await bcrypt.hash(password,10);
    const user = await prisma.user.findUnique({where:{email}});
    if(user){
        throw new AppError(409, "This email belongs to another user");
    }
    const newUser = await prisma.user.create({
        data:{
            name:name,
            email:email,
            passwordHash:hashedPassword
        }
    });
    const tokens = await issueTokens(newUser.id,newUser.email)
    return {
        user:{id:newUser.id,name:newUser.name, email:newUser.email},
        ...tokens
    }
}

export const loginUser = async(email:string, password:string)=>{
    const user = await prisma.user.findUnique({where: {email}});
    if(!user){
       throw new AppError(401,"Invalid credentials!");
    }
    const correctPass = bcrypt.compare(password, user.passwordHash);
    if(!correctPass){
        throw new AppError(401,"Invalid credentials!");
    }

    const tokens = await issueTokens(user.id, user.email);
    
    return {
        user:{id:user.id,name:user.name, email:user.email},
        ...tokens
    }
}

export const refresh = async(token:string) => {
    const stored = await prisma.refreshToken.findUnique({
        where : {refreshToken: token},
        include:{user:true}
    });
    if(!stored){
        throw new AppError(401,"Invalid refresh token!")
    }
    if(stored.expiresAt < new Date()){
      await prisma.refreshToken.delete({where:{id:stored.id}})
      throw new AppError(401, "Refresh token expired")
    }
    await prisma.refreshToken.delete({where:{id:stored.id}});
    return issueTokens(stored.userId, stored.user.email)
      
}
setInterval(async()=>{
    const refreshTokens = await prisma.refreshToken.findMany();
    const date = new Date();
    for(const refreshToken of refreshTokens){
        if(refreshToken.expiresAt < date){
           await prisma.refreshToken.delete({where : {id: refreshToken.id}});
        }
    }
}, 7*24*60*60*1000)

export const logout = async(token:string)=>{
    await prisma.refreshToken.deleteMany({where : {refreshToken:token}});
    return { message: 'Logout successful!'}
}