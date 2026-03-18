// ============================================================
// APP.JS - LIA App
// Atualizado com navegação via notificação e limpeza automática
// ============================================================

import React, { useEffect, useRef } from 'react';
import { StatusBar, Platform, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { createNavigationContainerRef } from '@react-navigation/native';

import AppNavigator from './src/navigation';
import { requestPermissions } from './src/services/notifications';
import { Colors } from './src/theme';

// Ref global de navegação para usar fora de componentes
export const navigationRef = createNavigationContainerRef();

// Suprimir avisos não críticos
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
]);

// ── Navegar baseado nos dados da notificação ────────────────
const navegarParaNotificacao = (data) => {
  if (!data || !navigationRef.isReady()) return;

  try {
    const { tipo, medicamentoId, consultaId, idosoId } = data;

    switch (tipo) {
      case 'alarme_medicamento':
      case 'alarme_reforco':
        // Navegar para a tela de medicamentos
        navigationRef.navigate('Tabs', { screen: 'Medicamentos' });
        break;

      case 'consulta':
        // Navegar para a tela de consultas
        navigationRef.navigate('Tabs', { screen: 'Consultas' });
        break;

      case 'hidratacao':
        // Navegar para a home
        navigationRef.navigate('Tabs', { screen: 'Home' });
        break;

      default:
        navigationRef.navigate('Tabs', { screen: 'Home' });
    }
  } catch (error) {
    console.error('[App] Erro ao navegar via notificação:', error);
  }
};

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Solicitar permissões
    requestPermissions();

    // ── Listener: notificação recebida com app ABERTO ───────
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[App] Notificação recebida:', notification.request.content.title);
      }
    );

    // ── Listener: usuário TOCOU na notificação ──────────────
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data;
        const action = response.actionIdentifier;

        console.log('[App] Notificação tocada:', data, 'Ação:', action);

        // ── Ação: "Tomei o remédio" ─────────────────────────
        if (action === 'TOMEI') {
          // Cancelar esta notificação específica
          await Notifications.dismissNotificationAsync(
            response.notification.request.identifier
          );

          // Marcar como tomado se tiver medicamentoId
          if (data?.medicamentoId) {
            try {
              const { marcarComoTomado } = require('./src/services/medicamentosTomados');
              await marcarComoTomado(
                data.medicamentoId,
                data.horario || '',
                data.nomeMed || '',
                data.nomeIdoso || ''
              );
            } catch (e) {
              console.warn('[App] Erro ao marcar tomado:', e);
            }
          }
          return;
        }

        // ── Ação: "Lembrar em 10 min" ───────────────────────
        if (action === 'LEMBRAR_10MIN') {
          await Notifications.dismissNotificationAsync(
            response.notification.request.identifier
          );

          // Agendar novo alarme em 10 minutos
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ Lembrete: ${response.notification.request.content.title}`,
              body: response.notification.request.content.body,
              sound: 'default',
              data: data,
              android: {
                channelId: 'alarme_medicamento',
                priority: 'high',
                // ongoing: false para sumir ao tocar
                ongoing: false,
                autoCancel: true,
              },
            },
            trigger: { seconds: 10 * 60 }, // 10 minutos
          });
          return;
        }

        // ── Toque simples na notificação ────────────────────
        // Dispensar a notificação tocada
        await Notifications.dismissNotificationAsync(
          response.notification.request.identifier
        );

        // Navegar para tela correta
        navegarParaNotificacao(data);
      }
    );

    // ── Verificar se app foi aberto por notificação ─────────
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        navegarParaNotificacao(data);
      }
    });

    return () => {
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
      <AppNavigator navigationRef={navigationRef} />
    </SafeAreaProvider>
  );
}
