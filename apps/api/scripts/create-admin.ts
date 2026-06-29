import readline from 'readline';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { config } from '../src/common/config';
import { UserModel } from '../src/modules/auth/auth.repository';
import { AdminModel } from '../src/modules/admin/admin.repository';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question: string): Promise<string> =>
  new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });

const askHidden = (question: string): Promise<string> =>
  new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    process.stdout.write(question);

    let password = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (char: string) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode?.(wasRaw ?? false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
        return;
      }
      if (char === '\u0003') {
        process.exit(1);
      }
      if (char === '\u007f' || char === '\b') {
        password = password.slice(0, -1);
        process.stdout.write('\b \b');
        return;
      }
      password += char;
      process.stdout.write('*');
    };

    stdin.on('data', onData);
  });

async function main(): Promise<void> {
  await mongoose.connect(config.mongoUri, { autoIndex: true });

  const existingAdmin = await UserModel.findOne({ role: 'admin', isDeleted: false });
  if (existingAdmin) {
    console.log('Admin already exists.');
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }

  const fullName = await ask('Name: ');
  const email = (await ask('Email: ')).toLowerCase();
  const password = await askHidden('Password: ');

  if (!fullName || !email || !password) {
    console.error('All fields are required.');
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }

  const emailTaken = await UserModel.findOne({ email });
  if (emailTaken) {
    console.error('Email is already registered.');
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const phoneSuffix = Date.now().toString().slice(-10);
  const user = await UserModel.create({
    fullName,
    email,
    phone: `+91${phoneSuffix}`,
    passwordHash,
    role: 'admin',
    isVerified: true,
    isActive: true,
    isDeleted: false
  });

  await AdminModel.create({ userId: user._id, role: 'admin' });

  console.log(`Admin account created for ${email}.`);
  rl.close();
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  rl.close();
  process.exit(1);
});
