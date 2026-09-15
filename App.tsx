import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import CreateAccountScreen from './src/screens/CreateAccountScreen';
import CreateAccountSuccessScreen from './src/screens/CreateAccountSuccessScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import NewChatScreen from './src/screens/NewChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ContactProfileScreen from './src/screens/ContactProfileScreen';
import OutgoingCallScreen from './src/screens/OutgoingCallScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import ActiveCallScreen from './src/screens/ActiveCallScreen';
import AIChatScreen from './src/screens/AIChatScreen';
import PermissionsScreen from './src/screens/PermissionsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('crizon_session');
      const permsDone = await AsyncStorage.getItem('crizon_perms_done');
      if (token && !permsDone) setInitialRoute('Permissions');
      else if (token) setInitialRoute('ChatList');
      setLoading(false);
    })().catch(() => setLoading(false));
  }, []);

  if (loading) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator size="large" /></View>;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{headerShown:false, animation:'slide_from_right'}}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
          <Stack.Screen name="CreateAccountSuccess" component={CreateAccountSuccessScreen} />
          <Stack.Screen name="Permissions" component={PermissionsScreen} />
          <Stack.Screen name="ChatList" component={ChatListScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="NewChat" component={NewChatScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="ContactProfile" component={ContactProfileScreen} />
          <Stack.Screen name="OutgoingCall" component={OutgoingCallScreen} options={{animation:'fade'}} />
          <Stack.Screen name="IncomingCall" component={IncomingCallScreen} options={{animation:'fade'}} />
          <Stack.Screen name="ActiveCall" component={ActiveCallScreen} options={{animation:'fade'}} />
          <Stack.Screen name="AIChat" component={AIChatScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
