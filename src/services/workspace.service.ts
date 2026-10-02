import { AppError } from "../middleware/error.ts";
import prisma from "../config/prisma.ts";
import { Role } from "../generated/prisma/browser.ts";
import { randomBytes } from "crypto";
import { sendWorkspaceInviteEmail } from "../utils/resendUtil.ts";  

export const getWorkspaceByUserId = async(userId:number)=>{   
    const userWorkspaces = await prisma.workspaceMember.findMany({
        where: {userId},
        include: {
            workspace: true,
        }
    })
    return userWorkspaces.map((m) => ({
        workspaceId: m.workspace.id,
        workspaceName: m.workspace.name,
        myRole: m.role
    }));
}

export const getWorkspaceMembers = async(workspaceId:number)=>{
    const members = await prisma.workspaceMember.findMany({
        where: {workspaceId},
        include: {
            user:true
        }
    });
    return members.map((m) => ({
        userId: m.user.id,
        userName: m.user.name,
        role: m.role
    }));
}

export const createWorkspace = async(userId:number, name:string, description?:string)=>{
    const newWorkspace = await prisma.workspace.create({
        data: {
            name,
            description,
            members:{
                create:{
                    userId:userId,
                    role:'OWNER'
                }
            }
        }
    });
    return newWorkspace;
}

export const inviteUser = async(workspaceId:number, email:string, role:Role)=>{
    const user = await prisma.user.findUnique({where:{email}});
    try{
        if(user){
            const existingMember = await prisma.workspaceMember.findUnique({
                where:{userId_workspaceId:{userId:user.id, workspaceId}}
            })
            if(!existingMember){
                await prisma.workspaceMember.create({
                    data:{
                        userId:user.id,
                        workspaceId:workspaceId,
                        role:role
                    }
                })
            }
            return { message: "User successfully added to the workspace!" };
        }    

        if(!user){
            const inviteToken = randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 1);
            const invite =await prisma.workspaceInvite.create({
                data: {
                    email:email,
                    workspaceId: workspaceId,
                    role:role,
                    token: inviteToken,
                    expiresAt: expiresAt
                }
            });
            const inviteLink = `http://localhost:6000/invite?token=${inviteToken}`;
            const invitedWorkspaceId = invite.workspaceId;
            const workspaceName = await prisma.workspace.findUnique({
                where:{
                    id:invitedWorkspaceId
                },
                select:{
                    name:true
                }
            });
            const invitee = await sendWorkspaceInviteEmail({
                toEmail: email,
                workspaceName: workspaceName!.name,
                inviteLink: inviteLink,
            });
            
            return { message: "Invitation email successfully sent to inbox!", data: invitee };
        }
    }catch(error:any){
      if(error.code==='P2002'){
        throw new AppError(409, "User is already a member of this workspace");
      }else{
        throw new AppError(500, "An error occurred while inviting the user");
      }
    }  
    
}





