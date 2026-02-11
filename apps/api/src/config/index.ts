import appConfig from './app.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import jwtConfig from './jwt.config';
import s3Config from './s3.config';
import emailConfig from './email.config';
import razorpayConfig from './razorpay.config';

export const configurations = [
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  s3Config,
  emailConfig,
  razorpayConfig,
];

export { appConfig, databaseConfig, redisConfig, jwtConfig, s3Config, emailConfig, razorpayConfig };
