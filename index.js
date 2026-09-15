import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import OneSignal from 'react-native-onesignal';
import App from './App';
import { name as appName } from './app.json';
import { ONESIGNAL } from './src/config/credentials';

OneSignal.initialize(ONESIGNAL.appId);

// Foreground + background notification handlers
OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
  // Let OneSignal display it natively
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS) {
    const id = detail.pressAction?.id;
    if (id === 'decline') {
      await notifee.cancelNotification('crizon_incoming_call');
    }
  }
});

AppRegistry.registerComponent(appName, () => App);
