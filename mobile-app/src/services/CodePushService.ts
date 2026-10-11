import CodePush from 'react-native-code-push';
import { Platform, Alert, Linking } from 'react-native';
import { AnalyticsService } from './AnalyticsService';

interface CodePushUpdate {
  label: string;
  packageHash: string;
  packageSize: number;
  isMandatory: boolean;
  appVersion: string;
  deploymentKey: string;
  description: string;
  failedInstall: boolean;
  isFirstRun: boolean;
  installMode: number;
  mandatory: boolean;
}

interface CodePushOptions {
  checkFrequency?: CodePush.CheckFrequency;
  installMode?: CodePush.InstallMode;
  minimumBackgroundDuration?: number;
  mandatoryUpdateMode?: CodePush.InstallMode;
}

export class CodePushService {
  private static syncOptions = {
    checkFrequency: CodePush.CheckFrequency.ON_APP_RESUME,
    installMode: CodePush.InstallMode.ON_NEXT_RESTART,
    minimumBackgroundDuration: 60 * 1000,
    mandatoryUpdateMode: CodePush.InstallMode.IMMEDIATE,
  };

  static async sync(options?: Partial<CodePushOptions>) {
    try {
      const syncOptions = { ...this.syncOptions, ...options };
      const update = await CodePush.sync(syncOptions);
      return update;
    } catch (e) {
      console.error('CodePush sync failed:', e);
      return null;
    }
  }

  static async checkForUpdate(): Promise<CodePush.RemotePackage | null> {
    try {
      const update = await CodePush.checkForUpdate();
      return update;
    } catch (e) {
      console.error('CodePush check failed:', e);
      return null;
    }
  }

  static async getUpdateInfo(): Promise<CodePush.RemotePackage | null> {
    try {
      const update = await CodePush.checkForUpdate();
      if (update) {
        return {
          label: update.label,
          packageHash: update.packageHash,
          packageSize: update.packageSize,
          isMandatory: update.isMandatory,
          appVersion: update.appVersion,
          deploymentKey: update.deploymentKey,
          description: update.description,
          failedInstall: update.failedInstall,
          isFirstRun: update.isFirstRun,
          installMode: update.installMode,
          mandatory: update.isMandatory,
        };
      }
      return null;
    } catch (e) {
      console.error('CodePush info check failed:', e);
      return null;
    }
  }

  static async checkForUpdateOnResume(): Promise<void> {
    try {
      const update = await CodePush.checkForUpdate();
      if (update) {
        const shouldUpdate = await this.promptForUpdate();
        if (shouldUpdate) {
          await this.installUpdate();
        }
      }
    } catch (e) {
      console.error('CodePush check on resume failed:', e);
    }
  }

  static async sync(options?: Partial<{
    checkFrequency: CodePush.CheckFrequency;
    installMode: CodePush.InstallMode;
    minimumBackgroundDuration: number;
    mandatoryUpdateMode: CodePush.InstallMode;
  }>): Promise<CodePush.RemotePackage | null> {
    try {
      const update = await CodePush.sync({
        checkFrequency: CodePush.CheckFrequency.ON_APP_RESUME,
        installMode: CodePush.InstallMode.ON_NEXT_RESTART,
        minimumBackgroundDuration: 60 * 1000,
        mandatoryUpdateMode: CodePush.InstallMode.IMMEDIATE,
        ...options,
      });
      return update;
    } catch (e) {
      console.error('CodePush sync failed:', e);
      return null;
    }
  }

  static async installUpdate(): Promise<void> {
    try {
      await CodePush.restartApp();
    } catch (e) {
      console.error('CodePush install failed:', e);
    }
  }

  static async promptForUpdate(update: CodePush.RemotePackage): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Update Available',
        `A new version is available${update.description ? `: ${update.description}` : ''}. Would you like to update now?`,
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: update.isMandatory ? 'Update Now' : 'Update Now',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });
  }

  static async syncOnAppStart(): Promise<void> {
    try {
      // Check for updates on app start
      const update = await CodePush.checkForUpdate();
      if (update) {
        const shouldUpdate = await this.promptForUpdate(update);
        if (shouldUpdate) {
          await this.installUpdate();
        }
      } else {
        console.log('No updates available');
      }
    } catch (e) {
      console.error('CodePush startup sync failed:', e);
    }
  }

  static async getCurrentVersion(): Promise<string> {
    try {
      const update = await CodePush.getUpdateMetadata();
      return update?.label || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  static async getCurrentDeployment(): Promise<string> {
    try {
      const update = await CodePush.getUpdateMetadata();
      return update?.deploymentKey || 'production';
    } catch {
      return 'production';
    }
  }

  static async notifyUpdateAvailable(update: CodePush.RemotePackage): Promise<void> {
    // In production, send push notification
    console.log('Update available:', update.label);
  }

  static async notifyUpdateInstalled(version: string): Promise<void> {
    console.log(`Update ${version} installed successfully`);
    AnalyticsService.trackEvent('codepush_update_installed', { version });
  }

  static async rollback(): Promise<void> {
    try {
      await CodePush.rollback();
    } catch (e) {
      console.error('CodePush rollback failed:', e);
    }
  }

  static async getUpdateHistory(): Promise<CodePush.LocalPackage[]> {
    try {
      return await CodePush.getUpdateHistory();
    } catch {
      return [];
    }
  }

  static async clearUpdateHistory(): Promise<void> {
    try {
      await CodePush.clearUpdateHistory();
    } catch (e) {
      console.error('Failed to clear update history:', e);
    }
  }

  // Background sync
  static setupBackgroundSync(): void {
    // In production, use AppState to sync on foreground
    // AppState.addEventListener('change', (state) => {
    //   if (state === 'active') {
    //     this.syncOnAppStart();
    //   }
    // });
  }

  static async syncOnAppStart(): Promise<void> {
    try {
      await CodePush.sync({
        checkFrequency: CodePush.CheckFrequency.ON_APP_RESUME,
        installMode: CodePush.InstallMode.ON_NEXT_RESTART,
      });
    } catch (e) {
      console.error('CodePush sync on start failed:', e);
    }
  }

  static async getInstallMetrics(): Promise<{
    totalInstalls: number;
    pendingInstalls: number;
    failedInstalls: number;
  }> {
    try {
      const history = await CodePush.getUpdateHistory();
      return {
        totalInstalls: history.filter(u => !u.failedInstall).length,
        pendingInstalls: 0, // Would need to track separately
        failedInstalls: history.filter(u => u.failedInstall).length,
      };
    } catch {
      return { totalInstalls: 0, pendingInstalls: 0, failedInstalls: 0 };
    }
  }
}
