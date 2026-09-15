import { db, C } from './firebase';
import { ONESIGNAL } from '../config/credentials';

const OS_URL = 'https://onesignal.com/api/v1/notifications';

export const CallsService = {
  /**
   * Generate a deterministic channel id for two users.
   */
  channelFor: (a: string, b: string) => [a, b].sort().join('__call__'),

  /**
   * Send a high-priority VoIP push through OneSignal REST API.
   * The receiving device handles it via Notifee full-screen intent.
   */
  sendCallSignal: async (params: {
    callerName: string;
    callerUsername: string;
    toUsername: string;
    channel: string;
    callerUid: number;
    myUid: number;
  }) => {
    const body = {
      app_id: ONESIGNAL.appId,
      include_aliases: { external_id: [params.toUsername] },
      target_channel: 'push',
      priority: 10,
      android_priority: 'high',
      ttl: 30,
      data: {
        type: 'incoming_call',
        callerName: params.callerName,
        callerUsername: params.callerUsername,
        channel: params.channel,
        callerUid: params.callerUid,
        myUid: params.myUid,
      },
      headings: { en: params.callerName },
      contents: { en: 'Incoming Crizon call' },
      android_channel_id: 'crizon_call',
      android_sound: 'default',
      android_visibility: 1,
    };

    const res = await fetch(OS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${ONESIGNAL.restApiKey}`,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  /**
   * Register call log in Firestore (used for call history screen later).
   */
  logCall: async (params: {
    from: string;
    to: string;
    type: 'outgoing' | 'incoming' | 'missed';
    duration: number;
    at: number;
  }) => {
    await db.collection('call_logs').add(params);
  },
};
