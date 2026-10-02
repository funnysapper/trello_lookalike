import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface InviteEmailProps {
  toEmail: string;
  workspaceName: string;
  inviteLink: string;
}

export const sendWorkspaceInviteEmail = async ({
  toEmail,
  workspaceName,
  inviteLink,
}: InviteEmailProps) => {
  try {
    const data = await resend.emails.send({
      from: 'Trello App <onboarding@resend.dev>',
      to: [toEmail],
      subject: `You've been invited to join ${workspaceName} on Trello!`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>You're Invited!</h2>
          <p>Someone invited you to join the <strong>${workspaceName}</strong> workspace.</p>
          <p>Click the button below to accept your invitation and create your account:</p>
          <a href="${inviteLink}" style="background-color: #0052CC; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
            Accept Invitation
          </a>
          <p style="margin-top: 20px; font-size: 12px; color: #777;">
            If the button doesn't work, copy and paste this link into your browser: <br/>
            <a href="${inviteLink}">${inviteLink}</a>
          </p>
        </div>
      `,
    });

    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Could not send invitation email.');
  }
};