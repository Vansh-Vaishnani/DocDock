const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function start() {
  console.log('🔍 Checking if Docker daemon is running...');
  try {
    await execPromise('docker info');
  } catch (err) {
    console.error('\n❌ Error: Docker Desktop must be running to start local infrastructure.\n');
    process.exit(1);
  }

  console.log('🚀 Starting local Docker services (Kafka)...');
  try {
    await execPromise('docker compose -f docker-compose.dev.yml up -d');
  } catch (err) {
    console.error('❌ Failed to start docker compose:', err.message);
    process.exit(1);
  }

  console.log('⏳ Waiting for Kafka container to become healthy...');
  let healthy = false;
  for (let i = 0; i < 30; i++) {
    try {
      const { stdout } = await execPromise('docker inspect --format="{{.State.Health.Status}}" docdock-kafka');
      const status = stdout.trim();
      if (status === 'healthy') {
        healthy = true;
        break;
      }
      console.log(`   Status: ${status || 'starting'}...`);
    } catch (err) {
      // container might not be registered yet
      console.log('   Waiting for container to be ready...');
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  if (!healthy) {
    console.warn('⚠️  Warning: Kafka health check timed out or failed. Starting API anyway...');
  } else {
    console.log('✅ Kafka is healthy and ready!');
  }

  console.log('🎉 Launching DocDock API and Web workspaces...');
  // Require concurrently dynamically to avoid build-time issues
  const concurrently = require('concurrently');
  const { result } = concurrently([
    { command: 'npm run dev --workspace docdock-api', name: 'api', prefixColor: 'green' },
    { command: 'npm run dev --workspace docdock-web', name: 'web', prefixColor: 'blue' }
  ]);

  result.then(
    () => process.exit(0),
    () => process.exit(1)
  );
}

start().catch((err) => {
  console.error('❌ Startup script failed:', err);
  process.exit(1);
});
