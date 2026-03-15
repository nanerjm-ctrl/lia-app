// ============================================================
// NOTIFICATION SERVICE - LIA App
// Notificações locais via expo-notifications
// Ativas apenas no APK (não no Expo Go em alguns dispositivos)
// ============================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configura handler global de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Verifica se o ambiente suporta notificações.
 * No Expo Go pode haver limitações; no APK funciona completo.
 */
const isNotificationsSupported = () => {
  // Notificações locais funcionam no APK e em dev builds
  // No Expo Go podem ter limitações dependendo do dispositivo
  return Platform.OS === 'android' || Platform.OS === 'ios';
};

/**
 * Solicita permissão para enviar notificações.
 * @returns {boolean} true se permissão concedida
 */
export const requestPermissions = async () => {
  if (!isNotificationsSupported()) return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permissão negada');
      return false;
    }

    // Canal Android (obrigatório para Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('consultas', {
        name: 'Consultas Médicas',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#5B67CA',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('medicamentos', {
        name: 'Medicamentos',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#5B8C6E',
        sound: 'default',
      });
    }

    return true;
  } catch (error) {
    console.error('[Notifications] Erro ao solicitar permissão:', error);
    return false;
  }
};

/**
 * Agenda notificação 24h antes de uma consulta.
 * @param {object} consulta - Objeto da consulta
 * @param {string} nomeIdoso - Nome do idoso
 * @returns {string|null} ID da notificação agendada
 */
export const agendarNotificacaoConsulta = async (consulta, nomeIdoso) => {
  try {
    const dataConsulta = new Date(consulta.dataHoraISO);
    const dataNotificacao = new Date(dataConsulta.getTime() - 24 * 60 * 60 * 1000);

    // Não agendar se já passou
    if (dataNotificacao <= new Date()) {
      console.log('[Notifications] Data da notificação já passou, ignorando');
      return null;
    }

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Consulta Amanhã!',
        body: `${nomeIdoso} tem consulta amanhã às ${consulta.horario || formatarHora(dataConsulta)}`,
        data: { consultaId: consulta.id, tipo: 'consulta' },
        sound: 'default',
        android: {
          channelId: 'consultas',
          color: '#5B67CA',
          icon: 'notification_icon',
        },
      },
      trigger: {
        date: dataNotificacao,
      },
    });

    console.log(`[Notifications] Notificação agendada: ${notifId} para ${dataNotificacao}`);
    return notifId;
  } catch (error) {
    console.error('[Notifications] Erro ao agendar notificação:', error);
    return null;
  }
};

/**
 * Cancela notificação pelo ID
 * @param {string} notifId
 */
export const cancelarNotificacao = async (notifId) => {
  if (!notifId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notifId);
    console.log(`[Notifications] Notificação cancelada: ${notifId}`);
  } catch (error) {
    console.error('[Notifications] Erro ao cancelar:', error);
  }
};

/**
 * Cancela todas as notificações agendadas
 */
export const cancelarTodasNotificacoes = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Erro ao cancelar todas:', error);
  }
};

/**
 * Envia notificação imediata (para testes)
 */
export const enviarNotificacaoTeste = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 LIA - Teste',
        body: 'Notificações estão funcionando corretamente!',
        sound: 'default',
      },
      trigger: { seconds: 2 },
    });
  } catch (error) {
    console.error('[Notifications] Erro no teste:', error);
  }
};

/** Formata hora de um objeto Date */
const formatarHora = (date) => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};
