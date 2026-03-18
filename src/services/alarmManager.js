// ============================================================
// ALARM MANAGER SERVICE - LIA App
// Sistema completo de alarmes para medicamentos
// Suporta uso contínuo e tempo determinado
// Funciona mesmo com app fechado via Background Task
// ============================================================

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Nome da task de background
const TASK_VERIFICAR_ALARMES = 'TASK_VERIFICAR_ALARMES_LIA';
const CHAVE_ALARMES = '@lia_alarmes_agendados';

// ── Configuração do handler de notificações ─────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// ── Definição da Background Task ────────────────────────────
// Esta task verifica e reagenda alarmes periodicamente
// mesmo com o app fechado
TaskManager.defineTask(TASK_VERIFICAR_ALARMES, async () => {
  try {
    console.log('[AlarmManager] Background task executando...');
    await verificarEReagendarAlarmes();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[AlarmManager] Erro na background task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ── Registrar Background Task ───────────────────────────────
export const registrarBackgroundTask = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_VERIFICAR_ALARMES);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(TASK_VERIFICAR_ALARMES, {
        minimumInterval: 60 * 15, // Verificar a cada 15 minutos
        stopOnTerminate: false,   // Continua mesmo fechando o app
        startOnBoot: true,        // Inicia quando ligar o celular
      });
      console.log('[AlarmManager] Background task registrada');
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

    // Configurar canais Android
    if (Platform.OS === 'android') {
      // Canal principal de alarme — máxima prioridade
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

      // Canal de consultas
      await Notifications.setNotificationChannelAsync('consultas', {
        name: '📅 Consultas Médicas',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        lightColor: '#5B67CA',
        bypassDnd: false,
      });

      // Canal de hidratação
      await Notifications.setNotificationChannelAsync('hidratacao', {
        name: '💧 Hidratação',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        enableVibrate: true,
        lightColor: '#3B82F6',
        bypassDnd: false,
      });
    }

    // Registrar background task
    await registrarBackgroundTask();

    return true;
  } catch (error) {
    console.error('[AlarmManager] Erro nas permissões:', error);
    return false;
  }
};

// ── Agendar alarmes de um medicamento ──────────────────────
/**
 * Agenda todos os alarmes para um medicamento.
 *
 * @param {object} medicamento - Dados do medicamento
 * @param {string} nomeIdoso - Nome do idoso
 * @param {boolean} alarmeAtivo - Se alarme está ativo
 * @returns {string[]} IDs das notificações agendadas
 */
