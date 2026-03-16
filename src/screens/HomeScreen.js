// ============================================================
// HOME SCREEN ATUALIZADA - LIA App
// Dashboard com botão "✅ Tomei" nos medicamentos do dia
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Image, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme';
import { Card, SectionHeader, Badge, HorarioPill } from '../components';
import {
  CuidadorStorage, IdosoStorage, ConsultaStorage, MedicamentoStorage
} from '../storage';
import {
  marcarComoTomado, desmarcarTomado, jaFoiTomado, getTomadosHoje
} from '../services/medicamentosTomados';
import { formatarDataHora, calcularIMC, calcularIdade } from '../services/helpers';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [cuidador, setCuidador] = useState(null);
  const [idosos, setIdosos] = useState([]);
  const [proximasConsultas, setProximasConsultas] = useState([]);
  const [medicamentosHoje, setMedicamentosHoje] = useState([]);
  const [alertasAmanha, setAlertasAmanha] = useState([]);
  const [tomadosHoje, setTomadosHoje] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = async () => {
    setRefreshing(true);
    try {
      const [cuidadores, listaIdosos, consultas, meds, amanha, tomados] =
        await Promise.all([
          CuidadorStorage.getAll(),
          IdosoStorage.getAll(),
          ConsultaStorage.getProximas(),
          MedicamentoStorage.getHoje(),
          ConsultaStorage.getAmanha(),
          getTomadosHoje(),
        ]);

      setCuidador(cuidadores[0] || null);
      setIdosos(listaIdosos);
      setProximasConsultas(consultas.slice(0, 5));
      setMedicamentosHoje(meds);
      setAlertasAmanha(amanha);
      setTomadosHoje(tomados);
    } catch (e) {
      console.error('[Home] Erro:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const getNomeIdoso = (idosoId) =>
    idosos.find((i) => i.id === idosoId)?.nome || 'Desconhecido';

  // Verificar se medicamento+horario já foi tomado
  const isTomado = (medicamentoId, horario) => {
    const hoje = new Date().toISOString().split('T')[0];
    const chave = `${medicamentoId}_${hoje}_${horario}`;
    return tomadosHoje.some((t) => t.chave === chave);
  };

  // Marcar/desmarcar medicamento
  const handleTomado = async (med, horario) => {
    const tomado = isTomado(med.id, horario);
    const nomeIdoso = getNomeIdoso(med.idosoId);

    if (tomado) {
      // Desmarcar
      Alert.alert(
        'Desfazer?',
        `Desmarcar "${med.nome}" (${horario}) como tomado?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desmarcar',
            onPress: async () => {
              await desmarcarTomado(med.id, horario);
              carregarDados();
            },
          },
        ]
      );
    } else {
      // Marcar como tomado
      await marcarComoTomado(med.id, horario, med.nome, nomeIdoso);
      carregarDados();
    }
  };

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  // Contar medicamentos pendentes hoje
  const totalMedsPendentes = medicamentosHoje.reduce((acc, med) => {
    const pendentes = (med.horarios || []).filter(
      (h) => !isTomado(med.id, h)
    ).length;
    return acc + pendentes;
  }, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={carregarDados}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.saudacao}>{saudacao}! 👋</Text>
            <Text style={styles.headerTitle}>
              {cuidador ? cuidador.nome.split(' ')[0] : 'Bem-vindo ao LIA'}
            </Text>
            <Text style={styles.headerSub}>
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Cuidador')}
            style={styles.headerAvatar}
          >
            {cuidador?.foto ? (
              <Image source={{ uri: cuidador.foto }} style={styles.headerAvatarImg} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person" size={26} color={Colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Alerta consultas amanhã ── */}
        {alertasAmanha.length > 0 && (
          <Card style={[styles.alertCard, { backgroundColor: Colors.tertiaryContainer }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="notifications" size={22} color={Colors.tertiary} style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: Colors.onTertiaryContainer }]}>
                  ⚠️ Consulta amanhã!
                </Text>
                {alertasAmanha.map((c) => (
                  <Text key={c.id} style={[styles.alertItem, { color: Colors.onTertiaryContainer }]}>
                    • {getNomeIdoso(c.idosoId)} — {c.especialidade || 'Consulta'} às {c.horario}
                    {c.local ? ` — ${c.local}` : ''}
                  </Text>
                ))}
              </View>
            </View>
          </Card>
        )}

        {/* ── Cards dos idosos ── */}
        <SectionHeader
          title="Meus Idosos"
          action={() => navigation.navigate('Idosos')}
          actionLabel="Gerenciar"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: Spacing.md }}
        >
          {idosos.map((idoso) => {
            const imc = calcularIMC(idoso.peso, idoso.altura);
            const idade = calcularIdade(idoso.dataNasc);
            return (
              <TouchableOpacity
                key={idoso.id}
                style={styles.idosoCard}
                onPress={() => navigation.navigate('IdosoDetail', { idosoId: idoso.id })}
                activeOpacity={0.85}
              >
                {idoso.foto ? (
                  <Image source={{ uri: idoso.foto }} style={styles.idosoFoto} />
                ) : (
                  <View style={styles.idosoFotoPlaceholder}>
                    <Text style={styles.idosoInitial}>
                      {idoso.nome.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.idosoNome} numberOfLines={2}>{idoso.nome}</Text>
                {idade && <Text style={styles.idosoIdade}>{idade} anos</Text>}
                {imc && (
                  <View style={[styles.imcBadge, { backgroundColor: imc.cor + '22' }]}>
                    <Text style={[styles.imcBadgeText, { color: imc.cor }]}>
                      IMC {imc.valor}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Botão adicionar idoso */}
          <TouchableOpacity
            style={styles.addIdosoCard}
            onPress={() => navigation.navigate('IdosoForm')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={36} color={Colors.primary} />
            <Text style={styles.addIdosoText}>Novo{'\n'}Idoso</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── Medicamentos de hoje ── */}
        <View style={styles.medsSectionHeader}>
          <SectionHeader
            title="💊 Remédios de Hoje"
            action={() => navigation.navigate('Medicamentos')}
          />
          {/* Badge de pendentes */}
          {totalMedsPendentes > 0 && (
            <View style={styles.pendenteBadge}>
              <Text style={styles.pendenteBadgeText}>
                {totalMedsPendentes} pendente{totalMedsPendentes > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {medicamentosHoje.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>Nenhum medicamento cadastrado</Text>
          </Card>
        ) : (
          medicamentosHoje.map((med) => (
            <Card key={med.id} style={styles.medCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.medIconBox}>
                  <Ionicons name="medical" size={22} color={Colors.secondary} />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={styles.medNome}>{med.nome}</Text>
                  <Text style={styles.medDose}>{med.dose}</Text>
                  <Text style={styles.medIdoso}>{getNomeIdoso(med.idosoId)}</Text>
                </View>
              </View>

              {/* Horários com botão Tomei */}
              {med.horarios?.length > 0 && (
                <View style={styles.horariosContainer}>
                  {med.horarios.map((h, i) => {
                    const tomado = isTomado(med.id, h);
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.horarioBotao,
                          tomado && styles.horarioBotaoTomado,
                        ]}
                        onPress={() => handleTomado(med, h)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={tomado ? 'checkmark-circle' : 'time-outline'}
                          size={14}
                          color={tomado ? Colors.success : Colors.secondary}
                        />
                        <Text
                          style={[
                            styles.horarioBotaoText,
                            tomado && styles.horarioBotaoTextTomado,
                          ]}
                        >
                          {h} {tomado ? '✓' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </Card>
          ))
        )}

        {/* ── Próximas consultas ── */}
        <SectionHeader
          title="📅 Próximas Consultas"
          action={() => navigation.navigate('Consultas')}
        />

        {proximasConsultas.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>Nenhuma consulta agendada</Text>
          </Card>
        ) : (
          proximasConsultas.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => navigation.navigate('Consultas')}
              activeOpacity={0.85}
            >
              <Card style={styles.consultaCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.consultaDateBox}>
                    <Text style={styles.consultaDay}>
                      {new Date(c.dataHoraISO).getDate()}
                    </Text>
                    <Text style={styles.consultaMonth}>
                      {new Date(c.dataHoraISO).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text style={styles.consultaEspecialidade}>
                      {c.especialidade || 'Consulta Médica'}
                    </Text>
                    <Text style={styles.consultaIdoso}>{getNomeIdoso(c.idosoId)}</Text>
                    <Text style={styles.consultaInfo}>
                      ⏰ {c.horario}
                      {c.local ? `  📍 ${c.local}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* Botão configurações */}
        <TouchableOpacity
          style={styles.configBtn}
          onPress={() => navigation.navigate('Configuracoes')}
        >
          <Ionicons name="settings-outline" size={18} color={Colors.outline} />
          <Text style={styles.configBtnText}>Configurações e Backup</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Setup inicial */}
      {!cuidador && (
        <TouchableOpacity
          style={styles.setupBanner}
          onPress={() => navigation.navigate('Cuidador')}
          activeOpacity={0.9}
        >
          <Ionicons name="person-circle-outline" size={20} color={Colors.onPrimary} />
          <Text style={styles.setupBannerText}>Configure seu perfil de cuidador →</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md },

  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: Spacing.lg, paddingTop: Spacing.sm,
  },
  saudacao: { ...Typography.bodySmall, color: Colors.outline },
  headerTitle: {
    ...Typography.headlineMedium,
    color: Colors.onBackground, fontWeight: '700',
  },
  headerSub: {
    ...Typography.bodySmall, color: Colors.outline,
    marginTop: 2, textTransform: 'capitalize',
  },
  headerAvatar: { marginLeft: Spacing.md },
  headerAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  headerAvatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },

  alertCard: { marginBottom: Spacing.md },
  alertTitle: { ...Typography.titleSmall, marginBottom: 4 },
  alertItem: { ...Typography.bodySmall, marginTop: 2 },

  idosoCard: {
    width: 130,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    alignItems: 'center',
    ...Elevation.level2,
  },
  idosoFoto: { width: 68, height: 68, borderRadius: 34, marginBottom: Spacing.sm },
  idosoFotoPlaceholder: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  idosoInitial: {
    ...Typography.headlineSmall,
    color: Colors.primary, fontWeight: '700',
  },
  idosoNome: {
    ...Typography.labelMedium,
    color: Colors.onSurface, textAlign: 'center', fontWeight: '600',
  },
  idosoIdade: { ...Typography.labelSmall, color: Colors.outline, marginTop: 2 },
  imcBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full, marginTop: 6,
  },
  imcBadgeText: { ...Typography.labelSmall, fontWeight: '700' },

  addIdosoCard: {
    width: 100,
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderStyle: 'dashed',
    borderColor: Colors.primary,
    minHeight: 130,
  },
  addIdosoText: {
    ...Typography.labelMedium,
    color: Colors.primary, textAlign: 'center',
    marginTop: Spacing.sm, fontWeight: '600',
  },

  medsSectionHeader: { position: 'relative' },
  pendenteBadge: {
    position: 'absolute', right: 0, top: Spacing.md,
    backgroundColor: Colors.errorContainer,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  pendenteBadgeText: {
    ...Typography.labelSmall,
    color: Colors.error, fontWeight: '700',
  },

  emptyCard: { alignItems: 'center', paddingVertical: Spacing.lg, marginBottom: Spacing.sm },
  emptyCardText: { ...Typography.bodyMedium, color: Colors.outline },

  medCard: { marginBottom: Spacing.sm },
  medIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  medNome: { ...Typography.titleSmall, color: Colors.onSurface, fontWeight: '600' },
  medDose: { ...Typography.bodySmall, color: Colors.secondary },
  medIdoso: { ...Typography.labelSmall, color: Colors.outline },

  horariosContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginTop: Spacing.sm, gap: 6,
  },
  horarioBotao: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondaryContainer,
    borderWidth: 1.5, borderColor: Colors.secondary,
  },
  horarioBotaoTomado: {
    backgroundColor: Colors.successContainer || '#D1FAE5',
    borderColor: Colors.success,
  },
  horarioBotaoText: {
    ...Typography.labelSmall,
    color: Colors.secondary, marginLeft: 4, fontWeight: '600',
  },
  horarioBotaoTextTomado: {
    color: Colors.success,
  },

  consultaCard: { marginBottom: Spacing.sm },
  consultaDateBox: {
    width: 52, height: 52,
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  consultaDay: { ...Typography.titleMedium, color: Colors.primary, fontWeight: '800' },
  consultaMonth: { ...Typography.labelSmall, color: Colors.primary, textTransform: 'uppercase' },
  consultaEspecialidade: { ...Typography.titleSmall, color: Colors.onSurface, fontWeight: '600' },
  consultaIdoso: { ...Typography.bodySmall, color: Colors.secondary },
  consultaInfo: { ...Typography.labelSmall, color: Colors.outline, marginTop: 2 },

  configBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  configBtnText: {
    ...Typography.labelMedium, color: Colors.outline, marginLeft: Spacing.sm,
  },

  setupBanner: {
    position: 'absolute', bottom: 90, left: Spacing.md, right: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center',
    ...Elevation.level3,
  },
  setupBannerText: {
    ...Typography.labelLarge, color: Colors.onPrimary, marginLeft: Spacing.sm,
  },
});
