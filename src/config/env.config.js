import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_ENV_VARS = ['PORT', 'NODE_ENV'];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return value === undefined || value === '';
  });

  if (missing.length > 0) {
    console.error(
      `[env.config] Faltan variables de entorno requeridas: ${missing.join(', ')}.\n` +
      'Creá un archivo .env basado en .env_example antes de iniciar la app.'
    );
    process.exit(1);
  }
}

validateEnv();

export const env = {
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
};

export default env;