import { ONESIGNAL } from '../config/credentials';

const OS_URL = 'https://onesignal.com/api/v1/notifications';

export const NotificationsService = {
  /**
   * Send a message notification to a specific username (external_id).
   */
  sendMessage: async (params: {
    toUsername: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }) => {
    const body = {
      app_id: ONESIGNAL.appId,
      include_aliases: { external_id: [params.toUsername] },
      target_channel: 'push',
      priority: 5,
      android_priority: 'normal',
      headings: { en: params.title },
      contents: { en: params.body.slice(0, 120) },
      data: params.data || {},
      android_channel_id: 'crizon_default',
    };
    try {
      await fetch(OS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${ONESIGNAL.restApiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch {}
  },
};
