import {Router} from 'express';
import { validateSchema } from '../middleware/validateSchema.ts';
import { changeMemberRoleSchema, createWorkspaceSchema, inviteUserSchema, removeMemberSchema, renameWorkspaceSchema } from '../dtos/workspace.dto.ts';
import { changeMemberRole, createWorkspace, getWorkspacesForUser, getWorkspaceMembers, inviteUser, leaveWorkspace, removeMember, renameWorkspace } from '../services/workspace.service.ts';
import { requireToken } from '../middleware/authWare.ts';
import { requireRole } from '../middleware/requireRole.ts';
import { Role } from '../generated/prisma/client.ts';


const workspaceRouter = Router({mergeParams:true});

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

workspaceRouter.get('/members/:id', requireToken, requireRole([Role.OWNER,Role.ADMIN,Role.MEMBER,Role.VIEWER]), async(req,res)=>{
    const workspaceId = Number(req.params.id);
    const result = await getWorkspaceMembers(workspaceId);
    res.status(200).json({
        success: true,
        members: result
    });
})

workspaceRouter.get('/my-workspaces', requireToken, async(req,res)=>{
    const userId = req.user!.userId;
    const result = await getWorkspacesForUser(userId);
    res.status(200).json({
        success: true,
        workspaces: result
    });
})

workspaceRouter.post('/rename/:id', requireToken, requireRole([Role.OWNER,Role.ADMIN]), validateSchema(renameWorkspaceSchema), async(req,res)=>{
   const workspaceId = Number(req.params.id);
   const { newName, description } = req.body;
   const result = await renameWorkspace(newName, workspaceId, description)
   res.status(200).json({
        success:true,
        results: result
   });
})

workspaceRouter.delete('/removeMember/:id', requireToken, requireRole([Role.OWNER,Role.ADMIN]), validateSchema(removeMemberSchema), async(req,res)=>{
    const callerId = req.user!.userId;
    const workspaceId = Number(req.params.id);
    const {targetUserId} = req.body;
    const result = await removeMember(targetUserId,workspaceId, callerId!);
    res.status(200).json(result);
})

workspaceRouter.patch('/changeMemberRole/:id',requireToken,requireRole([Role.OWNER]),validateSchema(changeMemberRoleSchema), async(req,res)=>{
   const callerId = req.user!.userId;
   const workspaceId = Number(req.params.id);
   const {targetUserId,newRole}= req.body;
   const result = await changeMemberRole(targetUserId,workspaceId,newRole,callerId);
   res.status(200).json(result);
})

workspaceRouter.delete('/leave/:id', requireToken,requireRole([Role.OWNER]), async(req,res)=>{
    const userId = req.user!.userId;
    const workspaceId = Number(req.params.id);
    const result = await leaveWorkspace(userId, workspaceId);
    res.status(200).json(result);
})


export default workspaceRouter;