// ============================================================
// APP.JS - LIA App
// Ponto de entrada principal do aplicativo
// Configura SafeAreaProvider, StatusBar e Navigator
// ============================================================

import React, { useEffect, useRef } from 'react';
import { StatusBar, Platform, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

import AppNavigator from './src/navigation';
import { requestPermissions } from './src/services/notifications';
import { Colors } from './src/theme';

// Suprimir avisos não críticos em desenvolvimento
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
]);

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Solicitar permissão de notificações ao iniciar
    requestPermissions();

    // Listener para notificações recebidas com app aberto
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[App] Notificação recebida:', notification);
      }
    );

    // Listener para quando o usuário toca na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[App] Resposta de notificação:', response);
        // Aqui você pode navegar para a tela de consultas quando o usuário toca
        // na notificação. A navegação via ref pode ser adicionada futuramente.
      }
    );

    return () => {
      // Limpar listeners ao desmontar
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        backgroundColor={Colors.surface}
        barStyle="dark-content"
        translucent={false}
      />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
