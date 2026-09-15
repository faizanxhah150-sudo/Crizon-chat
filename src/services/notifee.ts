import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';
import { Platform } from 'react-native';

export const NotifeeService = {
  init: async () => {
    if (Platform.OS !== 'android') return;
    await notifee.requestPermission();

    // default channel
    await notifee.createChannel({
      id: 'crizon_default',
      name: 'Crizon',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
    });

    // call channel — maximum priority
    await notifee.createChannel({
      id: 'crizon_call',
      name: 'Crizon Calls',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
      vibrationPattern: [300, 500],
    });
  },

  /**
   * Show full-screen incoming call UI (WhatsApp style).
   */
  showIncomingCall: async (params: {
    callerName: string;
    callerUsername: string;
    channel: string;
    callerUid: number;
    myUid: number;
  }) => {
    await notifee.displayNotification({
      id: 'crizon_incoming_call',
      title: params.callerName,
      body: 'Incoming Crizon call…',
      data: {
        type: 'incoming_call',
        channel: params.channel,
        callerUsername: params.callerUsername,
        callerUid: String(params.callerUid),
        myUid: String(params.myUid),
      },
      android: {
        channelId: 'crizon_call',
        importance: AndroidImportance.HIGH,
        category: AndroidCategory.CALL,
        visibility: AndroidVisibility.PUBLIC,
        fullScreenAction: {
          id: 'default',
        },
        ongoing: true,
        autoCancel: false,
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        actions: [
          {
            title: 'Decline',
            pressAction: { id: 'decline' },
          },
          {
            title: 'Answer',
            pressAction: { id: 'answer', launchActivity: 'default' },
          },
        ],
      },
    });
  },

  dismissCall: async () => {
    await notifee.cancelNotification('crizon_incoming_call');
  },

  /**
   * Foreground service notification shown while a big media download is running.
   */
  showDownloadProgress: async (fileName: string, progress: number) => {
    await notifee.displayNotification({
      id: 'crizon_download',
      title: 'Downloading…',
      body: `${fileName}  ${progress}%`,
      android: {
        channelId: 'crizon_default',
        ongoing: true,
        progress: { max: 100, current: progress },
      },
    });
  },

  hideDownload: async () => {
    await notifee.cancelNotification('crizon_download');
  },
};
