// ============================================================
// APP.JS - LIA App
// Navegação correta: notificação → MedicamentosScreen com foco
// ============================================================

import React, { useEffect, useRef } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { createNavigationContainerRef } from '@react-navigation/native';

import AppNavigator from './src/navigation';
import { requestPermissions } from './src/services/alarmManager';
import { marcarComoTomado } from './src/services/medicamentosTomados';
import { Colors } from './src/theme';

export const navigationRef = createNavigationContainerRef();

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
]);

// ── Navegar para tela correta com parâmetros ────────────────
const navegarParaNotificacao = (data) => {
  if (!data || !navigationRef.isReady()) return;

  try {
    const { tipo, medicamentoId, consultaId, nomeIdoso, nomeMed, horario } = data;

    switch (tipo) {
      case 'alarme_medicamento':
      case 'alarme_reforco':
        // ✅ Navegar para Medicamentos passando o ID para destacar
        navigationRef.navigate('Tabs', {
          screen: 'Medicamentos',
          params: { medicamentoId }, // ← ID do medicamento para foco
        });
        break;

      case 'consulta':
        navigationRef.navigate('Tabs', { screen: 'Consultas' });
        break;

      case 'hidratacao':
        navigationRef.navigate('Tabs', { screen: 'Home' });
        break;

      default:
        navigationRef.navigate('Tabs', { screen: 'Home' });
    }
  } catch (error) {
    console.error('[App] Erro ao navegar:', error);
  }
};

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    requestPermissions();

    // ── Notificação recebida com app aberto ─────────────
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[App] Notificação:', notification.request.content.title);
      }
    );

    // ── Usuário tocou na notificação ────────────────────
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data;
        const action = response.actionIdentifier;

        console.log('[App] Ação:', action, '| Med:', data?.nomeMed);

        // ✅ Ação TOMEI — marcar e dispensar
        if (action === 'TOMEI') {
          if (data?.medicamentoId) {
            await marcarComoTomado(
              data.medicamentoId,
              data.horario || '',
              data.nomeMed || '',
              data.nomeIdoso || ''
            );
          }
          await Notifications.dismissAllNotificationsAsync();
          return;
        }

        // ✅ Ação ADIAR — reagendar em 10 minutos e dispensar
        if (action === 'ADIAR') {
          await Notifications.dismissNotificationAsync(
            response.notification.request.identifier
          );
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ ${data?.nomeMed || 'Medicamento'} — Lembrete`,
              body: `Adiado 10 minutos\n${data?.dose || ''}\n👤 ${data?.nomeIdoso || ''}`,
              sticky: true,
              autoDismiss: false,
              data,
              android: {
                channelId: 'alarme_critico',
                priority: 'max',
                ongoing: true,
                autoCancel: false,
                fullScreenIntent: true,
                actions: [
                  { identifier: 'TOMEI', title: '✅ Tomei' },
                  { identifier: 'ADIAR', title: '⏰ +10 min' },
                ],
              },
            },
            trigger: { seconds: 600 },
          });
          return;
        }

        // ✅ Toque simples — dispensar e navegar para medicamento
        await Notifications.dismissNotificationAsync(
          response.notification.request.identifier
        );
        navegarParaNotificacao(data);
      }
    );

    // ── App aberto via notificação ──────────────────────
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        setTimeout(() => navegarParaNotificacao(data), 800);
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
