// ============================================================
// ALARM MANAGER SERVICE - LIA App
// Corrigido: notificações somem ao tocar
// Navegação correta ao tocar na notificação
// ============================================================

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TASK_VERIFICAR_ALARMES = 'TASK_VERIFICAR_ALARMES_LIA';
const CHAVE_ALARMES = '@lia_alarmes_agendados';

// ── Handler global ──────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
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

// ── Registrar Background Task ───────────────────────────────
export const registrarBackgroundTask = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_VERIFICAR_ALARMES);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(TASK_VERIFICAR_ALARMES, {
        minimumInterval: 60 * 15,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (error) {
    console.error('[AlarmManager] Erro ao registrar task:', error);
  }
};

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
          allowCriticalAlerts: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
      // Canal principal — alta prioridade, vibra, MAS some ao tocar
      await Notifications.setNotificationChannelAsync('alarme_medicamento', {
        name: '💊 Alarme de Medicamento',
        description: 'Alarme para horário de medicamentos',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
        enableVibrate: true,
        enableLights: true,
        lightColor: '#5B8C6E',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('consultas', {
        name: '📅 Consultas Médicas',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        lightColor: '#5B67CA',
        bypassDnd: false,
      });

      await Notifications.setNotificationChannelAsync('hidratacao', {
        name: '💧 Hidratação',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        enableVibrate: true,
        lightColor: '#3B82F6',
        bypassDnd: false,
      });
    }

    await registrarBackgroundTask();
    return true;
  } catch (error) {
    console.error('[AlarmManager] Erro nas permissões:', error);
    return false;
  }
};

// ── Agendar alarmes de um medicamento ──────────────────────
export const agendarAlarmesMedicamento = async (medicamento, nomeIdoso, alarmeAtivo = true) => {
  if (!alarmeAtivo || !medicamento.horarios?.length) return [];

  try {
    if (medicamento.notifIds?.length) {
      await cancelarAlarmesMedicamento(medicamento.notifIds);
    }

    const todosIds = [];
    const hoje = new Date();

    for (const horario of medicamento.horarios) {
      if (!horario || !horario.includes(':')) continue;

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

        const titulo = `💊 ${medicamento.nome}`;
        const corpo = `${medicamento.dose}\n👤 ${nomeIdoso}\n${
          medicamento.usoContinuo
            ? '🔄 Uso contínuo'
            : `📅 Dia ${dia + 1} de ${medicamento.diasTratamento}`
        }`;

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: titulo,
            body: corpo,
            sound: 'default',
            // ✅ CORRIGIDO: ongoing: false para sumir ao tocar
            sticky: false,
            autoDismiss: true,
            data: {
              tipo: 'alarme_medicamento',
              medicamentoId: medicamento.id,
              horario,
              dia: dia + 1,
              total: diasParaAgendar,
              nomeIdoso,
              nomeMed: medicamento.nome,
            },
            android: {
              channelId: 'alarme_medicamento',
              priority: 'max',
              color: '#5B8C6E',
              // ✅ CORRIGIDO: ongoing false e autoCancel true
              ongoing: false,
              autoCancel: true,
              vibrate: [0, 1000, 500, 1000, 500, 1000],
              actions: [
                {
                  identifier: 'TOMEI',
                  title: '✅ Tomei o remédio',
                  isDestructive: false,
                },
                {
                  identifier: 'LEMBRAR_10MIN',
                  title: '⏰ Lembrar em 10 min',
                  isDestructive: false,
                },
              ],
            },
          },
          trigger: {
            date: dataAlarme,
            channelId: 'alarme_medicamento',
          },
        });

        todosIds.push(id);

        // Alarme de reforço (5 minutos depois) apenas para o dia atual
        if (dia === 0) {
          const dataReforco = new Date(dataAlarme.getTime() + 5 * 60 * 1000);
          if (dataReforco > new Date()) {
            const idReforco = await Notifications.scheduleNotificationAsync({
              content: {
                title: `⚠️ ${medicamento.nome} — PENDENTE!`,
                body: `${medicamento.dose}\n👤 ${nomeIdoso}\nNão se esqueça!`,
                sound: 'default',
                // ✅ CORRIGIDO: some ao tocar
                sticky: false,
                autoDismiss: true,
                data: {
                  tipo: 'alarme_reforco',
                  medicamentoId: medicamento.id,
                  horario,
                  nomeIdoso,
                  nomeMed: medicamento.nome,
                },
                android: {
                  channelId: 'alarme_medicamento',
                  priority: 'max',
                  color: '#BA1A1A',
                  ongoing: false,
                  autoCancel: true,
                  vibrate: [0, 1000, 500, 1000],
                  actions: [
                    {
                      identifier: 'TOMEI',
                      title: '✅ Tomei o remédio',
                    },
                    {
                      identifier: 'LEMBRAR_10MIN',
                      title: '⏰ Lembrar em 10 min',
                    },
                  ],
                },
              },
              trigger: {
                date: dataReforco,
                channelId: 'alarme_medicamento',
              },
            });
            todosIds.push(idReforco);
          }
        }
      }
    }

    await salvarRegistroAlarmes(medicamento.id, todosIds, medicamento);
    console.log(`[AlarmManager] ${todosIds.length} alarmes agendados para ${medicamento.nome}`);
    return todosIds;

  } catch (error) {
    console.error('[AlarmManager] Erro ao agendar:', error);
    return [];
  }
};

