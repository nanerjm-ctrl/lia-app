// ============================================================
// NOTIFICATIONS SERVICE - LIA App
// Sistema de alarmes persistentes para medicamentos
// Alarme continua tocando até ser dispensado pelo usuário
// Com opção de ativar/desativar por medicamento
// ============================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Configuração global do handler ─────────────────────────
// Define como as notificações se comportam quando o app está aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// ── Solicitar permissões ────────────────────────────────────
export const requestPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true, // Alarmes críticos que ignoram modo silencioso
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return false;

    // ── Canais Android ──────────────────────────────────────
    if (Platform.OS === 'android') {

      // Canal de ALARME — máxima prioridade, ignora modo silencioso
      await Notifications.setNotificationChannelAsync('alarme_medicamento', {
        name: '💊 Alarme de Medicamento',
        description: 'Alarme persistente para horário de medicamentos',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 500, 300, 500, 300, 500], // Vibração contínua
        enableVibrate: true,
        enableLights: true,
        lightColor: '#5B8C6E',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true, // Ignora modo "Não perturbe"
        showBadge: true,
      });

      // Canal de consultas — alta prioridade
      await Notifications.setNotificationChannelAsync('consultas', {
        name: '📅 Consultas Médicas',
        description: 'Lembretes de consultas médicas',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        lightColor: '#5B67CA',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        showBadge: true,
      });

      // Canal de hidratação — prioridade normal
      await Notifications.setNotificationChannelAsync('hidratacao', {
        name: '💧 Hidratação',
        description: 'Lembretes de hidratação para os idosos',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        vibrationPattern: [0, 200],
        enableVibrate: true,
        lightColor: '#3B82F6',
        bypassDnd: false,
        showBadge: false,
      });
    }

    return true;
  } catch (error) {
    console.error('[Notifications] Erro ao solicitar permissões:', error);
    return false;
  }
};

// ── Agendar alarme persistente de medicamento ───────────────
/**
 * Agenda alarme diário persistente para um medicamento.
 * O alarme toca repetidamente em intervalos de 2 minutos
 * até ser dispensado pelo usuário.
 *
 * @param {object} medicamento - Dados do medicamento
 * @param {string} nomeIdoso - Nome do idoso
 * @param {string} horario - Horário no formato HH:MM
 * @param {boolean} alarmeAtivo - Se o alarme está ativo
 * @returns {string[]} IDs das notificações agendadas
 */
export const agendarAlarmeMedicamento = async (
  medicamento,
  nomeIdoso,
  horario,
  alarmeAtivo = true
) => {
  // Se alarme desativado, não agendar
  if (!alarmeAtivo) {
    console.log(`[Alarme] Alarme desativado para ${medicamento.nome} às ${horario}`);
    return [];
  }

  try {
    if (!horario || !horario.includes(':')) return [];

    const [hour, minute] = horario.split(':').map(Number);
    if (isNaN(hour) || isNaN(minute)) return [];

    const notifIds = [];

    // Notificação principal — toca no horário exato
    const id1 = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 HORA DO MEDICAMENTO!',
        body: `${medicamento.nome} — ${medicamento.dose}\n👤 ${nomeIdoso}`,
        sound: 'default',
        sticky: true, // Notificação não some ao tocar (Android)
        autoDismiss: false, // Não dispensa automaticamente
        data: {
          tipo: 'alarme_medicamento',
          medicamentoId: medicamento.id,
          horario,
          nomeIdoso,
        },
        android: {
          channelId: 'alarme_medicamento',
          priority: 'max',
          color: '#5B8C6E',
          ongoing: true, // Notificação persistente — fica na barra até dispensar
          autoCancel: false, // Não cancela ao tocar
          vibrate: [0, 500, 300, 500, 300, 500, 300, 500],
          actions: [
            {
              identifier: 'TOMAR',
              title: '✅ Tomei o remédio',
              isDestructive: false,
            },
            {
              identifier: 'LEMBRAR_DEPOIS',
              title: '⏰ Lembrar em 10 min',
              isDestructive: false,
            },
          ],
        },
      },
      trigger: {
        hour,
        minute,
        repeats: true, // Repetir todos os dias
        channelId: 'alarme_medicamento',
      },
    });

    notifIds.push(id1);

    // Notificação de reforço — toca 2 minutos depois se não foi dispensada
    const id2 = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ MEDICAMENTO PENDENTE!',
        body: `${medicamento.nome} ainda não foi tomado!\n👤 ${nomeIdoso}`,
        sound: 'default',
        sticky: true,
        autoDismiss: false,
        data: {
          tipo: 'alarme_medicamento_reforco',
          medicamentoId: medicamento.id,
          horario,
          nomeIdoso,
        },
        android: {
          channelId: 'alarme_medicamento',
          priority: 'max',
          color: '#BA1A1A',
          ongoing: true,
          autoCancel: false,
          vibrate: [0, 1000, 500, 1000],
          actions: [
            {
              identifier: 'TOMAR',
              title: '✅ Tomei o remédio',
              isDestructive: false,
            },
          ],
        },
      },
      trigger: {
        hour,
        minute: minute + 5 > 59 ? 0 : minute + 5, // 5 minutos depois
        repeats: true,
        channelId: 'alarme_medicamento',
      },
    });

    notifIds.push(id2);

    console.log(`[Alarme] Alarme agendado para ${horario} — ${medicamento.nome}`);
    return notifIds;

  } catch (error) {
    console.error('[Alarme] Erro ao agendar:', error);
    return [];
  }
};

