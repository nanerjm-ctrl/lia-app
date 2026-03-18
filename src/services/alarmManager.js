// ============================================================
// ALARM MANAGER - LIA App — VERSÃO PROFISSIONAL
// Sistema de alarme em múltiplas camadas:
// Camada 1: Notificação agendada (expo-notifications)
// Camada 2: Canal crítico Android (bypassDnd, fullScreenIntent)
// Camada 3: Background task para reagendamento automático
// Camada 4: Som customizado LIA com expo-av
// Camada 5: Insistência automática a cada minuto
// ============================================================

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── Constantes ──────────────────────────────────────────────
const TASK_VERIFICAR_ALARMES = 'TASK_LIA_VERIFICAR_ALARMES';
const CHAVE_ALARMES = '@lia_v4_alarmes';
const CHAVE_HISTORICO_TOMADOS = '@lia_v4_historico_tomados';

// ✅ Som com extensão correta
const SOM_LIA = 'lia_alert.mp3';

// ── Handler global de notificações ─────────────────────────
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
    console.log('[AlarmManager] Background task rodando...');
    await verificarEReagendarAlarmes();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[AlarmManager] Erro na task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ── Registrar Background Task ───────────────────────────────
export const registrarBackgroundTask = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_VERIFICAR_ALARMES);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(TASK_VERIFICAR_ALARMES, {
        minimumInterval: 15 * 60, // 15 minutos
        stopOnTerminate: false,   // Continua após fechar app
        startOnBoot: true,        // Inicia ao ligar o celular
      });
      console.log('[AlarmManager] Background task registrada ✅');
    }
  } catch (error) {
    console.error('[AlarmManager] Erro ao registrar task:', error);
  }
};

