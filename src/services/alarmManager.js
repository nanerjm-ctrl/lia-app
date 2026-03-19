// ============================================================
// ALARM MANAGER - LIA App — VERSÃO CORRIGIDA
// Correções aplicadas:
// ✅ SOM_LIA = 'lia_alert' (sem extensão)
// ✅ Sound APENAS no canal, não no content
// ✅ requestPermissions com abertura de configurações
// ✅ Canal recriado limpo
// ============================================================

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking, Alert } from 'react-native';

const TASK_VERIFICAR_ALARMES = 'TASK_LIA_VERIFICAR_ALARMES';
const CHAVE_ALARMES = '@lia_v4_alarmes';

// ✅ SEM extensão — obrigatório para Android funcionar
const SOM_LIA = 'lia_alert';

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
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_VERIFICAR_ALARMES);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(TASK_VERIFICAR_ALARMES, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (error) {
    console.error('[AlarmManager] Erro ao registrar task:', error);
  }
};

// ── Permissões + criação de canais ─────────────────────────
export const requestPermissions = async () => {
  try {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: true,
      },
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

    if (Platform.OS === 'android') {
      // ✅ Canal crítico — som SEM extensão
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

      await Notifications.setNotificationChannelAsync('consultas', {
        name: '📅 Consultas Médicas',
        importance: Notifications.AndroidImportance.HIGH,
        sound: SOM_LIA,
        vibrationPattern: [0, 400, 200, 400],
        enableVibrate: true,
        lightColor: '#5B67CA',
        bypassDnd: false,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('hidratacao', {
        name: '💧 Hidratação',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        enableVibrate: true,
        lightColor: '#3B82F6',
        bypassDnd: false,
        showBadge: false,
      });

      // Orientar usuário a verificar canal
      Alert.alert(
        '✅ Alarmes configurados!',
        'Verifique se o canal "🚨 Alarme Crítico" está com som e prioridade máxima.',
        [
          { text: 'Verificar depois', style: 'cancel' },
          {
            text: '🔧 Verificar agora',
            onPress: () => Notifications.openNotificationSettingsAsync(),
          },
        ]
      );
    }

    await registrarBackgroundTask();
    return true;
  } catch (error) {
    console.error('[AlarmManager] Erro nas permissões:', error);
    return false;
  }
};

// ── Agendar alarmes ─────────────────────────────────────────
export const agendarAlarmesMedicamento = async (medicamento, nomeIdoso, alarmeAtivo = true) => {
  if (!alarmeAtivo || !medicamento.horarios?.length) return [];

  try {
    if (medicamento.notifIds?.length) {
      await cancelarAlarmesMedicamento(medicamento.notifIds);
    }

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

        // ✅ SEM sound no content — quem define é o canal
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🚨 ${medicamento.nome}`,
            body: buildCorpo(medicamento, nomeIdoso, dia + 1),
            // ❌ NÃO colocar sound aqui
            sticky: true,
            autoDismiss: false,
            data: {
              tipo: 'alarme_medicamento',
              medicamentoId: medicamento.id,
              horario,
              dia: dia + 1,
              nomeIdoso,
              nomeMed: medicamento.nome,
              dose: medicamento.dose,
            },
            android: {
              channelId: 'alarme_critico',
              priority: 'max',
              color: '#BA1A1A',
              ongoing: true,
              autoCancel: false,
              fullScreenIntent: true,
              vibrate: [0, 800, 400, 800, 400, 800],
              actions: [
                { identifier: 'TOMEI', title: '✅ Tomei' },
                { identifier: 'ADIAR', title: '⏰ +10 min' },
              ],
            },
          },
          trigger: {
            date: dataAlarme,
            channelId: 'alarme_critico',
          },
        });

        if (id) todosIds.push(id);

        // Reforço 5 min (dia 0)
        if (dia === 0) {
          const dataReforco = new Date(dataAlarme.getTime() + 5 * 60 * 1000);
          if (dataReforco > new Date()) {
            const idR = await Notifications.scheduleNotificationAsync({
              content: {
                title: `⚠️ ${medicamento.nome} — AINDA PENDENTE!`,
                body: `${medicamento.dose}\n👤 ${nomeIdoso}\nVocê ainda não confirmou!`,
                sticky: true,
                autoDismiss: false,
                data: {
                  tipo: 'alarme_reforco',
                  medicamentoId: medicamento.id,
                  horario,
                  nomeIdoso,
                  nomeMed: medicamento.nome,
                  dose: medicamento.dose,
                },
                android: {
                  channelId: 'alarme_critico',
                  priority: 'max',
                  color: '#BA1A1A',
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
              trigger: { date: dataReforco, channelId: 'alarme_critico' },
            });
            if (idR) todosIds.push(idR);
          }

          // Reforço 15 min
          const dataReforco2 = new Date(dataAlarme.getTime() + 15 * 60 * 1000);
          if (dataReforco2 > new Date()) {
            const idR2 = await Notifications.scheduleNotificationAsync({
              content: {
                title: `🚨 ${medicamento.nome} — URGENTE!`,
                body: `${medicamento.dose}\n👤 ${nomeIdoso}\n15 minutos sem confirmação!`,
                sticky: true,
                autoDismiss: false,
                data: {
                  tipo: 'alarme_reforco',
                  medicamentoId: medicamento.id,
                  horario,
                  nomeIdoso,
                  nomeMed: medicamento.nome,
                  dose: medicamento.dose,
                },
                android: {
                  channelId: 'alarme_critico',
                  priority: 'max',
                  color: '#BA1A1A',
                  ongoing: true,
                  autoCancel: false,
                  fullScreenIntent: true,
                  vibrate: [0, 1000, 500, 1000],
                  actions: [
                    { identifier: 'TOMEI', title: '✅ Tomei' },
                    { identifier: 'ADIAR', title: '⏰ +10 min' },
                  ],
                },
              },
              trigger: { date: dataReforco2, channelId: 'alarme_critico' },
            });
            if (idR2) todosIds.push(idR2);
          }
        }
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

const buildCorpo = (med, nomeIdoso, dia) => {
  const linhas = [med.dose, `👤 ${nomeIdoso}`];
  if (!med.usoContinuo && med.diasTratamento) {
    linhas.push(`📅 Dia ${dia} de ${med.diasTratamento}`);
  } else {
    linhas.push('🔄 Uso contínuo');
  }
  linhas.push('\nToque para confirmar ou adiar');
  return linhas.join('\n');
};

const salvarRegistro = async (med, notifIds, nomeIdoso) => {
  try {
    const registros = JSON.parse(await AsyncStorage.getItem(CHAVE_ALARMES) || '{}');
    registros[med.id] = {
      notifIds, medicamentoId: med.id,
      nome: med.nome, dose: med.dose,
      horarios: med.horarios, usoContinuo: med.usoContinuo,
      diasTratamento: med.diasTratamento, nomeIdoso,
      agendadoEm: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CHAVE_ALARMES, JSON.stringify(registros));
  } catch (e) {
    console.error('[AlarmManager] Erro ao salvar registro:', e);
  }
};

const verificarEReagendarAlarmes = async () => {
  try {
    const registros = JSON.parse(await AsyncStorage.getItem(CHAVE_ALARMES) || '{}');
    const agendadas = await Notifications.getAllScheduledNotificationsAsync();
    const idsAtivos = new Set(agendadas.map((n) => n.identifier));

    for (const [medId, reg] of Object.entries(registros)) {
      if (!reg.usoContinuo) continue;
      const ativos = reg.notifIds.filter((id) => idsAtivos.has(id));
      if (ativos.length < 30) {
        await agendarAlarmesMedicamento(
          { id: medId, nome: reg.nome, dose: reg.dose, horarios: reg.horarios, usoContinuo: true, notifIds: ativos },
          reg.nomeIdoso || '', true
        );
      }
    }
  } catch (e) {
    console.error('[AlarmManager] Erro verificação:', e);
  }
};

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

export const agendarNotificacaoConsulta = async (consulta, nomeIdoso) => {
  try {
    const dataConsulta = new Date(consulta.dataHoraISO);
    const data24h = new Date(dataConsulta.getTime() - 24 * 60 * 60 * 1000);
    const data1h = new Date(dataConsulta.getTime() - 60 * 60 * 1000);
    const agora = new Date();
    const ids = [];

    if (data24h > agora) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📅 Consulta Amanhã!',
          body: `${nomeIdoso}\n${consulta.especialidade || 'Consulta'}\n⏰ ${consulta.horario}${consulta.local ? `\n📍 ${consulta.local}` : ''}`,
          autoDismiss: true,
          data: { tipo: 'consulta', consultaId: consulta.id, nomeIdoso },
          android: { channelId: 'consultas', priority: 'high', color: '#5B67CA', ongoing: false, autoCancel: true },
        },
        trigger: { date: data24h },
      });
      ids.push(id);
    }

    if (data1h > agora) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Consulta em 1 hora!',
          body: `${nomeIdoso}\n${consulta.especialidade || 'Consulta'}\n⏰ ${consulta.horario}${consulta.local ? `\n📍 ${consulta.local}` : ''}`,
          autoDismiss: true,
          data: { tipo: 'consulta', consultaId: consulta.id, nomeIdoso },
          android: { channelId: 'consultas', priority: 'high', color: '#5B67CA', ongoing: false, autoCancel: true },
        },
        trigger: { date: data1h },
      });
      ids.push(id);
    }

    return ids;
  } catch (e) {
    console.error('[AlarmManager] Erro consulta:', e);
    return [];
  }
};

export const agendarLembretesHidratacao = async (nomeIdoso, pesoKg) => {
  try {
    const litros = ((pesoKg * 35) / 1000).toFixed(1);
    for (const hour of [7, 9, 11, 13, 15, 17, 19, 21]) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Hora de se hidratar!',
          body: `Ofereça água para ${nomeIdoso}\nMeta: ${litros} litros/dia`,
          autoDismiss: true,
          data: { tipo: 'hidratacao', nomeIdoso },
          android: { channelId: 'hidratacao', priority: 'default', color: '#3B82F6', ongoing: false, autoCancel: true },
        },
        trigger: { hour, minute: 0, repeats: true },
      });
    }
  } catch (e) { console.error('[AlarmManager] Erro hidratação:', e); }
};

export const enviarNotificacaoTeste = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 LIA — Teste de Alarme!',
        body: 'Vibração e som funcionando!\nToque para confirmar.',
        sticky: true,
        autoDismiss: false,
        data: { tipo: 'alarme_medicamento', medicamentoId: 'teste', horario: '00:00', nomeIdoso: 'Teste', nomeMed: 'Teste', dose: '1 comprimido' },
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
  } catch (e) { console.error('[AlarmManager] Erro teste:', e); }
};

export const getAlarmesAtivos = async () => {
  try {
    const r = JSON.parse(await AsyncStorage.getItem(CHAVE_ALARMES) || '{}');
    return Object.values(r);
  } catch { return []; }
};
