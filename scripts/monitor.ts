import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import DollarTokenClient from "../client/interact";
import { AccessControlManager } from "../client/access-control";
import * as fs from "fs";
import * as path from "path";

interface MonitoringConfig {
  checkInterval: number; // in milliseconds
  alertThresholds: {
    blacklistAdditions: number;
    tradingToggles: number;
    timeWindow: number; // in minutes
  };
}

class TokenMonitor {
  private client: DollarTokenClient;
  private accessControl: AccessControlManager;
  private mint: PublicKey;
  private connection: Connection;
  private config: MonitoringConfig;
  private eventLog: any[] = [];

  constructor(
    client: DollarTokenClient,
    accessControl: AccessControlManager,
    mint: PublicKey,
    config?: Partial<MonitoringConfig>
  ) {
    this.client = client;
    this.accessControl = accessControl;
    this.mint = mint;
    this.connection = client["connection"];
    this.config = {
      checkInterval: config?.checkInterval || 30000, // 30 seconds
      alertThresholds: {
        blacklistAdditions: config?.alertThresholds?.blacklistAdditions || 10,
        tradingToggles: config?.alertThresholds?.tradingToggles || 3,
        timeWindow: config?.alertThresholds?.timeWindow || 60, // 60 minutes
      },
    };
  }

  async start() {
    console.log("🔍 Starting Dollar Token Monitoring Dashboard...\n");
    console.log("Press Ctrl+C to stop monitoring\n");

    // Initial status
    await this.displayDashboard();

    // Set up periodic monitoring
    setInterval(async () => {
      await this.displayDashboard();
      await this.checkForSuspiciousActivity();
    }, this.config.checkInterval);

    // Listen for program events
    this.listenToEvents();
  }

