import { Platform, PermissionsAndroid, PermissionsIOS } from 'react-native';
import PushNotification, { Importance } from 'react-native-push-notification';
import { PushNotificationIOS } from '@react-native-community/push-notification-ios';
import { AnalyticsService } from './AnalyticsService';

export class PushNotificationService {
  static initialized = false;

  static async configure() {
    if (this.initialized) return;

    try {
      // Configure push notification
      PushNotification.configure({
        onRegister: (token) => {
          console.log('Push token:', token);
          this.registerDeviceToken(token);
        },
        onNotification: (notification) => {
          this.handleNotification(notification);
        },
        onAction: (notification) => {
          this.handleAction(notification);
        },
        onRegistrationError: (err) => {
          console.error('Push notification registration error:', err);
        },
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
        popInitialNotification: true,
        requestPermissions: Platform.OS === 'ios',
      });

      // Configure channels for Android
      if (Platform.OS === 'android') {
        PushNotification.createChannel(
          {
            channelId: 'default',
            channelName: 'Default',
            channelDescription: 'Default notifications',
            importance: Importance.HIGH,
            vibration: true,
            soundName: 'default',
          },
          (created) => console.log('Default channel created:', created)
        );

        PushNotification.createChannel(
          {
            channelId: 'orders',
            channelName: 'Orders',
            channelDescription: 'Order updates',
            importance: Importance.HIGH,
            vibration: true,
            soundName: 'default',
          },
          (created) => console.log('Orders channel created:', created)
        );

        PushNotification.createChannel(
          {
            channelId: 'promotions',
            channelName: 'Promotions',
            channelDescription: 'Promotional offers',
            importance: Importance.DEFAULT,
            vibration: true,
            soundName: 'default',
          },
          (created) => console.log('Promotions channel created:', created)
        );

        PushNotification.createChannel(
          {
            channelId: 'chat',
            channelName: 'Messages',
            channelDescription: 'Chat messages',
            importance: Importance.HIGH,
            vibration: true,
            soundName: 'default',
          },
          (created) => console.log('Chat channel created:', created)
        );
      }

      // iOS specific
      if (Platform.OS === 'ios') {
        PushNotificationIOS.addEventListener('register', (token) => {
          this.registerDeviceToken(token);
        });

        PushNotificationIOS.addEventListener('notification', this.handleNotification);
        PushNotificationIOS.addEventListener('register', this.registerDeviceToken);
      }

      this.initialized = true;
      console.log('[PushNotificationService] Initialized');
    } catch (e) {
      console.error('Push notification configuration failed:', e);
    }
  }

  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const authStatus = await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
      });
      return authStatus.alert === true;
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  }

  static async registerDeviceToken(token: string) {
    try {
      // Send token to backend
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/device-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          deviceId: await getDeviceId(),
        }),
      });

      if (response.ok) {
        console.log('Device token registered');
      }
    } catch (e) {
      console.error('Failed to register device token:', e);
    }
  }

  static handleNotification(notification) {
    console.log('Notification received:', notification);

    // Handle different notification types
    if (notification.data) {
      switch (notification.data.type) {
        case 'order':
          this.handleOrderNotification(notification);
          break;
        case 'promotion':
          this.handlePromotionNotification(notification);
          break;
        case 'shipping':
          this.handleShippingNotification(notification);
          break;
        case 'review':
          this.handleReviewNotification(notification);
          break;
        default:
          this.handleGenericNotification(notification);
      }
    }

    // Track analytics
    AnalyticsService.trackEvent('notification_received', {
      type: notification.data?.type,
      foreground: notification.foreground,
    });
  }

  static handleAction(notification) {
    const action = notification.actionIdentifier;
    const data = notification.data;

    switch (action) {
      case 'view_order':
        this.navigateToOrder(notification.data.orderId);
        break;
      case 'view_product':
        this.navigateToProduct(notification.data.productId);
        break;
      case 'view_promotion':
        this.navigateToPromotion(notification.data.promotionId);
        break;
      case 'view_chat':
        this.navigateToChat(notification.data.conversationId);
        break;
      case 'track_shipment':
        this.navigateToTracking(notification.data.trackingNumber);
        break;
      default:
        this.openApp();
    }
  }

  static handleOrderNotification(notification) {
    const { orderId, status } = notification.data;
    // Navigate to order detail
    this.navigateToOrder(notification.data.orderId);
  }

  static handlePromotionNotification(notification) {
    // Navigate to promotion or product
    if (notification.data.productId) {
      this.navigateToProduct(notification.data.productId);
    } else {
      this.navigateToPromotions();
    }
  }

  static handleShippingNotification(notification) {
    const { trackingNumber, carrier } = notification.data;
    this.navigateToTracking(notification.data.trackingNumber, notification.data.carrier);
  }

  static handleReviewNotification(notification) {
    this.navigateToReview(notification.data.productId);
  }

  static handleGenericNotification(notification) {
    // Open app
    this.openApp();
  }

  static navigateToOrder(orderId) {
    // Navigate to order detail screen
    // NavigationService.navigate('OrderDetail', { orderId });
  }

  static navigateToProduct(productId) {
    // Navigate to product detail
    // NavigationService.navigate('ProductDetail', { productId });
  }

  static navigateToPromotions() {
    // Navigate to promotions screen
    // NavigationService.navigate('Promotions');
  }

  static navigateToTracking(trackingNumber, carrier) {
    // Navigate to tracking screen
    // NavigationService.navigate('OrderTracking', { trackingNumber, carrier });
  }

  static navigateToChat(conversationId) {
    // Navigate to chat
    // NavigationService.navigate('Chat', { conversationId });
  }

  static openApp() {
    // Just open app to home
  }

  static async registerForRemoteNotifications(): Promise<string | null> {
    try {
      const token = await PushNotification.getDeviceToken();
      if (token) {
        await this.registerDeviceToken(token);
        return token;
      }
      return null;
    } catch (e) {
      console.error('Failed to get device token:', e);
      return null;
    }
  }

  static async getBadgeCount(): Promise<number> {
    if (Platform.OS === 'ios') {
      return PushNotificationIOS.getApplicationIconBadgeNumber();
    }
    return 0;
  }

  static async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(count);
    } else {
      PushNotification.setApplicationIconBadgeNumber(count);
    }
  }

  static async scheduleLocalNotification(notification: {
    title: string;
    message: string;
    date: Date;
    data?: Record<string, any>;
    channelId?: string;
  }) {
    try {
      PushNotification.localNotificationSchedule({
        title: notification.title,
        message: notification.message,
        date: notification.date,
        data: notification.data,
        channelId: notification.channelId || 'default',
        allowWhileIdle: true,
        repeatType: 'day', // or 'week', 'month', 'year'
      });
    } catch (e) {
      console.error('Failed to schedule notification:', e);
    }
  }

  static async cancelLocalNotification(id: string) {
    PushNotification.cancelLocalNotification({ id });
  }

  static async cancelAllLocalNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  static async setApplicationIconBadgeNumber(count: number) {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(count);
    } else {
      PushNotification.setApplicationIconBadgeNumber(count);
    }
  }

  static async getBadgeCount(): Promise<number> {
    if (Platform.OS === 'ios') {
      return PushNotificationIOS.getApplicationIconBadgeNumber();
    }
    return 0;
  }

  // Channel management
  static async createChannel(channel: {
    channelId: string;
    channelName: string;
    channelDescription: string;
    importance: number;
    vibration?: boolean;
    soundName?: string;
  }) {
    if (Platform.OS === 'android') {
      PushNotification.createChannel(channel, (created) => console.log('Channel created:', created));
    }
  }

  static async deleteChannel(channelId: string) {
    if (Platform.OS === 'android') {
      PushNotification.deleteChannel(channelId);
    }
  }

  // Local notification scheduling
  static scheduleOrderReminder(orderId: string, deliveryDate: Date) {
    const notificationDate = new Date(deliveryDate.getTime() - 2 * 60 * 60 * 1000); // 2 hours before
    
    this.scheduleLocalNotification({
      title: 'Your order is arriving soon!',
      message: `Your order will be delivered today. Track your package.`,
      date: notificationDate,
      data: { type: 'shipping', orderId },
      channelId: 'orders',
    });
  }

  static schedulePriceDropAlert(productId: string, targetPrice: number) {
    // Schedule daily price check
    // In production, this would be handled by backend
    console.log(`Price drop alert scheduled for product ${productId} at ${targetPrice} RSD`);
  }

  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const result = await PushNotificationIOS.requestPermissions();
      return result.alert === true && (result.badge === true || result.sound === true);
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notifications',
          message: 'DALLI needs notification permission to send you order updates and promotions',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  }

  // Utility functions
  static getAuthToken() {
    // Get from auth store
    return null;
  }

  static async getDeviceId() {
    // Get device ID from secure storage
    return 'device-id-placeholder';
  }
}
