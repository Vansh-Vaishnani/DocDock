import path from 'path';
import dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
const envCandidates = [
  path.resolve(process.cwd(), envFile),
  path.resolve(process.cwd(), '../../', envFile),
  path.resolve(process.cwd(), '../../..', envFile)
];

for (const candidate of envCandidates) {
  dotenv.config({ path: candidate });
}

const nextConfig = {
  reactStrictMode: true
};

export default nextConfig;
