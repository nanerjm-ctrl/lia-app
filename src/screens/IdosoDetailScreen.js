// ============================================================
// IDOSO DETAIL SCREEN - LIA App
// Perfil completo do idoso com histórico, meds e consultas
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme';
import { Card, SectionHeader, Badge, IMCCard, HorarioPill, Button, ScreenHeader } from '../components';
import { IdosoStorage, MedicamentoStorage, ConsultaStorage, ReceitaStorage } from '../storage';
import { calcularIMC, calcularIdade, formatarDataHora } from '../services/helpers';

export default function IdosoDetailScreen({ route }) {
  const navigation = useNavigation();
  const { idosoId } = route.params;

  const [idoso, setIdoso] = useState(null);
  const [medicamentos, setMedicamentos] = useState([]);
  const [consultas, setConsultas] = useState([]);
  const [receitas, setReceitas] = useState([]);

  useFocusEffect(
    useCallback(() => {
      carregarTudo();
    }, [idosoId])
  );

  const carregarTudo = async () => {
    const [i, meds, cons, recs] = await Promise.all([
      IdosoStorage.getById(idosoId),
      MedicamentoStorage.getByIdoso(idosoId),
      ConsultaStorage.getByIdoso(idosoId),
      ReceitaStorage.getByIdoso(idosoId),
    ]);
    setIdoso(i);
    setMedicamentos(meds);
    setConsultas(cons.sort((a, b) => new Date(b.dataHoraISO) - new Date(a.dataHoraISO)).slice(0, 5));
    setReceitas(recs.slice(0, 3));
  };

  if (!idoso) return null;

  const imc = calcularIMC(idoso.peso, idoso.altura);
  const idade = calcularIdade(idoso.dataNasc);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={idoso.nome.split(' ')[0]}
        subtitle="Perfil completo"
        onBack={() => navigation.goBack()}
        rightAction={() => navigation.navigate('IdosoForm', { idosoId })}
        rightIcon="pencil-outline"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Perfil header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            {idoso.foto ? (
              <Image source={{ uri: idoso.foto }} style={styles.foto} />
            ) : (
              <View style={styles.fotoPlaceholder}>
                <Text style={styles.fotoInitial}>{idoso.nome.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.nomeCompleto}>{idoso.nome}</Text>
              {idade !== null && (
                <Text style={styles.infoSub}>{idade} anos</Text>
              )}
              {idoso.dataNasc && (
                <Text style={styles.infoSub}>Nasc. {idoso.dataNasc}</Text>
              )}
              <View style={styles.badgesRow}>
                {idoso.vidaAtiva && (
                  <Badge label="Vida Ativa ✓" color={Colors.success} />
                )}
              </View>
            </View>
          </View>

          {/* Dados físicos */}
          <View style={styles.statsRow}>
            {idoso.peso && (
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{idoso.peso}</Text>
                <Text style={styles.statLabel}>Peso (kg)</Text>
              </View>
            )}
            {idoso.altura && (
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{idoso.altura}</Text>
                <Text style={styles.statLabel}>Altura</Text>
              </View>
            )}
            {imc && (
              <View style={[styles.statBox, { borderLeftWidth: 3, borderLeftColor: imc.cor }]}>
                <Text style={[styles.statValue, { color: imc.cor }]}>{imc.valor}</Text>
                <Text style={styles.statLabel}>IMC</Text>
              </View>
            )}
          </View>

          {imc && <IMCCard imc={imc} />}
        </Card>

        {/* Médico */}
        {(idoso.medico || idoso.clinica) && (
          <Card>
            <Text style={styles.sectionTitle}>👨‍⚕️ Médico</Text>
            {idoso.medico && (
              <View style={styles.infoRow}>
                <Ionicons name="person-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.infoText}>{idoso.medico}</Text>
              </View>
            )}
            {idoso.clinica && (
              <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={18} color={Colors.primary} />
                <Text style={styles.infoText}>{idoso.clinica}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Doenças */}
        {idoso.doencas?.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>🏥 Doenças Crônicas</Text>
            <View style={styles.doencasWrap}>
              {idoso.doencas.map((d) => (
                <View key={d} style={styles.doencaChip}>
                  <Text style={styles.doencaChipText}>{d}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Medicamentos */}
        <SectionHeader
          title="💊 Medicamentos"
          action={() => navigation.navigate('MedicamentoForm', { idosoId })}
          actionLabel="+ Adicionar"
        />
        {medicamentos.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum medicamento cadastrado</Text>
          </Card>
        ) : (
          medicamentos.map((m) => (
            <Card key={m.id} style={styles.medCard}>
              <View style={styles.medRow}>
                <View style={styles.medIcon}>
                  <Ionicons name="medical" size={20} color={Colors.secondary} />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={styles.medNome}>{m.nome}</Text>
                  <Text style={styles.medDose}>{m.dose}</Text>
                </View>
              </View>
              {m.horarios?.length > 0 && (
                <View style={styles.horariosRow}>
                  {m.horarios.map((h, i) => <HorarioPill key={i} horario={h} />)}
                </View>
              )}
            </Card>
          ))
        )}

        {/* Consultas recentes */}
        <SectionHeader
          title="📅 Consultas"
          action={() => navigation.navigate('ConsultaForm', { idosoId })}
          actionLabel="+ Agendar"
        />
        {consultas.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhuma consulta cadastrada</Text>
          </Card>
        ) : (
          consultas.map((c) => (
            <Card key={c.id} style={styles.consultaCard}>
              <Text style={styles.consultaEsp}>{c.especialidade || 'Consulta Médica'}</Text>
              <Text style={styles.consultaData}>
                <Ionicons name="calendar-outline" size={13} /> {formatarDataHora(c.dataHoraISO)}
              </Text>
              {c.local && (
                <Text style={styles.consultaLocal}>
                  <Ionicons name="location-outline" size={13} /> {c.local}
                </Text>
              )}
            </Card>
          ))
        )}

        {/* Observações */}
        {idoso.observacoes?.trim() && (
          <Card>
            <Text style={styles.sectionTitle}>📝 Observações</Text>
            <Text style={styles.obsText}>{idoso.observacoes}</Text>
          </Card>
        )}

        {/* Ações rápidas */}
        <View style={styles.acoesBtns}>
          <Button
            label="Agendar Consulta"
            onPress={() => navigation.navigate('ConsultaForm', { idosoId })}
            icon="calendar-outline"
            variant="tonal"
            style={{ flex: 1, marginRight: 6 }}
          />
          <Button
            label="Add Remédio"
            onPress={() => navigation.navigate('MedicamentoForm', { idosoId })}
            icon="medical-outline"
            variant="tonal"
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md },

  profileCard: { marginBottom: Spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  foto: { width: 88, height: 88, borderRadius: 44 },
  fotoPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  fotoInitial: { ...Typography.headlineMedium, color: Colors.primary, fontWeight: '800' },
  nomeCompleto: { ...Typography.titleLarge, color: Colors.onSurface, fontWeight: '700' },
  infoSub: { ...Typography.bodySmall, color: Colors.outline, marginTop: 2 },
  badgesRow: { flexDirection: 'row', marginTop: Spacing.sm },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  statBox: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceVariant,
    minWidth: 80,
  },
  statValue: { ...Typography.headlineSmall, color: Colors.primary, fontWeight: '800' },
  statLabel: { ...Typography.labelSmall, color: Colors.outline },

  sectionTitle: { ...Typography.titleSmall, color: Colors.onSurface, fontWeight: '700', marginBottom: Spacing.sm },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { ...Typography.bodyMedium, color: Colors.onSurface, marginLeft: Spacing.sm },

  doencasWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  doencaChip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.errorContainer,
    margin: 3,
  },
  doencaChipText: { ...Typography.labelSmall, color: Colors.error },

  emptyCard: { paddingVertical: Spacing.lg, alignItems: 'center' },
  emptyText: { ...Typography.bodyMedium, color: Colors.outline },

  medCard: { marginBottom: Spacing.sm },
  medRow: { flexDirection: 'row', alignItems: 'center' },
  medIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  medNome: { ...Typography.titleSmall, color: Colors.onSurface, fontWeight: '600' },
  medDose: { ...Typography.bodySmall, color: Colors.secondary },
  horariosRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm },

  consultaCard: { marginBottom: Spacing.sm },
  consultaEsp: { ...Typography.titleSmall, color: Colors.onSurface, fontWeight: '600' },
  consultaData: { ...Typography.bodySmall, color: Colors.primary, marginTop: 2 },
  consultaLocal: { ...Typography.bodySmall, color: Colors.outline, marginTop: 2 },

  obsText: { ...Typography.bodyMedium, color: Colors.onSurfaceVariant, lineHeight: 22 },

  acoesBtns: { flexDirection: 'row', marginTop: Spacing.md },
});
