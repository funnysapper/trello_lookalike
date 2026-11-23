import { describe, it, expect } from 'vitest';
import request from 'supertest';
import server from '../app.ts';

describe('POST /auth/register', () =>{
    it('creates a user and returns tokens', async()=>{
        const res = await request(server)
        .post('/auth/register')
        .send({name:'ama mintah', email:'ama@test.com', password:'amamintah123'})
        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe('ama@test.com');
        expect(res.headers['set-cookie']).toBeDefined();
    });
    it('rejects a duplicate email', async()=>{
       const payload:{name:string; email:string; password:string} = {name:'john doe', email:'ama@test.com', password:'johndoe123'}
       await request(server).post('/auth/register').send(payload);
       const res = await request(server).post('/auth/register').send(payload)
       expect(res.status).toBe(409);
       expect(res.body.error).toBe('This email belongs to another user');
    });
    it("shouldn't contain the hashed password of the user", async()=>{
       const payload:{name:string; email:string; password:string} = {name:'jane doe', email:'janedoe@test.com', password:'janedoe123'};
       const res = await request(server).post('/auth/register').send(payload);
       expect(JSON.stringify(res.body.user)).not.toContain('passwordHash');
    })
})

describe('POST /auth/login', () => {
    it("shouldn't log in the user and return tokens", async()=>{
        await request(server).post('/auth/register').send({name:'abena mintah', email:'abena@test.com', password:'abenamintah123'});
        const res = await request(server).post('/auth/login').send({email:'abena@test.com', password:'abenamintak123'});
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid credentials!');
    })
    it('should reject login with wrong email', async()=>{
        const payload:{name:string;email:string; password:string} = {name :'ama mintah', email:'ama@test.com', password:'amamintah123'};
        await request(server).post('/auth/register').send(payload);
        const wrong = await request(server).post('/auth/login').send({email:'ma@test.com', password:'amamintah123'})      
        expect(wrong.status).toBe(401);
        expect(wrong.body.error).toBe('Invalid credentials!');
    })
    it('should log the user in and return tokens', async()=>{
        const registerPayload:{name:string;email:string; password:string} = {name :'ama mintah', email:'ama@test.com', password:'amamintah123'};
        await request(server).post('/auth/register').send(registerPayload);
        const payload:{email:string; password:string}= {email:'ama@test.com', password:'amamintah123'};
        const res = await request(server).post('/auth/login').send(payload);
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        expect(res.headers['set-cookie']).toBeDefined();
    })
})