// ============================================================
// MEDICAMENTOS SCREEN - LIA App
// Atualizado: botão Tomei direto na lista + navegação da notificação
// Fluxo: Notificação → MedicamentosScreen → Tocar horário → Sinalizar
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Image, TextInput, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme';
import { FAB, EmptyState, ConfirmModal, ScreenHeader } from '../components';
import { MedicamentoStorage, IdosoStorage } from '../storage';
import {
  marcarComoTomado, desmarcarTomado, getTomadosHoje
} from '../services/medicamentosTomados';
import {
  ordenarMedicamentosPorHorario, filtrarPorBusca, validarHorario
} from '../services/helpers';

export default function MedicamentosScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const [medicamentos, setMedicamentos] = useState([]);
  const [idosos, setIdosos] = useState([]);
  const [tomadosHoje, setTomadosHoje] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [filtroIdoso, setFiltroIdoso] = useState(null);
  const [busca, setBusca] = useState('');

  // ── Receber medicamentoId da notificação ───────────────
  const medicamentoIdFoco = route.params?.medicamentoId || null;

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  // ── Scroll automático para o medicamento da notificação ──
  useEffect(() => {
    if (medicamentoIdFoco) {
      // Limpar filtros para garantir que o medicamento apareça
      setFiltroIdoso(null);
      setBusca('');
    }
  }, [medicamentoIdFoco]);

  const carregarDados = async () => {
    const [meds, lista, tomados] = await Promise.all([
      MedicamentoStorage.getAll(),
      IdosoStorage.getAll(),
      getTomadosHoje(),
    ]);
    setMedicamentos(meds);
    setIdosos(lista);
    setTomadosHoje(tomados);
  };

  const getNomeIdoso = (id) => idosos.find((i) => i.id === id)?.nome || 'Desconhecido';
  const getFotoIdoso = (id) => idosos.find((i) => i.id === id)?.foto || null;

  // ── Verificar se horário foi tomado ────────────────────
  const isTomado = (medicamentoId, horario) => {
    const hoje = new Date().toISOString().split('T')[0];
    const chave = `${medicamentoId}_${hoje}_${horario}`;
    return tomadosHoje.some((t) => t.chave === chave);
  };

  // ── Marcar/desmarcar tomado ────────────────────────────
  const handleTomado = async (med, horario) => {
    const tomado = isTomado(med.id, horario);
    const nomeIdoso = getNomeIdoso(med.idosoId);

    if (tomado) {
      Alert.alert(
        'Desfazer?',
        `Desmarcar "${med.nome}" (${horario}) como tomado?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desmarcar',
            onPress: async () => {
              await desmarcarTomado(med.id, horario);
              await carregarDados();
            },
          },
        ]
      );
    } else {
      // Marcar como tomado
      await marcarComoTomado(med.id, horario, med.nome, nomeIdoso);

      // Dispensar notificações deste medicamento da barra
      try {
        const ativas = await Notifications.getPresentedNotificationsAsync();
        for (const n of ativas) {
          if (n.request.content.data?.medicamentoId === med.id) {
            await Notifications.dismissNotificationAsync(n.request.identifier);
          }
        }
      } catch (e) {}

      await carregarDados();

      Alert.alert(
        '✅ Registrado!',
        `${med.nome} (${horario}) marcado como tomado!\n👤 ${nomeIdoso}`,
        [{ text: 'OK' }]
      );
    }
  };

  // ── Filtrar e ordenar ──────────────────────────────────
  const medsFiltrados = (() => {
    let lista = filtroIdoso
      ? medicamentos.filter((m) => m.idosoId === filtroIdoso)
      : medicamentos;
    lista = filtrarPorBusca(lista, busca, ['nome', 'dose']);
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

  const getProximoHorario = (horarios) => {
    if (!horarios?.length) return null;
    const agora = new Date();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    const validos = horarios.filter(validarHorario);
    return validos.find((h) => {
      const [hr, min] = h.split(':').map(Number);
      return hr * 60 + min > horaAtual;
    }) || validos[0] || null;
  };

  // ── Render de cada medicamento ─────────────────────────
  const renderMed = ({ item }) => {
    const fotoIdoso = getFotoIdoso(item.idosoId);
    const proximoHorario = getProximoHorario(item.horarios);
    const isFoco = item.id === medicamentoIdFoco;

    // Verificar se algum horário está pendente hoje
    const temPendente = (item.horarios || []).some((h) => !isTomado(item.id, h));

    return (
      <View style={[
        styles.card,
        isFoco && styles.cardFoco, // Destaque se veio da notificação
        temPendente && styles.cardPendente,
      ]}>

        {/* ── Header do card ── */}
        <View style={styles.cardHeader}>
          <View style={[styles.medIconBox, !temPendente && styles.medIconBoxTomado]}>
            <Ionicons
              name="medical"
              size={24}
              color={temPendente ? Colors.secondary : Colors.success || '#059669'}
            />
          </View>

          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={styles.medNome}>{item.nome}</Text>
            <Text style={styles.medDose}>{item.dose}</Text>
            {proximoHorario && temPendente && (
              <View style={styles.proximoRow}>
                <Ionicons name="time" size={13} color={Colors.primary} />
                <Text style={styles.proximoText}> Próximo: {proximoHorario}</Text>
              </View>
            )}
            {!temPendente && (
              <View style={styles.proximoRow}>
                <Ionicons name="checkmark-circle" size={13} color="#059669" />
                <Text style={[styles.proximoText, { color: '#059669' }]}> Todos tomados hoje ✓</Text>
              </View>
            )}
          </View>

          <View style={styles.acoes}>
            <TouchableOpacity
              onPress={() => navigation.navigate('MedicamentoForm', {
                medicamentoId: item.id, idosoId: item.idosoId
              })}
              style={styles.acaoBtn}
            >
              <Ionicons name="pencil-outline" size={19} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => confirmarExclusao(item.id)}
              style={[styles.acaoBtn, { marginTop: 4 }]}
            >
              <Ionicons name="trash-outline" size={19} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Horários com botão TOMEI ── */}
        {item.horarios?.length > 0 && (
          <View style={styles.horariosSection}>
            <Text style={styles.horariosLabel}>
              Toque no horário para sinalizar o consumo:
            </Text>
            <View style={styles.horariosRow}>
              {item.horarios.map((h, i) => {
                const tomado = isTomado(item.id, h);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.horarioBotao,
                      tomado && styles.horarioBotaoTomado,
                      isFoco && !tomado && styles.horarioBotaoFoco,
                    ]}
                    onPress={() => handleTomado(item, h)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={tomado ? 'checkmark-circle' : 'time-outline'}
                      size={18}
                      color={tomado ? '#059669' : isFoco ? '#fff' : Colors.secondary}
                    />
                    <Text style={[
                      styles.horarioBotaoText,
                      tomado && styles.horarioBotaoTextTomado,
                      isFoco && !tomado && { color: '#fff' },
                    ]}>
                      {h}
                    </Text>
                    {tomado && (
                      <Text style={styles.tomadoTag}> ✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Footer: idoso + alarme ── */}
        <View style={styles.footer}>
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

        {/* Banner de destaque se veio da notificação */}
        {isFoco && (
          <View style={styles.focoBanner}>
            <Ionicons name="notifications" size={14} color="#fff" />
            <Text style={styles.focoBannerText}>
              Toque no horário acima para confirmar o consumo
            </Text>
          </View>
        )}
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
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => setBusca('')}>
            <Ionicons name="close-circle" size={20} color={Colors.outline} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtro por idoso */}
      {idosos.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtroRow}
        >
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
        </ScrollView>
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
            title={busca ? 'Nenhum resultado' : 'Nenhum medicamento'}
            subtitle={busca ? `Nenhum medicamento com "${busca}"` : 'Adicione medicamentos para acompanhar os horários'}
            action={busca ? () => setBusca('') : () => navigation.navigate('MedicamentoForm')}
            actionLabel={busca ? 'Limpar busca' : 'Adicionar medicamento'}
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

  filtroRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 6,
  },
  filtroBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  filtroBtnActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  filtroBtnText: { ...Typography.labelMedium, color: Colors.onSurfaceVariant },
  filtroBtnTextActive: { color: Colors.primary, fontWeight: '700' },

  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Elevation.level2,
  },
  cardPendente: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  cardFoco: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer + '22',
  },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  medIconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  medIconBoxTomado: {
    backgroundColor: '#D1FAE5',
  },
  medNome: { ...Typography.titleSmall, color: Colors.onSurface, fontWeight: '700' },
  medDose: { ...Typography.bodySmall, color: Colors.secondary, marginTop: 2 },
  proximoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  proximoText: { ...Typography.labelSmall, color: Colors.primary, fontWeight: '600' },

  acoes: { alignItems: 'center' },
  acaoBtn: { padding: 6 },

  // Horários
  horariosSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  horariosLabel: {
    ...Typography.labelSmall,
    color: Colors.outline,
    marginBottom: Spacing.sm,
  },
  horariosRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  horarioBotao: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondaryContainer,
    borderWidth: 2, borderColor: Colors.secondary,
    minHeight: 44,
    gap: 6,
  },
  horarioBotaoTomado: {
    backgroundColor: '#D1FAE5',
    borderColor: '#059669',
  },
  horarioBotaoFoco: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  horarioBotaoText: {
    ...Typography.labelLarge,
    color: Colors.secondary, fontWeight: '700',
  },
  horarioBotaoTextTomado: { color: '#059669' },
  tomadoTag: { ...Typography.labelSmall, color: '#059669', fontWeight: '700' },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
    gap: 6,
  },
  idosoFoto: { width: 24, height: 24, borderRadius: 12 },
  idosoFotoPlaceholder: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  idosoInitial: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  idosoNome: { ...Typography.labelMedium, color: Colors.outline, flex: 1 },
  alarmeBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full, gap: 3,
  },
  alarmeBadgeText: { ...Typography.labelSmall, color: Colors.secondary },

  // Banner de foco (veio da notificação)
  focoBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    gap: 6,
  },
  focoBannerText: {
    ...Typography.labelSmall,
    color: '#fff', fontWeight: '600', flex: 1,
  },
});
