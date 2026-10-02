import {Router} from 'express';
import { validateSchema } from '../middleware/validateSchema.ts';
import { createWorkspaceSchema, inviteUserSchema } from '../dtos/workspace.dto.ts';
import { createWorkspace, getWorkspaceByUserId, getWorkspaceMembers, inviteUser } from '../services/workspace.service.ts';
import { requireToken } from '../middleware/authWare.ts';
import { requireRole } from '../middleware/requireRole.ts';
import { Role } from '../generated/prisma/client.ts';


const workspaceRouter = Router();

workspaceRouter.post('/create', requireToken, validateSchema(createWorkspaceSchema), async(req,res)=>{
    const {name, description} = req.body;
    const userId = req.user!.userId;  
    const result  = await createWorkspace(userId, name, description);
    res.status(201).json({
        success: true,
        workspace: result
    });   
})

workspaceRouter.post('/invite/:id', requireToken, requireRole([Role.OWNER,Role.ADMIN]),validateSchema(inviteUserSchema), async(req,res)=>{
    const {email} = req.body;
    const workspaceId = Number(req.params.id);
    const {role} =req.body;
    const result = await inviteUser(workspaceId, email, role);
    res.status(200).json({
        success: true, 
        message:result
    });
})

workspaceRouter.get('/members/:id', requireToken, requireRole([Role.OWNER,Role.ADMIN,Role.MEMBER]), async(req,res)=>{
    const workspaceId = Number(req.params.id);
    const result = await getWorkspaceMembers(workspaceId);
    res.status(200).json({
        success: true,
        members: result
    });
})

workspaceRouter.get('/my-workspaces', requireToken, async(req,res)=>{
    const userId = req.user!.userId;
    const result = await getWorkspaceByUserId(userId);
    res.status(200).json({
        success: true,
        workspaces: result
    });
})




export default workspaceRouter;