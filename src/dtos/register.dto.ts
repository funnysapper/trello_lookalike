import {z} from 'zod';


export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password should be at least 8 characters long')
})

export const registerSchema = z.object({
    name: z.string()
        .trim()
        .min(2, 'Name should be at least 2 characters long')
        .max(100)
        .regex(/^\p{L}[\p{L}\p{M} .'-]*$/u, 'Name may only contain letters, spaces, hyphens and apostrophes'),
    email: z.string().email(),
    password: z.string().min(8, 'Password should be at least 8 characters long'),
})

// export const googleSchema = z.object({
//     idToken: z.string().min(1,'idToken is required')
// })

export const logoutSchema= z.object({
    token: z.string()
})

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
})

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
// export type GoogleInput = z.infer<typeof googleSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;