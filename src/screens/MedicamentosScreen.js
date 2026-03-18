// ============================================================
// MEDICAMENTOS SCREEN - LIA App
// Atualizado com busca, ordenação por horário e swipe delete
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Image, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme';
import { FAB, EmptyState, HorarioPill, ConfirmModal, ScreenHeader } from '../components';
import { MedicamentoStorage, IdosoStorage } from '../storage';
import {
  ordenarMedicamentosPorHorario,
  filtrarPorBusca,
  validarHorario
} from '../services/helpers';

export default function MedicamentosScreen() {
  const navigation = useNavigation();
  const [medicamentos, setMedicamentos] = useState([]);
  const [idosos, setIdosos] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [filtroIdoso, setFiltroIdoso] = useState(null);
  const [busca, setBusca] = useState('');

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = async () => {
    const [meds, lista] = await Promise.all([
      MedicamentoStorage.getAll(),
      IdosoStorage.getAll(),
    ]);
    setMedicamentos(meds);
    setIdosos(lista);
  };

  const getNomeIdoso = (id) => idosos.find((i) => i.id === id)?.nome || 'Desconhecido';
  const getFotoIdoso = (id) => idosos.find((i) => i.id === id)?.foto || null;

  // Filtrar e ordenar medicamentos
  const medsFiltrados = (() => {
    let lista = filtroIdoso
      ? medicamentos.filter((m) => m.idosoId === filtroIdoso)
      : medicamentos;

    // Aplicar busca
    lista = filtrarPorBusca(lista, busca, ['nome', 'dose', 'observacoes']);

    // Ordenar por próximo horário
    return ordenarMedicamentosPorHorario(lista);
  })();

  const confirmarExclusao = (id) => {
    setDeletingId(id);
    setShowConfirm(true);
  };

  const excluir = async () => {
    await MedicamentoStorage.remove(deletingId);
    setShowConfirm(false);
    setDeletingId(null);
    carregarDados();
  };

  // Próximo horário do dia formatado
  const getProximoHorario = (horarios) => {
    if (!horarios?.length) return null;
    const agora = new Date();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    const validos = horarios.filter(validarHorario);
    const proximo = validos.find((h) => {
      const [hr, min] = h.split(':').map(Number);
      return hr * 60 + min > horaAtual;
    });
    return proximo || validos[0] || null;
  };

  const renderMed = ({ item }) => {
    const fotoIdoso = getFotoIdoso(item.idosoId);
    const proximoHorario = getProximoHorario(item.horarios);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.medIconBox}>
            <Ionicons name="medical" size={24} color={Colors.secondary} />
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={styles.medNome}>{item.nome}</Text>
            <Text style={styles.medDose}>{item.dose}</Text>
            {proximoHorario && (
              <View style={styles.proximoRow}>
                <Ionicons name="time" size={13} color={Colors.primary} />
                <Text style={styles.proximoText}>
                  Próximo: {proximoHorario}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('MedicamentoForm', {
                medicamentoId: item.id, idosoId: item.idosoId
              })}
              style={styles.actionBtn}
            >
              <Ionicons name="pencil-outline" size={19} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => confirmarExclusao(item.id)}
              style={[styles.actionBtn, { marginTop: 4 }]}
            >
              <Ionicons name="trash-outline" size={19} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Horários */}
        {item.horarios?.length > 0 && (
          <View style={styles.horariosRow}>
            {item.horarios.map((h, i) => <HorarioPill key={i} horario={h} />)}
          </View>
        )}

        {/* Idoso vinculado */}
        <View style={styles.idosoRow}>
          {fotoIdoso ? (
            <Image source={{ uri: fotoIdoso }} style={styles.idosoFoto} />
          ) : (
            <View style={styles.idosoFotoPlaceholder}>
              <Text style={styles.idosoInitial}>
                {getNomeIdoso(item.idosoId).charAt(0)}
              </Text>
            </View>
          )}
          <Text style={styles.idosoNome}>{getNomeIdoso(item.idosoId)}</Text>
          {item.alarmeAtivo && (
            <View style={styles.alarmeBadge}>
              <Ionicons name="alarm" size={12} color={Colors.secondary} />
              <Text style={styles.alarmeBadgeText}>Alarme ativo</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Medicamentos"
        subtitle={`${medsFiltrados.length} cadastrado${medsFiltrados.length !== 1 ? 's' : ''}`}
      />

      {/* Busca */}
      <View style={styles.buscaContainer}>
        <Ionicons name="search-outline" size={20} color={Colors.outline} style={styles.buscaIcon} />
        <TextInput
          style={styles.buscaInput}
          placeholder="Buscar medicamento..."
          placeholderTextColor={Colors.outline}
          value={busca}
          onChangeText={setBusca}
          clearButtonMode="while-editing"
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => setBusca('')}>
            <Ionicons name="close-circle" size={20} color={Colors.outline} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtro por idoso */}
      {idosos.length > 1 && (
        <View style={styles.filtroRow}>
          <TouchableOpacity
            style={[styles.filtroBtn, !filtroIdoso && styles.filtroBtnActive]}
            onPress={() => setFiltroIdoso(null)}
          >
            <Text style={[styles.filtroBtnText, !filtroIdoso && styles.filtroBtnTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          {idosos.map((i) => (
            <TouchableOpacity
              key={i.id}
              style={[styles.filtroBtn, filtroIdoso === i.id && styles.filtroBtnActive]}
              onPress={() => setFiltroIdoso(filtroIdoso === i.id ? null : i.id)}
            >
              <Text
                style={[styles.filtroBtnText, filtroIdoso === i.id && styles.filtroBtnTextActive]}
                numberOfLines={1}
              >
                {i.nome.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={medsFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderMed}
        contentContainerStyle={[
          styles.list,
          medsFiltrados.length === 0 && { flex: 1, justifyContent: 'center' },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="medical-outline"
            title={busca ? 'Nenhum resultado encontrado' : 'Nenhum medicamento'}
            subtitle={busca ? `Nenhum medicamento com "${busca}"` : 'Adicione os medicamentos dos idosos para acompanhar os horários'}
            action={busca ? () => setBusca('') : () => navigation.navigate('MedicamentoForm')}
            actionLabel={busca ? 'Limpar busca' : 'Adicionar medicamento'}
          />
        }
      />

      <FAB icon="add" label="Novo Remédio" onPress={() => navigation.navigate('MedicamentoForm')} />

      <ConfirmModal
        visible={showConfirm}
        title="Excluir Medicamento"
        message="Deseja remover este medicamento? Os alarmes configurados serão mantidos no app de Relógio."
        onConfirm={excluir}
        onCancel={() => setShowConfirm(false)}
        confirmLabel="Remover"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, paddingBottom: 100 },

  // Busca
  buscaContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  buscaIcon: { marginRight: Spacing.sm },
  buscaInput: {
    flex: 1,
    ...Typography.bodyMedium,
    color: Colors.onSurface,
  },

  // Filtro
  filtroRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm, flexWrap: 'wrap',
  },
  filtroBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    marginRight: 6, marginBottom: 4,
  },
  filtroBtnActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  filtroBtnText: { ...Typography.labelMedium, color: Colors.onSurfaceVariant },
  filtroBtnTextActive: { color: Colors.primary, fontWeight: '700' },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Elevation.level2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  medIconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  medNome: { ...Typography.titleSmall, color: Colors.onSurface, fontWeight: '700' },
  medDose: { ...Typography.bodySmall, color: Colors.secondary, marginTop: 2 },
  proximoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  proximoText: { ...Typography.labelSmall, color: Colors.primary, marginLeft: 4, fontWeight: '600' },
  actions: { alignItems: 'center' },
  actionBtn: { padding: 6 },

  horariosRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm },

  idosoRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
  },
  idosoFoto: { width: 24, height: 24, borderRadius: 12 },
  idosoFotoPlaceholder: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  idosoInitial: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  idosoNome: { ...Typography.labelMedium, color: Colors.outline, marginLeft: 6, flex: 1 },
  alarmeBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  alarmeBadgeText: { ...Typography.labelSmall, color: Colors.secondary, marginLeft: 3 },
});