// ── Salvar registro ─────────────────────────────────────────
const salvarRegistroAlarmes = async (medicamentoId, notifIds, medicamento) => {
  try {
    const registros = JSON.parse(await AsyncStorage.getItem(CHAVE_ALARMES) || '{}');
    registros[medicamentoId] = {
      notifIds,
      medicamentoId,
      nome: medicamento.nome,
      dose: medicamento.dose,
      horarios: medicamento.horarios,
      usoContinuo: medicamento.usoContinuo,
      diasTratamento: medicamento.diasTratamento,
      dataInicio: medicamento.dataInicio || new Date().toISOString(),
      agendadoEm: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CHAVE_ALARMES, JSON.stringify(registros));
  } catch (error) {
    console.error('[AlarmManager] Erro ao salvar registro:', error);
  }
};

// ── Verificar e reagendar ───────────────────────────────────
const verificarEReagendarAlarmes = async () => {
  try {
    const registros = JSON.parse(await AsyncStorage.getItem(CHAVE_ALARMES) || '{}');
    const agendadas = await Notifications.getAllScheduledNotificationsAsync();
    const idsAgendados = new Set(agendadas.map((n) => n.identifier));

    for (const [medId, registro] of Object.entries(registros)) {
      if (!registro.usoContinuo) continue;
      const aindaAgendadas = registro.notifIds.filter((id) => idsAgendados.has(id));
      if (aindaAgendadas.length < 30) {
        const medicamento = {
          id: medId,
          nome: registro.nome,
          dose: registro.dose,
          horarios: registro.horarios,
          usoContinuo: true,
          notifIds: registro.notifIds,
        };
        await agendarAlarmesMedicamento(medicamento, '', true);
      }
    }
  } catch (error) {
    console.error('[AlarmManager] Erro ao verificar:', error);
  }
};

// ── Cancelar alarmes ────────────────────────────────────────
export const cancelarAlarmesMedicamento = async (notifIds = []) => {
  for (const id of notifIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {}
  }
};

export const cancelarTodosAlarmes = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync(); // ✅ Limpa notificações da barra
    await AsyncStorage.removeItem(CHAVE_ALARMES);
  } catch (error) {
    console.error('[AlarmManager] Erro:', error);
  }
};

// ── Consulta ────────────────────────────────────────────────
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
        autoDismiss: true,
        data: { tipo: 'consulta', consultaId: consulta.id, nomeIdoso },
        android: {
          channelId: 'consultas',
          priority: 'high',
          color: '#5B67CA',
          ongoing: false,
          autoCancel: true,
        },
      },
      trigger: { date: dataAlerta },
    });
    return id;
  } catch (error) {
    console.error('[AlarmManager] Erro consulta:', error);
    return null;
  }
};

// ── Hidratação ──────────────────────────────────────────────
export const agendarLembretesHidratacao = async (nomeIdoso, pesoKg) => {
  try {
    const litros = ((pesoKg * 35) / 1000).toFixed(1);
    const horarios = [7, 9, 11, 13, 15, 17, 19, 21];

    for (const hour of horarios) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Hora de se hidratar!',
          body: `Ofereça água para ${nomeIdoso}\nMeta: ${litros} litros/dia`,
          sound: 'default',
          autoDismiss: true,
          data: { tipo: 'hidratacao', nomeIdoso },
          android: {
            channelId: 'hidratacao',
            priority: 'default',
            color: '#3B82F6',
            ongoing: false,
            autoCancel: true,
          },
        },
        trigger: { hour, minute: 0, repeats: true },
      });
    }
  } catch (error) {
    console.error('[AlarmManager] Erro hidratação:', error);
  }
};

// ── Teste ───────────────────────────────────────────────────
export const enviarNotificacaoTeste = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ LIA — Alarme funcionando!',
        body: 'Toque aqui para ir para os medicamentos.',
        sound: 'default',
        autoDismiss: true,
        data: { tipo: 'alarme_medicamento' },
        android: {
          channelId: 'alarme_medicamento',
          priority: 'max',
          ongoing: false,
          autoCancel: true,
          vibrate: [0, 500, 300, 500],
        },
      },
      trigger: { seconds: 3 },
    });
  } catch (error) {
    console.error('[AlarmManager] Erro no teste:', error);
  }
};

// ── Obter alarmes ativos ────────────────────────────────────
export const getAlarmesAtivos = async () => {
  try {
    const registros = JSON.parse(await AsyncStorage.getItem(CHAVE_ALARMES) || '{}');
    return Object.values(registros);
  } catch {
    return [];
  }
};