  async displayDashboard() {
    console.clear();
    console.log("═══════════════════════════════════════════════════════════");
    console.log("       💰 DOLLAR TOKEN (TDL) - MONITORING DASHBOARD");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log("───────────────────────────────────────────────────────────\n");

    try {
      // Get token info
      const tokenInfo = await this.client.getTokenInfo(this.mint);
      const accessStatus = await this.accessControl.getAccessControlStatus();

      // Display token information
      console.log("📊 TOKEN INFORMATION:");
      console.log(`   Name: ${tokenInfo.name}`);
      console.log(`   Symbol: ${tokenInfo.symbol}`);
      console.log(`   Total Supply: ${(tokenInfo.totalSupply.toNumber() / 1e9).toLocaleString()} TDL`);
      console.log(`   Authority: ${tokenInfo.authority.toString()}`);
      console.log();

      // Display access control status
      console.log("🔐 ACCESS CONTROL STATUS:");
      console.log(`   Trading: ${this.getStatusIcon(accessStatus.tradingEnabled)} ${accessStatus.tradingEnabled ? 'ENABLED' : 'DISABLED'}`);
      console.log(`   Whitelist Mode: ${this.getStatusIcon(accessStatus.whitelistEnabled)} ${accessStatus.whitelistEnabled ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`   Blacklist System: ${this.getStatusIcon(accessStatus.blacklistEnabled)} ${accessStatus.blacklistEnabled ? 'ACTIVE' : 'INACTIVE'}`);
      console.log();

      // Display recent events
      await this.displayRecentEvents();

      // Display statistics
      await this.displayStatistics();

      // Display alerts
      this.displayAlerts();

    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error.message);
    }

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log(`Next update in ${this.config.checkInterval / 1000} seconds...`);
  }

  private getStatusIcon(enabled: boolean): string {
    return enabled ? '✅' : '❌';
  }

  private async displayRecentEvents() {
    console.log("📜 RECENT EVENTS (Last 10):");
    
    const recentEvents = this.eventLog.slice(-10).reverse();
    
    if (recentEvents.length === 0) {
      console.log("   No events recorded yet");
    } else {
      recentEvents.forEach((event, index) => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        console.log(`   ${time} - ${event.type}: ${event.description}`);
      });
    }
    console.log();
  }

  private async displayStatistics() {
    console.log("📈 STATISTICS:");
    
    try {
      // Load logs
      const blacklistLog = this.loadLog('blacklist.json');
      const whitelistLog = this.loadLog('whitelist.json');

      console.log(`   Total Blacklisted: ${blacklistLog.filter((e: any) => e.action === 'blacklist_add').length}`);
      console.log(`   Total Whitelisted: ${whitelistLog.filter((e: any) => e.action === 'whitelist_add').length}`);
      console.log(`   Total Events Today: ${this.eventLog.filter(e => this.isToday(e.timestamp)).length}`);
    } catch (error) {
      console.log("   Statistics unavailable");
    }
    console.log();
  }

  private displayAlerts() {
    const alerts = this.checkForAlerts();
    
    if (alerts.length > 0) {
      console.log("⚠️  ALERTS:");
      alerts.forEach(alert => {
        console.log(`   ${alert.severity === 'high' ? '🔴' : '🟡'} ${alert.message}`);
      });
      console.log();
    }
  }

  private checkForAlerts(): Array<{ severity: string; message: string }> {
    const alerts: Array<{ severity: string; message: string }> = [];
    const now = Date.now();
    const timeWindow = this.config.alertThresholds.timeWindow * 60 * 1000;

    // Check for excessive blacklist additions
    const recentBlacklists = this.eventLog.filter(
      e => e.type === 'blacklist_add' && (now - e.timestamp) < timeWindow
    );
    if (recentBlacklists.length > this.config.alertThresholds.blacklistAdditions) {
      alerts.push({
        severity: 'high',
        message: `High blacklist activity: ${recentBlacklists.length} additions in last ${this.config.alertThresholds.timeWindow} minutes`,
      });
    }

    // Check for frequent trading toggles
    const recentToggles = this.eventLog.filter(
      e => e.type === 'trading_toggle' && (now - e.timestamp) < timeWindow
    );
    if (recentToggles.length > this.config.alertThresholds.tradingToggles) {
      alerts.push({
        severity: 'high',
        message: `Frequent trading toggles: ${recentToggles.length} in last ${this.config.alertThresholds.timeWindow} minutes`,
      });
    }

    return alerts;
  }

  private async checkForSuspiciousActivity() {
    // This would contain logic to detect suspicious patterns
    // For example: multiple failed transactions, unusual transfer patterns, etc.
    // Implementation depends on your specific needs
  }

  private listenToEvents() {
    const program = this.client["program"];
    
    // Listen for all events
    const listener = program.addEventListener("WalletBlacklisted", (event, slot) => {
      this.logEvent({
        type: "blacklist_add",
        description: `Wallet ${event.wallet.toString().slice(0, 8)}... blacklisted`,
        timestamp: Date.now(),
        data: event,
      });
    });

    const listener2 = program.addEventListener("WalletWhitelisted", (event, slot) => {
      this.logEvent({
        type: "whitelist_add",
        description: `Wallet ${event.wallet.toString().slice(0, 8)}... whitelisted`,
        timestamp: Date.now(),
        data: event,
      });
    });

    const listener3 = program.addEventListener("TradingToggled", (event, slot) => {
      this.logEvent({
        type: "trading_toggle",
        description: `Trading ${event.enabled ? 'enabled' : 'disabled'}`,
        timestamp: Date.now(),
        data: event,
      });
    });

    // Clean up on exit
    process.on("SIGINT", () => {
      program.removeEventListener(listener);
      program.removeEventListener(listener2);
      program.removeEventListener(listener3);
      console.log("\n\n👋 Monitoring stopped. Goodbye!");
      process.exit(0);
    });
  }

  private logEvent(event: any) {
    this.eventLog.push(event);
    
    // Keep only last 1000 events in memory
    if (this.eventLog.length > 1000) {
      this.eventLog = this.eventLog.slice(-1000);
    }

    // Persist to file
    const logPath = path.join(__dirname, "../logs/monitor.json");
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, JSON.stringify(this.eventLog, null, 2));
  }

  private loadLog(filename: string): any[] {
    try {
      const logPath = path.join(__dirname, `../logs/${filename}`);
      if (fs.existsSync(logPath)) {
        return JSON.parse(fs.readFileSync(logPath, "utf8"));
      }
    } catch (error) {
      // Ignore errors
    }
    return [];
  }

  private isToday(timestamp: number): boolean {
    const today = new Date();
    const date = new Date(timestamp);
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  // Export monitoring data
  async exportReport(outputPath?: string): Promise<string> {
    const report = {
      generatedAt: new Date().toISOString(),
      tokenInfo: await this.client.getTokenInfo(this.mint),
      accessControlStatus: await this.accessControl.getAccessControlStatus(),
      events: this.eventLog,
      statistics: {
        totalBlacklisted: this.loadLog('blacklist.json').filter((e: any) => e.action === 'blacklist_add').length,
        totalWhitelisted: this.loadLog('whitelist.json').filter((e: any) => e.action === 'whitelist_add').length,
        totalEvents: this.eventLog.length,
      },
      alerts: this.checkForAlerts(),
    };

    const path = outputPath || `./logs/report-${Date.now()}.json`;
    fs.writeFileSync(path, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report exported to: ${path}`);
    return path;
  }
}

// Main execution
async function main() {
  try {
    // Load addresses
    const addressesPath = path.join(__dirname, "../client/addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

    // Initialize
    const client = new DollarTokenClient();
    const mint = new PublicKey(addresses.mint);
    const accessControl = new AccessControlManager(client, mint);

    // Start monitoring
    const monitor = new TokenMonitor(client, accessControl, mint);
    await monitor.start();

  } catch (error) {
    console.error("❌ Error starting monitor:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { TokenMonitor };