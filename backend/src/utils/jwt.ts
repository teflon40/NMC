import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface TokenPayload {
    userId: number;
    username: string;
    role: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, config.jwtAccessSecret as any, {
        expiresIn: config.jwtAccessExpiry as any,
    });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, config.jwtRefreshSecret as any, {
        expiresIn: config.jwtRefreshExpiry as any,
    });
};

export const verifyAccessToken = (token: string): TokenPayload => {
    return jwt.verify(token, config.jwtAccessSecret as any) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    return jwt.verify(token, config.jwtRefreshSecret as any) as TokenPayload;
};
