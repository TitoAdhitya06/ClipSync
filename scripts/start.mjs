import { networkInterfaces } from 'node:os';
import { execSync } from 'node:child_process';

const nets = networkInterfaces();
let localIp = 'localhost';

// Locate non-internal IPv4 address on active physical network interface
for (const name of Object.keys(nets)) {
  for (const net of nets[name] || []) {
    const isInternal = net.internal;
    const isV4 = net.family === 'IPv4';
    const isVirtual = name.toLowerCase().includes('wsl') || 
                      name.toLowerCase().includes('vbox') || 
                      name.toLowerCase().includes('vmware') ||
                      name.toLowerCase().includes('docker');
    
    if (isV4 && !isInternal && !isVirtual) {
      localIp = net.address;
      break;
    }
  }
  if (localIp !== 'localhost') break;
}

console.log('\n================================================================');
console.log('🚀 Starting ClipSync with Docker...');
console.log('================================================================');
console.log(`💻 Access on this Computer: http://localhost:3000`);
console.log(`📱 Access on other Devices: http://${localIp}:3000`);
console.log('================================================================\n');

try {
  execSync('docker compose up --build -d', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to start Docker Compose:', error.message);
  process.exit(1);
}