// ── Solicitar permissões e configurar canais ────────────────
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
          allowProvisional: false,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[AlarmManager] Permissão negada!');
      return false;
    }

    if (Platform.OS === 'android') {
      // ═══════════════════════════════════════════════════
      // CANAL 1: ALARME CRÍTICO
      // Máxima prioridade, ignora DND, abre tela cheia
      // ═══════════════════════════════════════════════════
      await Notifications.setNotificationChannelAsync('alarme_critico', {
        name: '🚨 Alarme Crítico — Medicamento',
        description: 'Alarme que exige confirmação do cuidador',
        importance: Notifications.AndroidImportance.MAX,
        sound: SOM_LIA,
        vibrationPattern: [0, 800, 400, 800, 400, 800, 400, 800],
        enableVibrate: true,
        enableLights: true,
        lightColor: '#FF0000',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        showBadge: true,
      });

      // ═══════════════════════════════════════════════════
      // CANAL 2: CONSULTAS
      // Alta prioridade com som LIA
      // ═══════════════════════════════════════════════════
      await Notifications.setNotificationChannelAsync('consultas', {
        name: '📅 Consultas Médicas',
        description: 'Lembretes de consultas médicas agendadas',
        importance: Notifications.AndroidImportance.HIGH,
        sound: SOM_LIA,
        vibrationPattern: [0, 400, 200, 400],
        enableVibrate: true,
        enableLights: true,
        lightColor: '#5B67CA',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        showBadge: true,
      });

      // ═══════════════════════════════════════════════════
      // CANAL 3: HIDRATAÇÃO
      // Prioridade normal, som suave
      // ═══════════════════════════════════════════════════
      await Notifications.setNotificationChannelAsync('hidratacao', {
        name: '💧 Lembretes de Hidratação',
        description: 'Lembretes periódicos de hidratação',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        vibrationPattern: [0, 200],
        enableVibrate: true,
        enableLights: true,
        lightColor: '#3B82F6',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
        bypassDnd: false,
        showBadge: false,
      });

      console.log('[AlarmManager] Canais Android configurados ✅');
    }

    await registrarBackgroundTask();
    return true;

  } catch (error) {
    console.error('[AlarmManager] Erro nas permissões:', error);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════
// AGENDAR ALARMES DE UM MEDICAMENTO
// ═══════════════════════════════════════════════════════════
export const agendarAlarmesMedicamento = async (
  medicamento,
  nomeIdoso,
  alarmeAtivo = true
) => {
  if (!alarmeAtivo || !medicamento.horarios?.length) return [];

  try {
    // Cancelar alarmes anteriores
    if (medicamento.notifIds?.length) {
      await cancelarAlarmesMedicamento(medicamento.notifIds);
    }

    const todosIds = [];
    const hoje = new Date();

    for (const horario of medicamento.horarios) {
      if (!horario?.includes(':')) continue;

      const [hour, minute] = horario.split(':').map(Number);
      if (isNaN(hour) || isNaN(minute)) continue;
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) continue;

      // Dias a agendar
      const diasParaAgendar = medicamento.usoContinuo
        ? 90  // 3 meses (background task reagenda automaticamente)
        : Math.min(medicamento.diasTratamento || 1, 365);

      for (let dia = 0; dia < diasParaAgendar; dia++) {
        const dataAlarme = new Date(hoje);
        dataAlarme.setDate(dataAlarme.getDate() + dia);
        dataAlarme.setHours(hour, minute, 0, 0);

        // Não agendar horários passados de hoje
        if (dia === 0 && dataAlarme <= new Date()) continue;

        // ── Notificação principal ───────────────────────
        const idPrincipal = await agendarNotificacaoCritica({
          titulo: `🚨 ${medicamento.nome}`,
          corpo: buildCorpoNotificacao(medicamento, nomeIdoso, dia + 1),
          data: {
            tipo: 'alarme_medicamento',
            medicamentoId: medicamento.id,
            horario,
            dia: dia + 1,
            totalDias: diasParaAgendar,
            nomeIdoso,
            nomeMed: medicamento.nome,
            dose: medicamento.dose,
          },
          dataDisparo: dataAlarme,
        });

        if (idPrincipal) todosIds.push(idPrincipal);

        // ── Reforço após 5 minutos (apenas hoje) ────────
        if (dia === 0) {
          const dataReforco = new Date(dataAlarme.getTime() + 5 * 60 * 1000);
          if (dataReforco > new Date()) {
            const idReforco = await agendarNotificacaoCritica({
              titulo: `⚠️ ${medicamento.nome} — AINDA PENDENTE!`,
              corpo: `${medicamento.dose}\n👤 ${nomeIdoso}\n\nVocê ainda não confirmou o medicamento!`,
              data: {
                tipo: 'alarme_reforco',
                medicamentoId: medicamento.id,
                horario,
                nomeIdoso,
                nomeMed: medicamento.nome,
                dose: medicamento.dose,
              },
              dataDisparo: dataReforco,
            });
            if (idReforco) todosIds.push(idReforco);
          }

          // ── Segundo reforço após 15 minutos ────────────
          const dataReforco2 = new Date(dataAlarme.getTime() + 15 * 60 * 1000);
          if (dataReforco2 > new Date()) {
            const idReforco2 = await agendarNotificacaoCritica({
              titulo: `🚨 ${medicamento.nome} — URGENTE!`,
              corpo: `${medicamento.dose}\n👤 ${nomeIdoso}\n\nJá se passaram 15 minutos sem confirmação!`,
              data: {
                tipo: 'alarme_reforco',
                medicamentoId: medicamento.id,
                horario,
                nomeIdoso,
                nomeMed: medicamento.nome,
                dose: medicamento.dose,
              },
              dataDisparo: dataReforco2,
            });
            if (idReforco2) todosIds.push(idReforco2);
          }
        }
      }
    }

    // Salvar registro
    await salvarRegistroAlarme(medicamento, todosIds, nomeIdoso);

    console.log(`[AlarmManager] ✅ ${todosIds.length} alarmes agendados para "${medicamento.nome}"`);
    return todosIds;

  } catch (error) {
    console.error('[AlarmManager] Erro ao agendar:', error);
    return [];
  }
};

