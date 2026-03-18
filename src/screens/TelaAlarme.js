// ============================================================
// TELA ALARME - LIA App — VERSÃO PROFISSIONAL
// Design de classe mundial para cuidado de idosos
// Sistema de alarme infalível com múltiplas camadas
// ============================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Vibration, Image, Animated, Dimensions,
  AppState, Platform, BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { MedicamentoStorage, IdosoStorage } from '../storage';
import { marcarComoTomado } from '../services/medicamentosTomados';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Constantes ──────────────────────────────────────────────
const VIBRATION_PATTERN = [0, 800, 400, 800, 400, 800];
const INSISTENCIA_INTERVAL = 60; // segundos entre insistências
const MAX_INSISTENCIAS = 10; // máximo de vezes que insiste

export default function TelaAlarme({ route, navigation }) {
  const {
    medicamentoId,
    horario,
    nomeIdoso: nomeIdosoParam,
  } = route?.params || {};

  // ── Estado ──────────────────────────────────────────────
  const [medicamento, setMedicamento] = useState(null);
  const [idoso, setIdoso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmado, setConfirmado] = useState(false);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [insistencias, setInsistencias] = useState(0);
  const [somCarregado, setSomCarregado] = useState(false);

  // ── Refs ────────────────────────────────────────────────
  const soundRef = useRef(null);
  const vibracaoRef = useRef(null);
  const timerRef = useRef(null);
  const insistenciaRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // ── Animações ────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ═══════════════════════════════════════════════════════
  // INICIALIZAÇÃO
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    carregarDados();
    iniciarAnimacoes();
    iniciarSistemaAlarme();
    iniciarTimer();

    // Bloquear botão voltar — usuário PRECISA interagir
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true // bloqueia completamente
    );

    // Monitorar estado do app
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      pararTudo();
      backHandler.remove();
      appStateSub.remove();
    };
  }, []);

  // ── Quando app volta ao foreground, reiniciar alarme ───
  const handleAppStateChange = useCallback((nextAppState) => {
    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App voltou ao foreground — garantir que alarme está tocando
      if (!confirmado) {
        iniciarVibracaoLoop();
        tocarSom();
      }
    }
    appStateRef.current = nextAppState;
  }, [confirmado]);

  // ═══════════════════════════════════════════════════════
  // CARREGAR DADOS DO MEDICAMENTO
  // ═══════════════════════════════════════════════════════
  const carregarDados = async () => {
    try {
      const lista = await MedicamentoStorage.getAll();
      const med = lista.find((m) => m.id === medicamentoId);
      setMedicamento(med || null);

      if (med?.idosoId) {
        const listaIdosos = await IdosoStorage.getAll();
        const idosoEncontrado = listaIdosos.find((i) => i.id === med.idosoId);
        setIdoso(idosoEncontrado || null);
      }
    } catch (e) {
      console.error('[TelaAlarme] Erro ao carregar:', e);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════
  // SISTEMA DE ALARME — MÚLTIPLAS CAMADAS
  // ═══════════════════════════════════════════════════════
  const iniciarSistemaAlarme = async () => {
    await carregarSom();
    await tocarSom();
    iniciarVibracaoLoop();
    iniciarInsistencia();
  };

  // ── Carregar som LIA ────────────────────────────────────
  const carregarSom = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true, // toca mesmo no modo silencioso (iOS)
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/lia_alert.mp3'),
        {
          shouldPlay: false,
          isLooping: false,
          volume: 1.0,
        }
      );

      soundRef.current = sound;
      setSomCarregado(true);
    } catch (e) {
      console.error('[TelaAlarme] Erro ao carregar som:', e);
    }
  };

  // ── Tocar som ───────────────────────────────────────────
  const tocarSom = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      }
    } catch (e) {
      console.warn('[TelaAlarme] Erro ao tocar som:', e);
    }
  };

  // ── Vibração em loop ────────────────────────────────────
  const iniciarVibracaoLoop = () => {
    Vibration.cancel();
    Vibration.vibrate(VIBRATION_PATTERN, true); // true = repetir
  };

  // ── Sistema de insistência ──────────────────────────────
  // Toca novamente a cada minuto se não confirmado
  const iniciarInsistencia = () => {
    let count = 0;

    insistenciaRef.current = setInterval(async () => {
      if (confirmado) {
        clearInterval(insistenciaRef.current);
        return;
      }

      count++;
      setInsistencias(count);

      // Tocar som novamente
      await tocarSom();

      // Animação de shake para chamar atenção
      animarShake();

      if (count >= MAX_INSISTENCIAS) {
        clearInterval(insistenciaRef.current);
      }
    }, INSISTENCIA_INTERVAL * 1000);
  };

  // ── Timer de tempo decorrido ────────────────────────────
  const iniciarTimer = () => {
    timerRef.current = setInterval(() => {
      setTempoDecorrido((t) => t + 1);
    }, 1000);
  };

  // ── Parar tudo ──────────────────────────────────────────
  const pararTudo = async () => {
    Vibration.cancel();
    clearInterval(timerRef.current);
    clearInterval(insistenciaRef.current);

    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {}
  };

  // ═══════════════════════════════════════════════════════
  // ANIMAÇÕES
  // ═══════════════════════════════════════════════════════
  const iniciarAnimacoes = () => {
    // Fade in da tela
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsar ícone continuamente
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Barra de progresso de insistência
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: INSISTENCIA_INTERVAL * 1000,
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  // ── Animação de shake ────────────────────────────────────
  const animarShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  // ═══════════════════════════════════════════════════════
  // AÇÕES DO USUÁRIO
  // ═══════════════════════════════════════════════════════

  // ✅ TOMEI — confirmar medicamento
  const handleTomei = async () => {
    setConfirmado(true);
    await pararTudo();

    // Marcar como tomado no histórico
    if (medicamentoId) {
      await marcarComoTomado(
        medicamentoId,
        horario || '',
        medicamento?.nome || '',
        nomeIdosoParam || idoso?.nome || ''
      );
    }

    // Dispensar todas as notificações deste medicamento
    try {
      const ativas = await Notifications.getPresentedNotificationsAsync();
      for (const n of ativas) {
        if (n.request.content.data?.medicamentoId === medicamentoId) {
          await Notifications.dismissNotificationAsync(n.request.identifier);
        }
      }
    } catch (e) {}

    // Animação de confirmação antes de fechar
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.3, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      navigation.goBack();
    });
  };

  // ⏰ ADIAR — adiar 10 minutos
  const handleAdiar = async () => {
    await pararTudo();

    // Agendar novo alarme em 10 minutos
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ ${medicamento?.nome || 'Medicamento'} — Lembrete`,
        body: `Adiado 10 minutos\n${medicamento?.dose || ''}\n👤 ${nomeIdosoParam || idoso?.nome || ''}`,
        sound: 'lia_alert.mp3',
        data: {
          tipo: 'alarme_medicamento',
          medicamentoId,
          horario,
          nomeIdoso: nomeIdosoParam || idoso?.nome,
          nomeMed: medicamento?.nome,
        },
        android: {
          channelId: 'alarme_critico',
          priority: 'max',
          ongoing: true,
          autoCancel: false,
          fullScreenIntent: true,
          actions: [
            { identifier: 'TOMEI', title: '✅ Tomei o remédio' },
            { identifier: 'ADIAR', title: '⏰ Adiar 10 min' },
          ],
        },
      },
      trigger: { seconds: 600 },
    });

    navigation.goBack();
  };

  // ═══════════════════════════════════════════════════════
  // FORMATAÇÃO
  // ═══════════════════════════════════════════════════════
  const formatarTempoDecorrido = () => {
    if (tempoDecorrido < 60) return `${tempoDecorrido}s`;
    const min = Math.floor(tempoDecorrido / 60);
    const seg = tempoDecorrido % 60;
    return `${min}min ${seg}s`;
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  if (loading) {
    return (
      <LinearGradient colors={['#1a0000', '#3d0000']} style={styles.loadingContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Ionicons name="medical" size={64} color="#fff" />
        </Animated.View>
      </LinearGradient>
    );
  }

  const nomeExibido = medicamento?.nome || 'Medicamento';
  const doseExibida = medicamento?.dose || '';
  const nomeIdosoExibido = nomeIdosoParam || idoso?.nome || 'Idoso';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { translateX: shakeAnim },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={['#1a0000', '#4a0000', '#7a0000']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safe}>

          {/* ── Header de alerta ── */}
          <View style={styles.alertHeader}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="alarm" size={28} color="#fff" />
            </Animated.View>
            <Text style={styles.alertHeaderText}>HORA DO MEDICAMENTO</Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="alarm" size={28} color="#fff" />
            </Animated.View>
          </View>

          {/* ── Barra de progresso de insistência ── */}
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          {/* ── Conteúdo principal ── */}
          <View style={styles.content}>

            {/* Foto do idoso + ícone medicamento */}
            <View style={styles.avatarContainer}>
              {idoso?.foto ? (
                <Animated.View style={[styles.idosoFotoWrapper, { transform: [{ scale: pulseAnim }] }]}>
                  <Image source={{ uri: idoso.foto }} style={styles.idosoFoto} />
                  <View style={styles.medBadge}>
                    <Ionicons name="medical" size={20} color="#fff" />
                  </View>
                </Animated.View>
              ) : (
                <Animated.View style={[styles.idosoPlaceholder, { transform: [{ scale: pulseAnim }] }]}>
                  <Text style={styles.idosoInitial}>
                    {nomeIdosoExibido.charAt(0).toUpperCase()}
                  </Text>
                  <View style={styles.medBadge}>
                    <Ionicons name="medical" size={20} color="#fff" />
                  </View>
                </Animated.View>
              )}
            </View>

            {/* Nome do idoso */}
            <Text style={styles.idosoNome}>{nomeIdosoExibido}</Text>

            {/* Divisor */}
            <View style={styles.divisor} />

            {/* Nome do medicamento */}
            <Text style={styles.medNome}>{nomeExibido}</Text>

            {/* Dose */}
            <View style={styles.doseBox}>
              <Ionicons name="flask" size={18} color="#ffaa00" />
              <Text style={styles.doseText}>{doseExibida}</Text>
            </View>

            {/* Horário */}
            {horario && (
              <View style={styles.horarioBox}>
                <Ionicons name="time" size={22} color="#fff" />
                <Text style={styles.horarioText}>{horario}</Text>
              </View>
            )}

            {/* Tipo de uso */}
            <View style={styles.tipoBadge}>
              <Text style={styles.tipoBadgeText}>
                {medicamento?.usoContinuo
                  ? '🔄 Uso contínuo'
                  : `📅 Tratamento ${medicamento?.diasTratamento || ''}d`}
              </Text>
            </View>

            {/* Tempo decorrido */}
            <Text style={styles.tempoText}>
              ⏱ Alarme há {formatarTempoDecorrido()}
              {insistencias > 0 ? ` • ${insistencias}ª insistência` : ''}
            </Text>
          </View>

          {/* ── Botões de ação ── */}
          <View style={styles.botoesContainer}>

            {/* ✅ TOMEI — grande, impossível de ignorar */}
            <TouchableOpacity
              style={styles.btnTomei}
              onPress={handleTomei}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#059669', '#047857']}
                style={styles.btnTomeiGradient}
              >
                <Ionicons name="checkmark-circle" size={36} color="#fff" />
                <View>
                  <Text style={styles.btnTomeiText}>✅ TOMEI O REMÉDIO</Text>
                  <Text style={styles.btnTomeiSub}>Toque para confirmar</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Linha divisória */}
            <View style={styles.ouRow}>
              <View style={styles.ouLine} />
              <Text style={styles.ouText}>ou</Text>
              <View style={styles.ouLine} />
            </View>

            {/* ⏰ ADIAR */}
            <TouchableOpacity
              style={styles.btnAdiar}
              onPress={handleAdiar}
              activeOpacity={0.85}
            >
              <Ionicons name="time-outline" size={22} color="#ffaa00" />
              <Text style={styles.btnAdiarText}>⏰ Adiar 10 minutos</Text>
            </TouchableOpacity>

            {/* Aviso */}
            <Text style={styles.avisoText}>
              ⚠️ O alarme voltará automaticamente se não confirmado
            </Text>
          </View>

        </SafeAreaView>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  safe: { flex: 1 },

  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },

  // Header
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  alertHeaderText: {
    ...Typography.titleLarge,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },

  // Barra de progresso
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#ffaa00',
  },

  // Conteúdo
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },

  // Avatar do idoso
  avatarContainer: {
    marginBottom: Spacing.sm,
  },
  idosoFotoWrapper: {
    position: 'relative',
  },
  idosoFoto: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 4, borderColor: '#fff',
  },
  idosoPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#fff',
    position: 'relative',
  },
  idosoInitial: {
    fontSize: 48, color: '#fff', fontWeight: '900',
  },
  medBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },

  idosoNome: {
    ...Typography.titleLarge,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700', textAlign: 'center',
  },

  divisor: {
    width: 60, height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    marginVertical: Spacing.xs,
  },

  medNome: {
    ...Typography.headlineMedium,
    color: '#fff',
    fontWeight: '900',
    textAlign: 'center',
  },

  doseBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,170,0,0.2)',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255,170,0,0.5)',
  },
  doseText: {
    ...Typography.titleMedium,
    color: '#ffaa00', fontWeight: '700',
  },

  horarioBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  horarioText: {
    fontSize: 32, color: '#fff', fontWeight: '900',
    letterSpacing: 2,
  },

  tipoBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  tipoBadgeText: {
    ...Typography.labelMedium,
    color: 'rgba(255,255,255,0.7)',
  },

  tempoText: {
    ...Typography.labelMedium,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },

  // Botões
  botoesContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },

  btnTomei: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  btnTomeiGradient: {
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    minHeight: 72,
  },
  btnTomeiText: {
    ...Typography.titleLarge,
    color: '#fff', fontWeight: '900', letterSpacing: 1,
  },
  btnTomeiSub: {
    ...Typography.labelSmall,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },

  ouRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  ouLine: {
    flex: 1, height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  ouText: {
    ...Typography.labelMedium,
    color: 'rgba(255,255,255,0.4)',
  },

  btnAdiar: {
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: '#ffaa00',
    gap: Spacing.sm,
    minHeight: 52,
  },
  btnAdiarText: {
    ...Typography.titleSmall,
    color: '#ffaa00', fontWeight: '700',
  },

  avisoText: {
    ...Typography.labelSmall,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
