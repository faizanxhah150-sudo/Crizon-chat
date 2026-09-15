import NetInfo from '@react-native-community/netinfo';

export const isOnline = async (): Promise<boolean> => {
  const s = await NetInfo.fetch();
  return !!(s.isConnected && s.isInternetReachable !== false);
};

export const subscribeNetwork = (cb: (online: boolean) => void) => {
  return NetInfo.addEventListener((s) => {
    cb(!!(s.isConnected && s.isInternetReachable !== false));
  });
};