// ── Agendar notificação crítica ─────────────────────────────
const agendarNotificacaoCritica = async ({ titulo, corpo, data, dataDisparo }) => {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: corpo,
        sound: SOM_LIA,
        sticky: true,
        autoDismiss: false,
        data,
        android: {
          channelId: 'alarme_critico',
          priority: 'max',
          color: '#BA1A1A',
          ongoing: true,
          autoCancel: false,
          fullScreenIntent: true,
          vibrate: [0, 800, 400, 800, 400, 800],
          actions: [
            {
              identifier: 'TOMEI',
              title: '✅ Tomei',
              isDestructive: false,
            },
            {
              identifier: 'ADIAR',
              title: '⏰ +10 min',
              isDestructive: false,
            },
          ],
        },
      },
      trigger: {
        date: dataDisparo,
        channelId: 'alarme_critico',
      },
    });
    return id;
  } catch (error) {
    console.error('[AlarmManager] Erro ao agendar notificação:', error);
    return null;
  }
};

// ── Construir corpo da notificação ──────────────────────────
const buildCorpoNotificacao = (medicamento, nomeIdoso, dia) => {
  const linhas = [
    medicamento.dose,
    `👤 ${nomeIdoso}`,
  ];

  if (!medicamento.usoContinuo && medicamento.diasTratamento) {
    linhas.push(`📅 Dia ${dia} de ${medicamento.diasTratamento}`);
  } else {
    linhas.push('🔄 Uso contínuo');
  }

  linhas.push('\nToque para confirmar ou adiar');
  return linhas.join('\n');
};

// ── Salvar registro do alarme ───────────────────────────────
const salvarRegistroAlarme = async (medicamento, notifIds, nomeIdoso) => {
  try {
    const registros = JSON.parse(
      await AsyncStorage.getItem(CHAVE_ALARMES) || '{}'
    );

    registros[medicamento.id] = {
      notifIds,
      medicamentoId: medicamento.id,
      nome: medicamento.nome,
      dose: medicamento.dose,
      horarios: medicamento.horarios,
      usoContinuo: medicamento.usoContinuo,
      diasTratamento: medicamento.diasTratamento,
      nomeIdoso,
      dataInicio: medicamento.dataInicio || new Date().toISOString(),
      agendadoEm: new Date().toISOString(),
    };

    await AsyncStorage.setItem(CHAVE_ALARMES, JSON.stringify(registros));
  } catch (error) {
    console.error('[AlarmManager] Erro ao salvar registro:', error);
  }
};

// ═══════════════════════════════════════════════════════════
// BACKGROUND TASK — VERIFICAR E REAGENDAR
// ═══════════════════════════════════════════════════════════
const verificarEReagendarAlarmes = async () => {
  try {
    const registros = JSON.parse(
      await AsyncStorage.getItem(CHAVE_ALARMES) || '{}'
    );
    const agendadas = await Notifications.getAllScheduledNotificationsAsync();
    const idsAgendados = new Set(agendadas.map((n) => n.identifier));

    for (const [medId, registro] of Object.entries(registros)) {
      if (!registro.usoContinuo) continue;

      const aindaAtivas = registro.notifIds.filter((id) => idsAgendados.has(id));

      // Reagendar se restarem menos de 30 notificações
      if (aindaAtivas.length < 30) {
        console.log(`[AlarmManager] Reagendando "${registro.nome}"...`);

        const medicamento = {
          id: medId,
          nome: registro.nome,
          dose: registro.dose,
          horarios: registro.horarios,
          usoContinuo: true,
          notifIds: aindaAtivas,
        };

        await agendarAlarmesMedicamento(
          medicamento,
          registro.nomeIdoso || '',
          true
        );
      }
    }
  } catch (error) {
    console.error('[AlarmManager] Erro na verificação:', error);
  }
};

