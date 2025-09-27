import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DeploymentCheckpoint {
  networkName: string;
  timestamp: string;
  deployer: string;
  contracts: {
    stablecoin: string;
    wbtc: string;
    weth: string;
    layeredOptions: string;
    timeOracle: string;
    btcPriceFeed: string;
    ethPriceFeed: string;
  };
  tempAccounts?: {
    address: string;
    privateKey: string;
  }[];
  status: 'deployed' | 'demo-complete' | 'failed';
}

const CHECKPOINT_DIR = path.join(__dirname, '..', 'checkpoints');
const CHECKPOINT_FILE = (network: string) => path.join(CHECKPOINT_DIR, `${network}-checkpoint.json`);

// Ensure checkpoints directory exists
if (!fs.existsSync(CHECKPOINT_DIR)) {
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
}

export function saveCheckpoint(checkpoint: DeploymentCheckpoint): void {
  try {
    const checkpointPath = CHECKPOINT_FILE(checkpoint.networkName);
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
    console.log(`✅ Checkpoint saved to: ${checkpointPath}`);
  } catch (error: any) {
    console.error(`❌ Failed to save checkpoint: ${error.message}`);
  }
}

export function loadCheckpoint(networkName: string): DeploymentCheckpoint | null {
  try {
    const checkpointPath = CHECKPOINT_FILE(networkName);
    if (!fs.existsSync(checkpointPath)) {
      console.log(`ℹ️  No checkpoint found for network: ${networkName}`);
      return null;
    }
    
    const data = fs.readFileSync(checkpointPath, 'utf8');
    const checkpoint = JSON.parse(data) as DeploymentCheckpoint;
    console.log(`✅ Checkpoint loaded for network: ${networkName}`);
    console.log(`   Timestamp: ${checkpoint.timestamp}`);
    console.log(`   Status: ${checkpoint.status}`);
    return checkpoint;
  } catch (error: any) {
    console.error(`❌ Failed to load checkpoint: ${error.message}`);
    return null;
  }
}

export function listCheckpoints(): DeploymentCheckpoint[] {
  try {
    if (!fs.existsSync(CHECKPOINT_DIR)) {
      return [];
    }
    
    const files = fs.readdirSync(CHECKPOINT_DIR);
    const checkpoints: DeploymentCheckpoint[] = [];
    
    files.forEach(file => {
      if (file.endsWith('-checkpoint.json')) {
        try {
          const data = fs.readFileSync(path.join(CHECKPOINT_DIR, file), 'utf8');
          checkpoints.push(JSON.parse(data));
        } catch (error) {
          console.warn(`Warning: Could not parse checkpoint file: ${file}`);
        }
      }
    });
    
    return checkpoints;
  } catch (error: any) {
    console.error(`❌ Failed to list checkpoints: ${error.message}`);
    return [];
  }
}

export function deleteCheckpoint(networkName: string): boolean {
  try {
    const checkpointPath = CHECKPOINT_FILE(networkName);
    if (fs.existsSync(checkpointPath)) {
      fs.unlinkSync(checkpointPath);
      console.log(`✅ Checkpoint deleted for network: ${networkName}`);
      return true;
    } else {
      console.log(`ℹ️  No checkpoint found for network: ${networkName}`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Failed to delete checkpoint: ${error.message}`);
    return false;
  }
}

export function updateCheckpointStatus(networkName: string, status: DeploymentCheckpoint['status']): boolean {
  try {
    const checkpoint = loadCheckpoint(networkName);
    if (!checkpoint) {
      return false;
    }
    
    checkpoint.status = status;
    checkpoint.timestamp = new Date().toISOString();
    
    saveCheckpoint(checkpoint);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to update checkpoint status: ${error.message}`);
    return false;
  }
}