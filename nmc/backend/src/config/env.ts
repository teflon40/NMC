import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    databaseUrl: process.env.DATABASE_URL || '',
};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';

// --- JWT secret strength validation ---
const WEAK_SECRETS = [
    'dev-access-secret',
    'dev-refresh-secret',
    'nmc-access-secret-key-2024',
    'nmc-refresh-secret-key-2024',
    'your-super-secret-access-key-change-this-in-production',
    'your-super-secret-refresh-key-change-this-in-production',
    'CHANGE_ME_generate_with_crypto_randomBytes_64',
];

function validateJwtSecrets(): void {
    const accessWeak = WEAK_SECRETS.includes(config.jwtAccessSecret);
    const refreshWeak = WEAK_SECRETS.includes(config.jwtRefreshSecret);
    const tooShort = config.jwtAccessSecret.length < 32 || config.jwtRefreshSecret.length < 32;

    if (isProduction && (accessWeak || refreshWeak || tooShort)) {
        console.error('❌ FATAL: JWT secrets are too weak for production. Generate strong secrets:');
        console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
        process.exit(1);
    }

    if (isDevelopment && (accessWeak || refreshWeak)) {
        console.warn('⚠️  WARNING: JWT secrets are weak. Fine for local dev, but never deploy these.');
    }
}

validateJwtSecrets();
