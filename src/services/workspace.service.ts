import { AppError } from "../middleware/error.ts";
import prisma from "../config/prisma.ts";
import { Role } from "../generated/prisma/client.ts";
import { randomBytes } from "crypto";
import { sendWorkspaceInviteEmail } from "../utils/resendUtil.ts";  

export const getWorkspacesForUser = async(userId:number)=>{   
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
        select: {
            role: true,
            user: {
                select: { id: true, name: true},
            },
        },
    });
    return members.map((m) => ({
        userId: m.user.id,
        userName: m.user.name,
        role: m.role
    }));
}

export const createWorkspace = async(userId:number, name:string, description?:string)=>{
    const existingWorkspace = await prisma.workspace.findUnique({
        where : {name:name}
    }) 
    if(existingWorkspace){
        throw new AppError(409, 'A workspace with this name already exists')
    }
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
        if (user) {
            try {
                await prisma.workspaceMember.create({
                    data: { userId: user.id, workspaceId, role },
                });
                return { message: "User successfully added to the workspace!" };
            } catch (error: any) {
                if (error.code === 'P2002') {
                    throw new AppError(409, "User is already a member of this workspace");
                }
                throw error;
            }
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
      }
      throw error;
    }  
    
}

export const renameWorkspace = async(name:string, workspaceId:number, description?:string)=>{
    const renamed = await prisma.workspace.update({
        where:{id:workspaceId},
        data:{
            name:name,
            description:description
        }
    })
    return {message:"Workspace renamed successfully", data:renamed};
        
}

export const removeMember = async(userId:number, workspaceId:number, idOfUser:number)=>{
    const leader = await prisma.workspaceMember.findUnique({
        where:{userId_workspaceId : {userId: idOfUser, workspaceId: workspaceId}},
        select:{
            role:true
        }
    })
    if(leader?.role !== 'OWNER' && leader?.role !== 'ADMIN'){
       throw new AppError(403, "You do not have permission to remove members from this workspace");
    }
    const userToBeRemoved = await prisma.workspaceMember.findUnique({
        where : {
            userId_workspaceId :{
                userId:userId,
                workspaceId:workspaceId
            }
        },
        select:{
            role:true
        }
    })
    if(userToBeRemoved && userToBeRemoved.role !== 'OWNER'){
        await prisma.workspaceMember.delete({
            where : {
                userId_workspaceId :{
                    userId:userId,
                    workspaceId:workspaceId
                }
            }
        })
        return {message:"Member removed successfully"};
    }else{
        throw new AppError(403, "You cannot remove the owner of the workspace");
    }
}

export const changeMemberRole = async(userId:number, workspaceId:number, newRole:Role, idOfUser:number)=>{
    const caller = await prisma.workspaceMember.findUnique({
        where:{userId_workspaceId: {userId:idOfUser, workspaceId:workspaceId}},
        select:{role:true}
    })
    if(!caller){
       throw new AppError(404,"The user is not a member of this workspace")
    }
    if(caller && caller.role !== 'OWNER'){
        throw new AppError(403, "You do not have permission to change the role of this member");
    }
    const changedRole = await prisma.workspaceMember.update({
        where:{userId_workspaceId: {userId:userId, workspaceId:workspaceId}},
        data:{role:newRole, roleUpdatedAt: new Date()}
    })
    return {message:`Member's role has been successfully changed to ${newRole} at ${changedRole.roleUpdatedAt}`};
}

export const leaveWorkspace = async (userId: number, workspaceId: number) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: userId, workspaceId: workspaceId },
      },
    });

    if (!user) {
      throw new AppError(404, "The user doesn't belong to this workspace");
    }

    if (user.role !== 'OWNER') {
      await tx.workspaceMember.delete({
        where: {
          userId_workspaceId: { userId: userId, workspaceId: workspaceId },
        },
      });
      return;
    }

    const remainingMembers = await tx.workspaceMember.findMany({
      where: {
        workspaceId: workspaceId,
        userId: { not: userId }, 
      },
    });

    if (remainingMembers.length === 0) {
      await tx.workspace.delete({
        where: { id: workspaceId },
      });
      return;
    }

    const successor = [...remainingMembers].sort((a, b) => {
      if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
      if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;

      const dateA = (a.createdAt ?? a.roleUpdatedAt ?? new Date(0)).getTime();
      const dateB = (b.createdAt ?? b.roleUpdatedAt ?? new Date(0)).getTime();
      return dateA - dateB;
    })[0];

    await tx.workspaceMember.update({
      where: {
        userId_workspaceId: {
          userId: successor.userId,
          workspaceId: successor.workspaceId,
        },
      },
      data: {
        role: 'OWNER',
      },
    });

    await tx.workspaceMember.delete({
      where: {
        userId_workspaceId: { userId: userId, workspaceId: workspaceId },
      },
    });
  });
};

export async function getMembership(userId:number, workspaceId:number){
    return await prisma.workspaceMember.findUnique({
        where:{
            userId_workspaceId: {userId,workspaceId}
        },
        select:{
            role:true
        }
    })
}