// ── Agendar todos os alarmes de um medicamento ─────────────
/**
 * Agenda alarmes para todos os horários de um medicamento.
 * Cancela alarmes anteriores do mesmo medicamento antes.
 *
 * @param {object} medicamento - Dados do medicamento com horarios[]
 * @param {string} nomeIdoso - Nome do idoso
 * @param {boolean} alarmeAtivo - Se os alarmes estão ativos
 * @returns {string[]} IDs de todas as notificações agendadas
 */
export const agendarTodosAlarmes = async (
  medicamento,
  nomeIdoso,
  alarmeAtivo = true
) => {
  // Cancelar alarmes anteriores deste medicamento
  if (medicamento.notifIds?.length) {
    await cancelarAlarmesMedicamento(medicamento.notifIds);
  }

  if (!alarmeAtivo || !medicamento.horarios?.length) return [];

  const todosIds = [];

  for (const horario of medicamento.horarios) {
    const ids = await agendarAlarmeMedicamento(
      medicamento,
      nomeIdoso,
      horario,
      alarmeAtivo
    );
    todosIds.push(...ids);
  }

  return todosIds;
};

// ── Cancelar alarmes de um medicamento ─────────────────────
export const cancelarAlarmesMedicamento = async (notifIds = []) => {
  for (const id of notifIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      console.warn('[Alarme] Erro ao cancelar:', id, e);
    }
  }
};

// ── Cancelar TODOS os alarmes ───────────────────────────────
export const cancelarTodosAlarmes = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Alarme] Todos os alarmes cancelados');
  } catch (error) {
    console.error('[Alarme] Erro:', error);
  }
};

// ── Notificação de consulta 24h antes ──────────────────────
export const agendarNotificacaoConsulta = async (consulta, nomeIdoso) => {
  try {
    const dataConsulta = new Date(consulta.dataHoraISO);
    const dataAlerta = new Date(dataConsulta.getTime() - 24 * 60 * 60 * 1000);

    if (dataAlerta <= new Date()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Consulta Amanhã!',
        body: `${nomeIdoso} — ${consulta.especialidade || 'Consulta'}\n⏰ ${consulta.horario}${consulta.local ? `\n📍 ${consulta.local}` : ''}`,
        sound: 'default',
        data: { tipo: 'consulta', consultaId: consulta.id },
        android: {
          channelId: 'consultas',
          priority: 'high',
          color: '#5B67CA',
        },
      },
      trigger: { date: dataAlerta },
    });

    return id;
  } catch (error) {
    console.error('[Consulta] Erro ao agendar:', error);
    return null;
  }
};

// ── Lembrete de hidratação ──────────────────────────────────
export const agendarLembretesHidratacao = async (nomeIdoso, pesoKg) => {
  try {
    const litros = ((pesoKg * 35) / 1000).toFixed(1);

    // Horários de lembrete: 7h às 21h a cada 2 horas
    const horarios = [7, 9, 11, 13, 15, 17, 19, 21];

    for (const hour of horarios) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Hora de se hidratar!',
          body: `Ofereça água para ${nomeIdoso}\nMeta do dia: ${litros} litros`,
          sound: 'default',
          data: { tipo: 'hidratacao', nomeIdoso },
          android: {
            channelId: 'hidratacao',
            priority: 'default',
            color: '#3B82F6',
          },
        },
        trigger: {
          hour,
          minute: 0,
          repeats: true,
          channelId: 'hidratacao',
        },
      });
    }

    console.log(`[Hidratação] Lembretes agendados para ${nomeIdoso}`);
  } catch (error) {
    console.error('[Hidratação] Erro:', error);
  }
};

// ── Enviar notificação de teste ─────────────────────────────
export const enviarNotificacaoTeste = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ LIA — Teste de Alarme',
        body: 'Os alarmes de medicamento estão funcionando!',
        sound: 'default',
        android: {
          channelId: 'alarme_medicamento',
          priority: 'max',
          vibrate: [0, 500, 300, 500],
        },
      },
      trigger: { seconds: 2 },
    });
  } catch (error) {
    console.error('[Teste] Erro:', error);
  }
};
