// ============================================================
// ALARM MANAGER OTIMIZADO - LIA App
// Alarmes contínuos de medicamento até interação
// ============================================================

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert, Linking } from 'react-native';

const TASK_VERIFICAR_ALARMES = 'TASK_LIA_VERIFICAR_ALARMES';
const CHAVE_ALARMES = '@lia_v4_alarmes';
const SOM_LIA = 'lia_alert'; // SEM extensão, obrigatório Android

// ── Handler global ──────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const tipo = notification.request.content.data?.tipo;
    const ehAlarme = tipo === 'alarme_medicamento' || tipo === 'alarme_reforco';
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: ehAlarme,
      priority: ehAlarme
        ? Notifications.AndroidNotificationPriority.MAX
        : Notifications.AndroidNotificationPriority.DEFAULT,
    };
  },
});

// ── Background Task ─────────────────────────────────────────
TaskManager.defineTask(TASK_VERIFICAR_ALARMES, async () => {
  try {
    await verificarEReagendarAlarmes();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registrarBackgroundTask = async () => {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_VERIFICAR_ALARMES);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(TASK_VERIFICAR_ALARMES, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
};

// ── Criar canal crítico ─────────────────────────────────────
export const criarCanalAlarme = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarme_critico', {
      name: '🚨 Alarme Crítico — Medicamento',
      description: 'Alarme que exige confirmação do cuidador',
      importance: Notifications.AndroidImportance.MAX,
      sound: SOM_LIA,
      vibrationPattern: [0, 800, 400, 800, 400, 800],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#FF0000',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      showBadge: true,
    });
  }
};

// ── Permissões ─────────────────────────────────────────────
export const requestPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: true, allowCriticalAlerts: true },
  });

  if (status !== 'granted') {
    Alert.alert(
      '🔔 Permissão necessária',
      'O LIA precisa de permissão para enviar alarmes de medicamentos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir configurações', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  return true;
};

// ── Agendar alarmes contínuos ───────────────────────────────
export const agendarAlarmesMedicamento = async (medicamento, nomeIdoso, alarmeAtivo = true) => {
  if (!alarmeAtivo || !medicamento.horarios?.length) return [];

  try {
    if (medicamento.notifIds?.length) await cancelarAlarmesMedicamento(medicamento.notifIds);

    const todosIds = [];
    const hoje = new Date();

    for (const horario of medicamento.horarios) {
      if (!horario?.includes(':')) continue;
      const [hour, minute] = horario.split(':').map(Number);
      if (isNaN(hour) || isNaN(minute)) continue;

      const diasParaAgendar = medicamento.usoContinuo
        ? 90
        : Math.min(medicamento.diasTratamento || 1, 365);

      for (let dia = 0; dia < diasParaAgendar; dia++) {
        const dataAlarme = new Date(hoje);
        dataAlarme.setDate(dataAlarme.getDate() + dia);
        dataAlarme.setHours(hour, minute, 0, 0);
        if (dia === 0 && dataAlarme <= new Date()) continue;

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🚨 ${medicamento.nome}`,
            body: `${medicamento.dose}\n👤 ${nomeIdoso}\nToque para confirmar ou adiar`,
            sticky: true,
            autoDismiss: false,
            data: {
              tipo: 'alarme_medicamento',
              medicamentoId: medicamento.id,
              horario,
              nomeMed: medicamento.nome,
              nomeIdoso,
              dose: medicamento.dose,
            },
            android: {
              channelId: 'alarme_critico',
              priority: 'max',
              ongoing: true,
              autoCancel: false,
              fullScreenIntent: true,
              vibrate: [0, 800, 400, 800],
              actions: [
                { identifier: 'TOMEI', title: '✅ Tomei' },
                { identifier: 'LEMBRAR_10MIN', title: '⏰ +10 min' },
              ],
            },
          },
          trigger: { date: dataAlarme },
        });

        if (id) todosIds.push(id);
      }
    }

    await salvarRegistro(medicamento, todosIds, nomeIdoso);
    console.log(`[AlarmManager] ✅ ${todosIds.length} alarmes para "${medicamento.nome}"`);
    return todosIds;

  } catch (error) {
    console.error('[AlarmManager] Erro ao agendar:', error);
    return [];
  }
};

// ── Salvar registro ────────────────────────────────────────
const salvarRegistro = async (med, notifIds, nomeIdoso) => {
  try {
    const registros = JSON.parse(await AsyncStorage.getItem(CHAVE_ALARMES) || '{}');
    registros[med.id] = { notifIds, medicamentoId: med.id, nome: med.nome, dose: med.dose, horarios: med.horarios, usoContinuo: med.usoContinuo, diasTratamento: med.diasTratamento, nomeIdoso, agendadoEm: new Date().toISOString() };
    await AsyncStorage.setItem(CHAVE_ALARMES, JSON.stringify(registros));
  } catch (e) { console.error('[AlarmManager] Erro ao salvar registro:', e); }
};

// ── Cancelar alarmes ───────────────────────────────────────
export const cancelarAlarmesMedicamento = async (notifIds = []) => {
  for (const id of notifIds) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch (e) {}
  }
};

export const cancelarTodosAlarmes = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
    await AsyncStorage.removeItem(CHAVE_ALARMES);
  } catch (e) { console.error('[AlarmManager] Erro:', e); }
};

// ── Verificação de alarmes contínuos ───────────────────────
const verificarEReagendarAlarmes = async () => {
  try {
    const registros = JSON.parse(await AsyncStorage.getItem(CHAVE_ALARMES) || '{}');
    const agendadas = await Notifications.getAllScheduledNotificationsAsync();
    const idsAtivos = new Set(agendadas.map((n) => n.identifier));

    for (const [medId, reg] of Object.entries(registros)) {
      if (!reg.usoContinuo) continue;
      const ativos = reg.notifIds.filter(id => idsAtivos.has(id));
      if (ativos.length < 30) {
        await agendarAlarmesMedicamento(
          { id: medId, nome: reg.nome, dose: reg.dose, horarios: reg.horarios, usoContinuo: true, notifIds: ativos },
          reg.nomeIdoso || '', true
        );
      }
    }
  } catch (e) { console.error('[AlarmManager] Erro verificação:', e); }
};