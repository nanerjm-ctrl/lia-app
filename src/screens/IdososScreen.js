// ============================================================
// IDOSOS SCREEN - LIA App
// Lista e gerenciamento dos idosos cadastrados
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme';
import { FAB, EmptyState, Badge, ConfirmModal, ScreenHeader } from '../components';
import { IdosoStorage } from '../storage';
import { calcularIMC, calcularIdade } from '../services/helpers';

export default function IdososScreen() {
  const navigation = useNavigation();
  const [idosos, setIdosos] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      carregarIdosos();
    }, [])
  );

  const carregarIdosos = async () => {
    const lista = await IdosoStorage.getAll();
    setIdosos(lista);
  };

  const confirmarExclusao = (id) => {
    setDeletingId(id);
    setShowConfirm(true);
  };

  const excluir = async () => {
    if (!deletingId) return;
    await IdosoStorage.remove(deletingId);
    setShowConfirm(false);
    setDeletingId(null);
    carregarIdosos();
  };

  const renderIdoso = ({ item }) => {
    const imc = calcularIMC(item.peso, item.altura);
    const idade = calcularIdade(item.dataNasc);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('IdosoDetail', { idosoId: item.id })}
        activeOpacity={0.85}
      >
        {/* Foto */}
        {item.foto ? (
          <Image source={{ uri: item.foto }} style={styles.foto} />
        ) : (
          <View style={styles.fotoPlaceholder}>
            <Text style={styles.fotoInitial}>{item.nome.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        {/* Info */}
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={styles.nome}>{item.nome}</Text>
          {idade && (
            <Text style={styles.sub}>{idade} anos</Text>
          )}
          {item.dataNasc && (
            <Text style={styles.sub}>Nasc. {item.dataNasc}</Text>
          )}

          <View style={styles.badges}>
            {imc && (
              <Badge label={`IMC ${imc.valor}`} color={imc.cor} />
            )}
            {item.vidaAtiva && (
              <Badge label="Vida Ativa" color={Colors.success} style={{ marginLeft: 6 }} />
            )}
          </View>

          {item.doencas?.length > 0 && (
            <Text style={styles.doencaText} numberOfLines={1}>
              {item.doencas.slice(0, 2).join(' · ')}
              {item.doencas.length > 2 ? ` +${item.doencas.length - 2}` : ''}
            </Text>
          )}
        </View>

        {/* Ações */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('IdosoForm', { idosoId: item.id })}
            style={styles.actionBtn}
          >
            <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => confirmarExclusao(item.id)}
            style={[styles.actionBtn, { marginTop: 8 }]}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Meus Idosos"
        subtitle={`${idosos.length} cadastrado${idosos.length !== 1 ? 's' : ''}`}
      />

      <FlatList
        data={idosos}
        keyExtractor={(item) => item.id}
        renderItem={renderIdoso}
        contentContainerStyle={[
          styles.list,
          idosos.length === 0 && { flex: 1, justifyContent: 'center' },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Nenhum idoso cadastrado"
            subtitle="Adicione um idoso para começar a acompanhar o cuidado"
            action={() => navigation.navigate('IdosoForm')}
            actionLabel="Adicionar idoso"
          />
        }
      />

      <FAB
        icon="add"
        label="Novo Idoso"
        onPress={() => navigation.navigate('IdosoForm')}
      />

      <ConfirmModal
        visible={showConfirm}
        title="Excluir Idoso"
        message="Tem certeza? Todos os dados deste idoso serão removidos permanentemente."
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

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Elevation.level2,
  },
  foto: {
    width: 72, height: 72, borderRadius: 36,
  },
  fotoPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  fotoInitial: {
    ...Typography.headlineMedium,
    color: Colors.primary, fontWeight: '800',
  },
  nome: {
    ...Typography.titleMedium,
    color: Colors.onSurface, fontWeight: '700',
  },
  sub: {
    ...Typography.bodySmall,
    color: Colors.outline, marginTop: 2,
  },
  badges: {
    flexDirection: 'row', marginTop: Spacing.sm,
  },
  doencaText: {
    ...Typography.labelSmall,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  actions: {
    marginLeft: Spacing.sm, alignItems: 'center',
  },
  actionBtn: {
    padding: 8,
    borderRadius: BorderRadius.md,
  },
});
