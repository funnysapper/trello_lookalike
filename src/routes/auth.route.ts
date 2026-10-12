import {Router} from 'express';
import {validateSchema} from '../middleware/validateSchema.ts'
import { loginSchema, logoutSchema, registerSchema } from '../dtos/register.dto.ts';
import { loginUser, registerUser, logout, refresh } from '../services/auth.service.ts';
import { requireToken } from '../middleware/authWare.ts';
import prisma from '../config/prisma.ts';
import rateLimiter from '../middleware/rateLimiter.ts';


const authRouter = Router();

authRouter.post('/login',rateLimiter, validateSchema(loginSchema), async(req,res)=>{
    const {email, password}= req.body; 
    const result = await loginUser(email,password);
    res.cookie('refreshToken',result.refreshToken,{
        httpOnly : true,
        sameSite : 'strict',
        secure : process.env.NODE_ENV === 'production',
        maxAge : 7*24*60*60*1000
    })
    res.status(200).json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
    });
});

authRouter.post('/register', validateSchema(registerSchema), async(req,res)=>{
   const {name,email,password} = req.body;
   const result = await registerUser(name,email,password);
    res.cookie('refreshToken',result.refreshToken,{
        httpOnly : true,
        sameSite : 'strict',
        secure : process.env.NODE_ENV === 'production',
        maxAge : 7*24*60*60*1000
    })
   res.status(201).json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
    });
});

authRouter.post('/logout',validateSchema(logoutSchema),async(req,res)=>{
   const {token} = req.body;
   const result = await logout(token);
   res.status(200).json(result);
});

authRouter.post('/refresh', async(req,res)=>{
    const token = req.cookies.refreshToken;
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Refresh token is missing'
        });
    }
    const result = await refresh(token);
    res.cookie('refreshToken',result.refreshToken,{
        httpOnly : true,
        sameSite : 'strict',
        secure : process.env.NODE_ENV === 'production',
        maxAge : 7*24*60*60*1000
    })
    res.status(200).json({
        success: true,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
    });
});

authRouter.get('/me', requireToken, async(req,res)=>{
    const user = await prisma.user.findUnique({
        where: {id: req.user?.userId},
        select: {id:true, name:true, email:true, createdAt:true}
    });
    res.status(200).json(user);
});

export default authRouter;