import jwt from "jsonwebtoken";
import crypto from "crypto";


interface Payload{
    userId:number,
    email:string
}

const getSecret = ():string => {
    const secret = process.env.JWT_SECRET;
    if(!secret){
        throw new Error("JWT SECRET hasn't been set!")
    }
    return secret;
};


export const generateAccessToken = (payload:Payload):string =>{
    return jwt.sign(payload, getSecret(), {expiresIn:'1h'});
}

export const generateRefreshToken = ():string => {
   return crypto.randomBytes(40).toString('hex');
}

export const verifyToken = (accessToken:string):Payload => {
    return jwt.verify(accessToken, getSecret())as Payload;
}