export const agendarAlarmesMedicamento = async (medicamento, nomeIdoso, alarmeAtivo = true) => {
  if (!alarmeAtivo || !medicamento.horarios?.length) return [];

  try {
    // Cancelar alarmes anteriores deste medicamento
    if (medicamento.notifIds?.length) {
      await cancelarAlarmesMedicamento(medicamento.notifIds);
    }

    const todosIds = [];
    const hoje = new Date();

    for (const horario of medicamento.horarios) {
      if (!horario || !horario.includes(':')) continue;

      const [hour, minute] = horario.split(':').map(Number);
      if (isNaN(hour) || isNaN(minute)) continue;

      // Determinar quantos dias agendar
      // Uso contínuo: agenda 90 dias à frente (e background task reagenda)
      // Tempo determinado: agenda exatamente os dias especificados
      const diasParaAgendar = medicamento.usoContinuo
        ? 90
        : Math.min(medicamento.diasTratamento || 1, 365);

      for (let dia = 0; dia < diasParaAgendar; dia++) {
        const dataAlarme = new Date(hoje);
        dataAlarme.setDate(dataAlarme.getDate() + dia);
        dataAlarme.setHours(hour, minute, 0, 0);

        // Não agendar horários que já passaram hoje
        if (dia === 0 && dataAlarme <= new Date()) continue;

        // Título e corpo da notificação
        const titulo = `💊 ${medicamento.nome}`;
        const corpo = [
          `${medicamento.dose}`,
          `👤 ${nomeIdoso}`,
          medicamento.usoContinuo
            ? '🔄 Uso contínuo'
            : `📅 Dia ${dia + 1} de ${medicamento.diasTratamento}`,
        ].join('\n');

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: titulo,
            body: corpo,
            sound: 'default',
            sticky: true,
            autoDismiss: false,
            data: {
              tipo: 'alarme_medicamento',
              medicamentoId: medicamento.id,
              horario,
              dia: dia + 1,
              total: diasParaAgendar,
              nomeIdoso,
            },
            android: {
              channelId: 'alarme_medicamento',
              priority: 'max',
              color: '#5B8C6E',
              ongoing: true,
              autoCancel: false,
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

        // Alarme de reforço (5 minutos depois) para o dia atual
        if (dia === 0) {
          const dataReforco = new Date(dataAlarme.getTime() + 5 * 60 * 1000);
          const idReforco = await Notifications.scheduleNotificationAsync({
            content: {
              title: `⚠️ ${medicamento.nome} — PENDENTE!`,
              body: `${medicamento.dose}\n👤 ${nomeIdoso}\nNão se esqueça!`,
              sound: 'default',
              sticky: true,
              autoDismiss: false,
              data: {
                tipo: 'alarme_reforco',
                medicamentoId: medicamento.id,
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
                    identifier: 'TOMEI',
                    title: '✅ Tomei o remédio',
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

    // Salvar registro dos alarmes agendados
    await salvarRegistroAlarmes(medicamento.id, todosIds, medicamento);

    console.log(`[AlarmManager] ${todosIds.length} alarmes agendados para ${medicamento.nome}`);
    return todosIds;

  } catch (error) {
    console.error('[AlarmManager] Erro ao agendar:', error);
    return [];
  }
};

// ── Salvar registro dos alarmes ─────────────────────────────
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

// ── Verificar e reagendar alarmes (Background Task) ─────────
const verificarEReagendarAlarmes = async () => {
  try {
    const registros = JSON.parse(await AsyncStorage.getItem(CHAVE_ALARMES) || '{}');
    const agendadas = await Notifications.getAllScheduledNotificationsAsync();
    const idsAgendados = new Set(agendadas.map((n) => n.identifier));

    for (const [medId, registro] of Object.entries(registros)) {
      if (!registro.usoContinuo) continue;

      // Verificar se ainda há notificações agendadas
      const aindaAgendadas = registro.notifIds.filter((id) => idsAgendados.has(id));

      // Se restam menos de 30 notificações, reagendar
      if (aindaAgendadas.length < 30) {
        console.log(`[AlarmManager] Reagendando alarmes para ${registro.nome}`);
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
    console.error('[AlarmManager] Erro ao verificar alarmes:', error);
  }
};

// ── Cancelar alarmes de um medicamento ─────────────────────
export const cancelarAlarmesMedicamento = async (notifIds = []) => {
  for (const id of notifIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      // Ignorar erros de IDs já cancelados
    }
  }
};

// ── Cancelar todos os alarmes ───────────────────────────────
export const cancelarTodosAlarmes = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(CHAVE_ALARMES);
    console.log('[AlarmManager] Todos os alarmes cancelados');
  } catch (error) {
    console.error('[AlarmManager] Erro:', error);
  }
};

// ── Notificação de consulta ─────────────────────────────────
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
        android: { channelId: 'consultas', priority: 'high', color: '#5B67CA' },
      },
      trigger: { date: dataAlerta },
    });
    return id;
  } catch (error) {
    console.error('[AlarmManager] Erro consulta:', error);
    return null;
  }
};

// ── Lembretes de hidratação ─────────────────────────────────
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
          data: { tipo: 'hidratacao' },
          android: { channelId: 'hidratacao', priority: 'default', color: '#3B82F6' },
        },
        trigger: { hour, minute: 0, repeats: true },
      });
    }
  } catch (error) {
    console.error('[AlarmManager] Erro hidratação:', error);
  }
};

// ── Teste de notificação ────────────────────────────────────
export const enviarNotificacaoTeste = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ LIA — Alarme funcionando!',
        body: 'O sistema de alarmes está configurado corretamente.',
        sound: 'default',
        android: {
          channelId: 'alarme_medicamento',
          priority: 'max',
          vibrate: [0, 500, 300, 500],
        },
      },
      trigger: { seconds: 3 },
    });
  } catch (error) {
    console.error('[AlarmManager] Erro no teste:', error);
  }
};

// ── Obter resumo dos alarmes ativos ────────────────────────
export const getAlaramesAtivos = async () => {
  try {
    const registros = JSON.parse(await AsyncStorage.getItem(CHAVE_ALARMES) || '{}');
    return Object.values(registros);
  } catch {
    return [];
  }
};
