// ============================================================
// CONSULTAS SCREEN - LIA App
// Atualizado com busca e filtros melhorados
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
import { FAB, EmptyState, ConfirmModal, Badge, ScreenHeader } from '../components';
import { ConsultaStorage, IdosoStorage } from '../storage';
import { formatarDataHora, filtrarPorBusca } from '../services/helpers';

export default function ConsultasScreen() {
  const navigation = useNavigation();
  const [consultas, setConsultas] = useState([]);
  const [idosos, setIdosos] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [aba, setAba] = useState('proximas');
  const [busca, setBusca] = useState('');

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = async () => {
    const [todasConsultas, lista] = await Promise.all([
      ConsultaStorage.getAll(),
      IdosoStorage.getAll(),
    ]);
    const sorted = todasConsultas.sort(
      (a, b) => new Date(a.dataHoraISO) - new Date(b.dataHoraISO)
    );
    setConsultas(sorted);
    setIdosos(lista);
  };

  const getNomeIdoso = (id) => idosos.find((i) => i.id === id)?.nome || '—';
  const getFotoIdoso = (id) => idosos.find((i) => i.id === id)?.foto || null;

  const agora = new Date();

  // Filtrar por aba + busca
  const consultasFiltradas = (() => {
    let lista = aba === 'proximas'
      ? consultas.filter((c) => new Date(c.dataHoraISO) >= agora)
      : consultas;

    return filtrarPorBusca(lista, busca, ['especialidade', 'medico', 'local', 'observacoes']);
  })();

  const isHoje = (iso) => {
    const d = new Date(iso);
    const hoje = new Date();
    return d.getDate() === hoje.getDate() &&
      d.getMonth() === hoje.getMonth() &&
      d.getFullYear() === hoje.getFullYear();
  };

  const isAmanha = (iso) => {
    const d = new Date(iso);
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    return d.getDate() === amanha.getDate() &&
      d.getMonth() === amanha.getMonth() &&
      d.getFullYear() === amanha.getFullYear();
  };

  const confirmarExclusao = (id) => {
    setDeletingId(id);
    setShowConfirm(true);
  };

  const excluir = async () => {
    await ConsultaStorage.remove(deletingId);
    setShowConfirm(false);
    setDeletingId(null);
    carregarDados();
  };

  const renderConsulta = ({ item }) => {
    const foto = getFotoIdoso(item.idosoId);
    const data = new Date(item.dataHoraISO);
    const hoje = isHoje(item.dataHoraISO);
    const amanha = isAmanha(item.dataHoraISO);
    const passada = data < new Date();

    return (
      <View style={[styles.card, passada && styles.cardPassada]}>
        {/* Data */}
        <View style={[styles.dateBox, passada && styles.dateBoxPassada]}>
          <Text style={[styles.dateDay, passada && { color: Colors.outline }]}>
            {data.getDate()}
          </Text>
          <Text style={[styles.dateMonth, passada && { color: Colors.outline }]}>
            {data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
          </Text>
          <Text style={[styles.dateYear, passada && { color: Colors.outline }]}>
            {data.getFullYear()}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <View style={styles.badgesRow}>
            <Text style={styles.especialidade} numberOfLines={1}>
              {item.especialidade || 'Consulta Médica'}
            </Text>
            {hoje && <Badge label="Hoje" color={Colors.success} style={{ marginLeft: 6 }} />}
            {amanha && <Badge label="Amanhã" color={Colors.warning} style={{ marginLeft: 6 }} />}
            {passada && <Badge label="Realizada" color={Colors.outline} style={{ marginLeft: 6 }} />}
          </View>

          {/* Idoso */}
          <View style={styles.idosoRow}>
            {foto ? (
              <Image source={{ uri: foto }} style={styles.idosoFoto} />
            ) : (
              <View style={styles.idosoFotoPlaceholder}>
                <Text style={styles.idosoInitial}>{getNomeIdoso(item.idosoId).charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.idosoNome}>{getNomeIdoso(item.idosoId)}</Text>
          </View>

          {/* Hora */}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={13} color={Colors.outline} />
            <Text style={styles.infoText}> {item.horario}</Text>
          </View>

          {/* Médico */}
          {item.medico && (
            <View style={styles.infoRow}>
              <Ionicons name="person-circle-outline" size={13} color={Colors.outline} />
              <Text style={styles.infoText} numberOfLines={1}> {item.medico}</Text>
            </View>
          )}

          {/* Local */}
          {item.local && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={13} color={Colors.outline} />
              <Text style={styles.infoText} numberOfLines={1}> {item.local}</Text>
            </View>
          )}

          {item.observacoes ? (
            <Text style={styles.obsText} numberOfLines={1}>{item.observacoes}</Text>
          ) : null}
        </View>

        {/* Ações */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ConsultaForm', { consultaId: item.id })}
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
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Consultas Médicas"
        subtitle={`${consultasFiltradas.length} consulta${consultasFiltradas.length !== 1 ? 's' : ''}`}
      />

      {/* Busca */}
      <View style={styles.buscaContainer}>
        <Ionicons name="search-outline" size={20} color={Colors.outline} style={styles.buscaIcon} />
        <TextInput
          style={styles.buscaInput}
          placeholder="Buscar por especialidade, médico, local..."
          placeholderTextColor={Colors.outline}
          value={busca}
          onChangeText={setBusca}
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => setBusca('')}>
            <Ionicons name="close-circle" size={20} color={Colors.outline} />
          </TouchableOpacity>
        )}
      </View>

      {/* Abas */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, aba === 'proximas' && styles.tabActive]}
          onPress={() => setAba('proximas')}
        >
          <Text style={[styles.tabText, aba === 'proximas' && styles.tabTextActive]}>
            Próximas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, aba === 'todas' && styles.tabActive]}
          onPress={() => setAba('todas')}
        >
          <Text style={[styles.tabText, aba === 'todas' && styles.tabTextActive]}>
            Todas ({consultas.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={consultasFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={renderConsulta}
        contentContainerStyle={[
          styles.list,
          consultasFiltradas.length === 0 && { flex: 1, justifyContent: 'center' },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={busca ? 'Nenhum resultado encontrado' : 'Nenhuma consulta'}
            subtitle={busca ? `Nenhuma consulta com "${busca}"` : 'Agende consultas para receber lembretes 24h antes'}
            action={busca ? () => setBusca('') : () => navigation.navigate('ConsultaForm')}
            actionLabel={busca ? 'Limpar busca' : 'Agendar consulta'}
          />
        }
      />

      <FAB icon="add" label="Nova Consulta" onPress={() => navigation.navigate('ConsultaForm')} />

      <ConfirmModal
        visible={showConfirm}
        title="Excluir Consulta"
        message="Deseja remover esta consulta? O lembrete associado também será cancelado."
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

  buscaContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md, marginVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, height: 48,
  },
  buscaIcon: { marginRight: Spacing.sm },
  buscaInput: { flex: 1, ...Typography.bodyMedium, color: Colors.onSurface },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
  },
  tab: {
    flex: 1, paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { ...Typography.labelLarge, color: Colors.onSurfaceVariant },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },

  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Elevation.level2,
  },
  cardPassada: { opacity: 0.7 },

  dateBox: {
    width: 56, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.md, padding: Spacing.sm,
  },
  dateBoxPassada: { backgroundColor: Colors.surfaceVariant },
  dateDay: { ...Typography.titleLarge, color: Colors.primary, fontWeight: '900' },
  dateMonth: { ...Typography.labelSmall, color: Colors.primary, textTransform: 'uppercase' },
  dateYear: { ...Typography.labelSmall, color: Colors.primary },

  badgesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  especialidade: { ...Typography.titleSmall, color: Colors.onSurface, fontWeight: '700' },

  idosoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  idosoFoto: { width: 20, height: 20, borderRadius: 10 },
  idosoFotoPlaceholder: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  idosoInitial: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
  idosoNome: { ...Typography.labelMedium, color: Colors.outline, marginLeft: 6 },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  infoText: { ...Typography.labelSmall, color: Colors.outline },
  obsText: { ...Typography.labelSmall, color: Colors.outline, marginTop: 4 },

  actions: { alignItems: 'center', justifyContent: 'center' },
  actionBtn: { padding: 6 },
});
