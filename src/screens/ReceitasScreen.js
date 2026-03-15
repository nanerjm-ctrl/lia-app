// ============================================================
// RECEITAS SCREEN - LIA App
// Galeria de receitas médicas organizadas por idoso e data
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, Dimensions, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme';
import { FAB, EmptyState, ConfirmModal, ScreenHeader } from '../components';
import { ReceitaStorage, IdosoStorage } from '../storage';
import { formatarData } from '../services/helpers';

const { width: SCREEN_W } = Dimensions.get('window');
const FOTO_SIZE = (SCREEN_W - Spacing.md * 2 - Spacing.sm * 2) / 3;

export default function ReceitasScreen() {
  const navigation = useNavigation();
  const [receitas, setReceitas] = useState([]);
  const [idosos, setIdosos] = useState([]);
  const [filtroIdoso, setFiltroIdoso] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fotoAberta, setFotoAberta] = useState(null);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = async () => {
    const [recs, lista] = await Promise.all([
      ReceitaStorage.getAll(),
      IdosoStorage.getAll(),
    ]);
    setReceitas(recs.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)));
    setIdosos(lista);
  };

  const getNomeIdoso = (id) => idosos.find((i) => i.id === id)?.nome || '—';

  const receitasFiltradas = filtroIdoso
    ? receitas.filter((r) => r.idosoId === filtroIdoso)
    : receitas;

  // Agrupar por idoso para exibição
  const grupos = idosos.reduce((acc, idoso) => {
    const recs = receitasFiltradas.filter((r) => r.idosoId === idoso.id);
    if (recs.length > 0) acc.push({ idoso, receitas: recs });
    return acc;
  }, []);

  const confirmarExclusao = (id) => {
    setDeletingId(id);
    setShowConfirm(true);
  };

  const excluir = async () => {
    await ReceitaStorage.remove(deletingId);
    setShowConfirm(false);
    setDeletingId(null);
    carregarDados();
  };

  const renderGrupo = ({ item: { idoso, receitas: recs } }) => (
    <View style={styles.grupo}>
      {/* Header do grupo */}
      <View style={styles.grupoHeader}>
        {idoso.foto ? (
          <Image source={{ uri: idoso.foto }} style={styles.idosoFoto} />
        ) : (
          <View style={styles.idosoFotoPlaceholder}>
            <Text style={styles.idosoInitial}>{idoso.nome.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={styles.idosoNome}>{idoso.nome}</Text>
          <Text style={styles.idosoCount}>{recs.length} receita{recs.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('ReceitaForm', { idosoId: idoso.id })}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addBtnText}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      {/* Grid de receitas */}
      <View style={styles.grid}>
        {recs.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.receitaItem}
            onPress={() => setFotoAberta(r)}
            onLongPress={() => confirmarExclusao(r.id)}
            activeOpacity={0.8}
          >
            {r.foto ? (
              <Image source={{ uri: r.foto }} style={styles.receitaFoto} resizeMode="cover" />
            ) : (
              <View style={styles.receitaFotoPlaceholder}>
                <Ionicons name="document-text" size={32} color={Colors.primary} />
              </View>
            )}
            <View style={styles.receitaInfo}>
              <Text style={styles.receitaTitulo} numberOfLines={1}>
                {r.titulo || 'Receita'}
              </Text>
              <Text style={styles.receitaData}>{formatarData(r.criadoEm)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmarExclusao(r.id)}
              style={styles.receitaDelete}
            >
              <Ionicons name="trash-outline" size={14} color={Colors.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Receitas Médicas"
        subtitle={`${receitas.length} receita${receitas.length !== 1 ? 's' : ''}`}
      />

      {/* Filtro */}
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

      {grupos.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="document-text-outline"
            title="Nenhuma receita"
            subtitle="Fotografe as receitas médicas para mantê-las organizadas"
            action={() => navigation.navigate('ReceitaForm')}
            actionLabel="Adicionar receita"
          />
        </View>
      ) : (
        <FlatList
          data={grupos}
          keyExtractor={(item) => item.idoso.id}
          renderItem={renderGrupo}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB icon="add" label="Nova Receita" onPress={() => navigation.navigate('ReceitaForm')} />

      {/* Modal de visualização de foto */}
      <Modal
        visible={!!fotoAberta}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoAberta(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setFotoAberta(null)}
          >
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {fotoAberta?.foto && (
            <Image
              source={{ uri: fotoAberta.foto }}
              style={styles.modalFoto}
              resizeMode="contain"
            />
          )}
          <View style={styles.modalInfo}>
            <Text style={styles.modalTitulo}>{fotoAberta?.titulo || 'Receita'}</Text>
            <Text style={styles.modalData}>{getNomeIdoso(fotoAberta?.idosoId)}</Text>
            <Text style={styles.modalData}>{formatarData(fotoAberta?.criadoEm)}</Text>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={showConfirm}
        title="Excluir Receita"
        message="Deseja remover esta receita?"
        onConfirm={excluir}
        onCancel={() => setShowConfirm(false)}
        confirmLabel="Excluir"
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

  grupo: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Elevation.level2,
  },
  grupoHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
  },
  idosoFoto: { width: 36, height: 36, borderRadius: 18 },
  idosoFotoPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  idosoInitial: { ...Typography.labelLarge, color: Colors.primary, fontWeight: '700' },
  idosoNome: { ...Typography.titleSmall, color: Colors.onSurface, fontWeight: '700' },
  idosoCount: { ...Typography.labelSmall, color: Colors.outline },
  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.primary,
  },
  addBtnText: { ...Typography.labelSmall, color: Colors.primary, marginLeft: 4 },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: Spacing.sm,
  },
  receitaItem: {
    width: FOTO_SIZE,
    margin: 3,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceVariant,
    position: 'relative',
  },
  receitaFoto: { width: FOTO_SIZE, height: FOTO_SIZE },
  receitaFotoPlaceholder: {
    width: FOTO_SIZE, height: FOTO_SIZE,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryContainer,
  },
  receitaInfo: {
    padding: 6,
    backgroundColor: Colors.surface,
  },
  receitaTitulo: { ...Typography.labelSmall, color: Colors.onSurface, fontWeight: '600' },
  receitaData: { ...Typography.labelSmall, color: Colors.outline, fontSize: 10 },
  receitaDelete: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12, padding: 3,
  },

  // Modal foto
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalClose: {
    position: 'absolute', top: 50, right: 20, zIndex: 10,
  },
  modalFoto: {
    width: SCREEN_W - 32, height: SCREEN_W - 32,
  },
  modalInfo: { marginTop: Spacing.lg, alignItems: 'center' },
  modalTitulo: { ...Typography.titleMedium, color: '#fff', fontWeight: '700' },
  modalData: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
});