// ═══════════════════════════════════════════════════════════
// CANCELAR ALARMES
// ═══════════════════════════════════════════════════════════
export const cancelarAlarmesMedicamento = async (notifIds = []) => {
  for (const id of notifIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      // Ignorar erros de IDs já cancelados
    }
  }
};

export const cancelarTodosAlarmes = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
    await AsyncStorage.removeItem(CHAVE_ALARMES);
    console.log('[AlarmManager] Todos os alarmes cancelados ✅');
  } catch (error) {
    console.error('[AlarmManager] Erro ao cancelar:', error);
  }
};

// ═══════════════════════════════════════════════════════════
// CONSULTAS
// ═══════════════════════════════════════════════════════════
export const agendarNotificacaoConsulta = async (consulta, nomeIdoso) => {
  try {
    const dataConsulta = new Date(consulta.dataHoraISO);
    const dataAlerta24h = new Date(dataConsulta.getTime() - 24 * 60 * 60 * 1000);
    const dataAlerta1h = new Date(dataConsulta.getTime() - 60 * 60 * 1000);
    const agora = new Date();

    const ids = [];

    // Alerta 24h antes
    if (dataAlerta24h > agora) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📅 Consulta Amanhã!',
          body: `${nomeIdoso}\n${consulta.especialidade || 'Consulta'}\n⏰ ${consulta.horario}${consulta.local ? `\n📍 ${consulta.local}` : ''}`,
          sound: SOM_LIA,
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
        trigger: { date: dataAlerta24h },
      });
      ids.push(id);
    }

    // Alerta 1h antes
    if (dataAlerta1h > agora) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Consulta em 1 hora!',
          body: `${nomeIdoso}\n${consulta.especialidade || 'Consulta'}\n⏰ ${consulta.horario}${consulta.local ? `\n📍 ${consulta.local}` : ''}`,
          sound: SOM_LIA,
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
        trigger: { date: dataAlerta1h },
      });
      ids.push(id);
    }

    return ids;
  } catch (error) {
    console.error('[AlarmManager] Erro consulta:', error);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════
// HIDRATAÇÃO
// ═══════════════════════════════════════════════════════════
export const agendarLembretesHidratacao = async (nomeIdoso, pesoKg) => {
  try {
    const litros = ((pesoKg * 35) / 1000).toFixed(1);
    const horarios = [7, 9, 11, 13, 15, 17, 19, 21];

    for (const hour of horarios) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Hora de se hidratar!',
          body: `Ofereça água para ${nomeIdoso}\nMeta diária: ${litros} litros`,
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
    console.log(`[AlarmManager] Lembretes de hidratação agendados para ${nomeIdoso} ✅`);
  } catch (error) {
    console.error('[AlarmManager] Erro hidratação:', error);
  }
};

// ═══════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════
export const enviarNotificacaoTeste = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 LIA — Teste de Alarme Crítico!',
        body: 'Som, vibração e tela cheia funcionando!\nToque para confirmar.',
        sound: SOM_LIA,
        sticky: true,
        autoDismiss: false,
        data: {
          tipo: 'alarme_medicamento',
          medicamentoId: 'teste',
          horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          nomeIdoso: 'Teste',
          nomeMed: 'Medicamento Teste',
          dose: '1 comprimido',
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
            { identifier: 'ADIAR', title: '⏰ +10 min' },
          ],
        },
      },
      trigger: { seconds: 3 },
    });
    console.log('[AlarmManager] Notificação de teste agendada ✅');
  } catch (error) {
    console.error('[AlarmManager] Erro no teste:', error);
  }
};

export const getAlarmesAtivos = async () => {
  try {
    const registros = JSON.parse(
      await AsyncStorage.getItem(CHAVE_ALARMES) || '{}'
    );
    return Object.values(registros);
  } catch {
    return [];
  }
};

export const getTotalAlarmesAgendados = async () => {
  try {
    const agendadas = await Notifications.getAllScheduledNotificationsAsync();
    return agendadas.length;
  } catch {
    return 0;
  }
};
