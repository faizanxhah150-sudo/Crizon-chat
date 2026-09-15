import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
} from 'react-native-agora';
import { AGORA } from '../config/credentials';

let engine: IRtcEngine | null = null;

export const AgoraService = {
  init: async (): Promise<IRtcEngine> => {
    if (engine) return engine;
    engine = createAgoraRtcEngine();
    await engine.initialize({ appId: AGORA.appId });
    engine.registerEventHandler({
      onJoinChannelSuccess: () => {},
      onUserJoined: () => {},
      onUserOffline: () => {},
    });
    await engine.enableAudio();
    await engine.disableVideo();
    await engine.setDefaultAudioRouteToSpeakerphone(false);
    return engine;
  },

  join: async (channel: string, uid: number) => {
    const e = await AgoraService.init();
    await e.joinChannel('', channel, uid, {
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: true,
      autoSubscribeAudio: true,
    });
  },

  leave: async () => {
    if (!engine) return;
    await engine.leaveChannel();
  },

  mute: async (mute: boolean) => {
    if (!engine) return;
    await engine.muteLocalAudioStream(mute);
  },

  speaker: async (on: boolean) => {
    if (!engine) return;
    await engine.setEnableSpeakerphone(on);
  },

  destroy: async () => {
    if (!engine) return;
    await engine.leaveChannel();
    engine.release();
    engine = null;
  },
};
