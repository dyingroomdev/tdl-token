#!/usr/bin/env ts-node

import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import DollarTokenClient from '../client/interact';
import { AccessControlManager } from '../client/access-control';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

// Load addresses from file
function loadAddresses() {
  try {
    const addressesPath = path.join(__dirname, '../client/addresses.json');
    return JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  } catch (error) {
    console.error('❌ Error loading addresses.json. Run deployment first!');
    process.exit(1);
  }
}

// Initialize client and access control manager
function initializeManagers() {
  const addresses = loadAddresses();
  const client = new DollarTokenClient();
  const mint = new PublicKey(addresses.mint);
  const accessControl = new AccessControlManager(client, mint);
  return { client, accessControl, mint };
}

// Main CLI configuration
program
  .name('manage-access')
  .description('Dollar Token Access Control Management CLI')
  .version('1.0.0');

// ========== BLACKLIST COMMANDS ==========

const blacklist = program.command('blacklist').description('Manage blacklisted wallets');

blacklist
  .command('add <wallet>')
  .description('Add a wallet to the blacklist')
  .option('-r, --reason <reason>', 'Reason for blacklisting')
  .action(async (wallet: string, options) => {
    try {
      const { accessControl } = initializeManagers();
      const walletPubkey = new PublicKey(wallet);
      
      console.log(`🚫 Blacklisting wallet: ${wallet}`);
      if (options.reason) {
        console.log(`   Reason: ${options.reason}`);
      }
      
      const tx = await accessControl.addToBlacklist(walletPubkey);
      console.log(`✅ Success! Transaction: ${tx}`);
      
      // Log to file
      const logEntry = {
        action: 'blacklist_add',
        wallet,
        reason: options.reason || 'No reason provided',
        timestamp: new Date().toISOString(),
        transaction: tx,
      };
      
      const logPath = path.join(__dirname, '../logs/blacklist.json');
      let logs = [];
      if (fs.existsSync(logPath)) {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      }
      logs.push(logEntry);
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

blacklist
  .command('remove <wallet>')
  .description('Remove a wallet from the blacklist')
  .action(async (wallet: string) => {
    try {
      const { accessControl } = initializeManagers();
      const walletPubkey = new PublicKey(wallet);
      
      console.log(`✅ Removing wallet from blacklist: ${wallet}`);
      const tx = await accessControl.removeFromBlacklist(walletPubkey);
      console.log(`✅ Success! Transaction: ${tx}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

blacklist
  .command('check <wallet>')
  .description('Check if a wallet is blacklisted')
  .action(async (wallet: string) => {
    try {
      const { accessControl } = initializeManagers();
      const walletPubkey = new PublicKey(wallet);
      
      const isBlacklisted = await accessControl.isBlacklisted(walletPubkey);
      
      console.log(`\n📋 Blacklist Status for ${wallet}:`);
      console.log(`   Status: ${isBlacklisted ? '🚫 BLACKLISTED' : '✅ Not Blacklisted'}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

blacklist
  .command('batch <file>')
  .description('Batch blacklist wallets from a JSON file')
  .action(async (file: string) => {
    try {
      const { accessControl } = initializeManagers();
      
      const wallets = JSON.parse(fs.readFileSync(file, 'utf8'));
      console.log(`🚫 Batch blacklisting ${wallets.length} wallets...`);
      
      const results = await accessControl.batchBlacklist(
        wallets.map((w: string) => new PublicKey(w))
      );
      
      console.log(`✅ Completed: ${results.length}/${wallets.length} successful`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

blacklist
  .command('toggle <enabled>')
  .description('Enable or disable the blacklist system (true/false)')
  .action(async (enabled: string) => {
    try {
      const { accessControl } = initializeManagers();
      const isEnabled = enabled.toLowerCase() === 'true';
      
      console.log(`⚙️ ${isEnabled ? 'Enabling' : 'Disabling'} blacklist system...`);
      const tx = await accessControl.toggleBlacklistSystem(isEnabled);
      console.log(`✅ Success! Transaction: ${tx}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ========== WHITELIST COMMANDS ==========

const whitelist = program.command('whitelist').description('Manage whitelisted wallets');

whitelist
  .command('add <wallet> <allocation>')
  .description('Add a wallet to the whitelist with token allocation')
  .action(async (wallet: string, allocation: string) => {
    try {
      const { accessControl } = initializeManagers();
      const walletPubkey = new PublicKey(wallet);
      const allocationAmount = parseFloat(allocation);
      
      console.log(`✅ Whitelisting wallet: ${wallet}`);
      console.log(`   Allocation: ${allocationAmount} tokens`);
      
      const tx = await accessControl.addToWhitelist(walletPubkey, allocationAmount);
      console.log(`✅ Success! Transaction: ${tx}`);
      
      // Log to file
      const logEntry = {
        action: 'whitelist_add',
        wallet,
        allocation: allocationAmount,
        timestamp: new Date().toISOString(),
        transaction: tx,
      };
      
      const logPath = path.join(__dirname, '../logs/whitelist.json');
      let logs = [];
      if (fs.existsSync(logPath)) {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      }
      logs.push(logEntry);
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

whitelist
  .command('remove <wallet>')
  .description('Remove a wallet from the whitelist')
  .action(async (wallet: string) => {
    try {
      const { accessControl } = initializeManagers();
      const walletPubkey = new PublicKey(wallet);
      
      console.log(`❌ Removing wallet from whitelist: ${wallet}`);
      const tx = await accessControl.removeFromWhitelist(walletPubkey);
      console.log(`✅ Success! Transaction: ${tx}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

whitelist
  .command('check <wallet>')
  .description('Check if a wallet is whitelisted and view allocation')
  .action(async (wallet: string) => {
    try {
      const { accessControl } = initializeManagers();
      const walletPubkey = new PublicKey(wallet);
      
      const status = await accessControl.isWhitelisted(walletPubkey);
      
      console.log(`\n📋 Whitelist Status for ${wallet}:`);
      console.log(`   Status: ${status.isWhitelisted ? '✅ WHITELISTED' : '❌ Not Whitelisted'}`);
      if (status.isWhitelisted) {
        console.log(`   Allocation: ${status.allocation / 1e9} tokens`);
        console.log(`   Purchased: ${status.purchased / 1e9} tokens`);
        console.log(`   Remaining: ${(status.allocation - status.purchased) / 1e9} tokens`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

whitelist
  .command('batch <file>')
  .description('Batch whitelist wallets from a JSON file [{address, allocation}]')
  .action(async (file: string) => {
    try {
      const { accessControl } = initializeManagers();
      
      const wallets = JSON.parse(fs.readFileSync(file, 'utf8'));
      console.log(`✅ Batch whitelisting ${wallets.length} wallets...`);
      
      const results = await accessControl.batchWhitelist(
        wallets.map((w: any) => ({
          address: new PublicKey(w.address),
          allocation: w.allocation,
        }))
      );
      
      console.log(`✅ Completed: ${results.length}/${wallets.length} successful`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

whitelist
  .command('toggle <enabled>')
  .description('Enable or disable whitelist mode (true/false)')
  .action(async (enabled: string) => {
    try {
      const { accessControl } = initializeManagers();
      const isEnabled = enabled.toLowerCase() === 'true';
      
      console.log(`⚙️ ${isEnabled ? 'Enabling' : 'Disabling'} whitelist mode...`);
      const tx = await accessControl.toggleWhitelistMode(isEnabled);
      console.log(`✅ Success! Transaction: ${tx}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ========== TRADING COMMANDS ==========

program
  .command('trading <enabled>')
  .description('Enable or disable trading (true/false)')
  .action(async (enabled: string) => {
    try {
      const { accessControl } = initializeManagers();
      const isEnabled = enabled.toLowerCase() === 'true';
      
      console.log(`⚙️ ${isEnabled ? 'Enabling' : 'Disabling'} trading...`);
      const tx = await accessControl.toggleTrading(isEnabled);
      console.log(`✅ Success! Transaction: ${tx}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ========== STATUS COMMANDS ==========

program
  .command('status')
  .description('Display current access control status')
  .action(async () => {
    try {
      const { accessControl } = initializeManagers();
      
      await accessControl.displayAccessControlStatus();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ========== PRESET COMMANDS ==========

const preset = program.command('preset').description('Apply preset configurations');

preset
  .command('anti-bot')
  .description('Setup anti-bot protection (for launch)')
  .action(async () => {
    try {
      const { accessControl } = initializeManagers();
      
      console.log('🛡️ Setting up anti-bot protection...');
      await accessControl.setupAntiBotProtection();
      
      await accessControl.displayAccessControlStatus();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

preset
  .command('public-launch')
  .description('Enable public trading (disable whitelist, enable trading)')
  .action(async () => {
    try {
      const { accessControl } = initializeManagers();
      
      console.log('🚀 Enabling public trading...');
      await accessControl.enablePublicTrading();
      
      await accessControl.displayAccessControlStatus();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ========== EMERGENCY COMMANDS ==========

program
  .command('emergency-pause')
  .description('⚠️ Emergency pause all trading')
  .action(async () => {
    try {
      console.log('⚠️ EMERGENCY PAUSE INITIATED');
      console.log('This will disable all trading immediately.');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to confirm...');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const { accessControl } = initializeManagers();
      const tx = await accessControl.toggleTrading(false);
      
      console.log('🛑 TRADING PAUSED');
      console.log(`Transaction: ${tx}`);
      console.log('\nDon\'t forget to:');
      console.log('1. Announce to community immediately');
      console.log('2. Post on all social channels');
      console.log('3. Provide regular updates');
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Parse arguments