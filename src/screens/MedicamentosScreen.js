// ============================================================
// MEDICAMENTOS SCREEN - LIA App
// Lista todos os medicamentos cadastrados por idoso
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme';
import { FAB, EmptyState, HorarioPill, ConfirmModal, ScreenHeader } from '../components';
import { MedicamentoStorage, IdosoStorage } from '../storage';

export default function MedicamentosScreen() {
  const navigation = useNavigation();
  const [medicamentos, setMedicamentos] = useState([]);
  const [idosos, setIdosos] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [filtroIdoso, setFiltroIdoso] = useState(null);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = async () => {
    const [meds, idosos] = await Promise.all([
      MedicamentoStorage.getAll(),
      IdosoStorage.getAll(),
    ]);
    setMedicamentos(meds);
    setIdosos(idosos);
  };

  const getNomeIdoso = (id) => idosos.find((i) => i.id === id)?.nome || 'Desconhecido';
  const getFotoIdoso = (id) => idosos.find((i) => i.id === id)?.foto || null;

  const medsFiltrados = filtroIdoso
    ? medicamentos.filter((m) => m.idosoId === filtroIdoso)
    : medicamentos;

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

  const renderMed = ({ item }) => {
    const fotoIdoso = getFotoIdoso(item.idosoId);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.medIconBox}>
            <Ionicons name="medical" size={24} color={Colors.secondary} />
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={styles.medNome}>{item.nome}</Text>
            <Text style={styles.medDose}>{item.dose}</Text>
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
          {item.foto && (
            <TouchableOpacity
              onPress={() => navigation.navigate('ReceitaForm', { idosoId: item.idosoId })}
              style={styles.receitaBadge}
            >
              <Ionicons name="document-attach-outline" size={14} color={Colors.primary} />
              <Text style={styles.receitaBadgeText}>Ver receita</Text>
            </TouchableOpacity>
          )}
        </View>

        {item.observacoes ? (
          <Text style={styles.obsText} numberOfLines={2}>{item.observacoes}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Medicamentos"
        subtitle={`${medicamentos.length} cadastrado${medicamentos.length !== 1 ? 's' : ''}`}
      />

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
            title="Nenhum medicamento"
            subtitle="Adicione os medicamentos dos idosos para acompanhar os horários"
            action={() => navigation.navigate('MedicamentoForm')}
            actionLabel="Adicionar medicamento"
          />
        }
      />

      <FAB icon="add" label="Novo Remédio" onPress={() => navigation.navigate('MedicamentoForm')} />

      <ConfirmModal
        visible={showConfirm}
        title="Excluir Medicamento"
        message="Deseja remover este medicamento?"
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

  filtroRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, flexWrap: 'wrap',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
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
  idosoInitial: { ...Typography.labelSmall, color: Colors.primary, fontWeight: '700' },
  idosoNome: { ...Typography.labelMedium, color: Colors.outline, marginLeft: 6, flex: 1 },
  receitaBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
  },
  receitaBadgeText: { ...Typography.labelSmall, color: Colors.primary, marginLeft: 3 },

  obsText: { ...Typography.bodySmall, color: Colors.outline, marginTop: Spacing.sm },
});
