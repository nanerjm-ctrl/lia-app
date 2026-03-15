// ============================================================
// HOME SCREEN - LIA App
// Dashboard com resumo do dia, próximas consultas e remédios
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme';
import {
  Card, SectionHeader, Badge, EmptyState, HorarioPill
} from '../components';
import {
  CuidadorStorage, IdosoStorage, ConsultaStorage, MedicamentoStorage
} from '../storage';
import { formatarDataHora, calcularIMC, calcularIdade } from '../services/helpers';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [cuidador, setCuidador] = useState(null);
  const [idosos, setIdosos] = useState([]);
  const [proximasConsultas, setProximasConsultas] = useState([]);
  const [medicamentosHoje, setMedicamentosHoje] = useState([]);
  const [alertasAmanha, setAlertasAmanha] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Carrega dados ao focar na tela
  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = async () => {
    setRefreshing(true);
    try {
      const [cuidadores, listaIdosos, consultas, meds, amanha] = await Promise.all([
        CuidadorStorage.getAll(),
        IdosoStorage.getAll(),
        ConsultaStorage.getProximas(),
        MedicamentoStorage.getHoje(),
        ConsultaStorage.getAmanha(),
      ]);

      setCuidador(cuidadores[0] || null);
      setIdosos(listaIdosos);
      setProximasConsultas(consultas.slice(0, 5));
      setMedicamentosHoje(meds);
      setAlertasAmanha(amanha);
    } catch (e) {
      console.error('[Home] Erro ao carregar:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const getNomeIdoso = (idosoId) =>
    idosos.find((i) => i.id === idosoId)?.nome || 'Desconhecido';

  const hora = new Date().getHours();
  const saudacao =
    hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

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

        {/* ── Alerta de consultas amanhã ── */}
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

        {idosos.length === 0 ? (
          <Card>
            <EmptyState
              icon="person-add-outline"
              title="Nenhum idoso cadastrado"
              subtitle="Cadastre os idosos para acompanhar o cuidado"
              action={() => navigation.navigate('Idosos')}
              actionLabel="Cadastrar idoso"
            />
          </Card>
        ) : (
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
                    <Badge
                      label={`IMC ${imc.valor}`}
                      color={imc.cor}
                      style={{ marginTop: 6 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Medicamentos de hoje ── */}
        <SectionHeader
          title="💊 Remédios de Hoje"
          action={() => navigation.navigate('Medicamentos')}
        />

        {medicamentosHoje.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>Nenhum medicamento cadastrado</Text>
          </Card>
        ) : (
          medicamentosHoje.slice(0, 4).map((med) => (
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
              {med.horarios?.length > 0 && (
                <View style={styles.horariosRow}>
                  {med.horarios.map((h, i) => (
                    <HorarioPill key={i} horario={h} />
                  ))}
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
                      {new Date(c.dataHoraISO).toLocaleDateString('pt-BR', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text style={styles.consultaEspecialidade}>
                      {c.especialidade || 'Consulta Médica'}
                    </Text>
                    <Text style={styles.consultaIdoso}>{getNomeIdoso(c.idosoId)}</Text>
                    <Text style={styles.consultaHora}>
                      <Ionicons name="time-outline" size={13} color={Colors.outline} /> {c.horario}
                    </Text>
                    {c.local && (
                      <Text style={styles.consultaLocal} numberOfLines={1}>
                        <Ionicons name="location-outline" size={13} color={Colors.outline} /> {c.local}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Setup inicial se não há cuidador */}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  saudacao: {
    ...Typography.bodySmall,
    color: Colors.outline,
  },
  headerTitle: {
    ...Typography.headlineMedium,
    color: Colors.onBackground,
    fontWeight: '700',
  },
  headerSub: {
    ...Typography.bodySmall,
    color: Colors.outline,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  headerAvatar: {
    marginLeft: Spacing.md,
  },
  headerAvatarImg: {
    width: 52, height: 52, borderRadius: 26,
  },
  headerAvatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },

  // Alerta
  alertCard: {
    marginBottom: Spacing.md,
    ...Elevation.level1,
  },
  alertTitle: {
    ...Typography.titleSmall,
    marginBottom: 4,
  },
  alertItem: {
    ...Typography.bodyMedium,
    marginTop: 2,
  },

  // Idoso card (horizontal scroll)
  idosoCard: {
    width: 130,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    alignItems: 'center',
    ...Elevation.level2,
  },
  idosoFoto: {
    width: 68, height: 68, borderRadius: 34,
    marginBottom: Spacing.sm,
  },
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
    color: Colors.onSurface,
    textAlign: 'center',
    fontWeight: '600',
  },
  idosoIdade: {
    ...Typography.labelSmall,
    color: Colors.outline,
    marginTop: 2,
  },

  // Meds
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyCardText: {
    ...Typography.bodyMedium,
    color: Colors.outline,
  },
  medCard: {
    marginBottom: Spacing.sm,
  },
  medIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  medNome: {
    ...Typography.titleSmall,
    color: Colors.onSurface, fontWeight: '600',
  },
  medDose: {
    ...Typography.bodySmall,
    color: Colors.secondary,
  },
  medIdoso: {
    ...Typography.labelSmall,
    color: Colors.outline,
  },
  horariosRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginTop: Spacing.sm,
  },

  // Consulta
  consultaCard: { marginBottom: Spacing.sm },
  consultaDateBox: {
    width: 52, height: 52,
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  consultaDay: {
    ...Typography.titleMedium,
    color: Colors.primary, fontWeight: '800',
  },
  consultaMonth: {
    ...Typography.labelSmall,
    color: Colors.primary, textTransform: 'uppercase',
  },
  consultaEspecialidade: {
    ...Typography.titleSmall,
    color: Colors.onSurface, fontWeight: '600',
  },
  consultaIdoso: {
    ...Typography.bodySmall,
    color: Colors.secondary,
  },
  consultaHora: {
    ...Typography.labelSmall,
    color: Colors.outline, marginTop: 2,
  },
  consultaLocal: {
    ...Typography.labelSmall,
    color: Colors.outline, marginTop: 2,
  },

  // Setup banner
  setupBanner: {
    position: 'absolute',
    bottom: 90, left: Spacing.md, right: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center',
    ...Elevation.level3,
  },
  setupBannerText: {
    ...Typography.labelLarge,
    color: Colors.onPrimary,
    marginLeft: Spacing.sm,
  },
});
