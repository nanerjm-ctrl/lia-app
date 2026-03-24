// ============================================================
// TELA DE EMERGÊNCIA - LIA App
// Botões rápidos para SAMU, Bombeiros, Polícia
// + Contatos de emergência personalizados
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Alert, TextInput, Modal, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme';
import { ScreenHeader } from '../components';

const CHAVE_CONTATOS = '@lia_contatos_emergencia';

// ── Serviços de emergência fixos ────────────────────────────
const SERVICOS_EMERGENCIA = [
  {
    id: 'samu',
    nome: 'SAMU',
    numero: '192',
    descricao: 'Serviço de Atendimento Móvel de Urgência',
    icone: 'medical',
    cor: '#DC2626',
    corFundo: '#FEF2F2',
  },
  {
    id: 'bombeiros',
    nome: 'Bombeiros',
    numero: '193',
    descricao: 'Corpo de Bombeiros',
    icone: 'flame',
    cor: '#EA580C',
    corFundo: '#FFF7ED',
  },
  {
    id: 'policia',
    nome: 'Polícia',
    numero: '190',
    descricao: 'Polícia Militar',
    icone: 'shield',
    cor: '#1D4ED8',
    corFundo: '#EFF6FF',
  },
  {
    id: 'cvv',
    nome: 'CVV',
    numero: '188',
    descricao: 'Centro de Valorização da Vida',
    icone: 'heart',
    cor: '#7C3AED',
    corFundo: '#F5F3FF',
  },
];

export default function EmergenciaScreen({ navigation }) {
  const [contatos, setContatos] = useState([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [editando, setEditando] = useState(null);

  // Campos do formulário
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [relacao, setRelacao] = useState('');
  const [observacao, setObservacao] = useState('');

  useFocusEffect(
    useCallback(() => {
      carregarContatos();
    }, [])
  );

  const carregarContatos = async () => {
    try {
      const dados = await AsyncStorage.getItem(CHAVE_CONTATOS);
      setContatos(dados ? JSON.parse(dados) : []);
    } catch (e) {
      console.error('[Emergencia] Erro ao carregar:', e);
    }
  };

  // ── Ligar para número ───────────────────────────────────
  const ligar = (numero, nome) => {
    Alert.alert(
      `📞 Ligar para ${nome}`,
      `Deseja ligar para ${numero}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: `Ligar ${numero}`,
          style: 'destructive',
          onPress: () => Linking.openURL(`tel:${numero}`),
        },
      ]
    );
  };

  // ── Abrir modal de cadastro ─────────────────────────────
  const abrirModal = (contato = null) => {
    if (contato) {
      setEditando(contato.id);
      setNome(contato.nome);
      setNumero(contato.numero);
      setRelacao(contato.relacao || '');
      setObservacao(contato.observacao || '');
    } else {
      setEditando(null);
      setNome('');
      setNumero('');
      setRelacao('');
      setObservacao('');
    }
    setModalVisivel(true);
  };

  // ── Salvar contato ──────────────────────────────────────
  const salvarContato = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome do contato.');
      return;
    }
    if (!numero.trim()) {
      Alert.alert('Atenção', 'Informe o número de telefone.');
      return;
    }

    try {
      const listaAtual = [...contatos];

      if (editando) {
        const idx = listaAtual.findIndex((c) => c.id === editando);
        if (idx !== -1) {
          listaAtual[idx] = { ...listaAtual[idx], nome: nome.trim(), numero: numero.trim(), relacao: relacao.trim(), observacao: observacao.trim() };
        }
      } else {
        listaAtual.push({
          id: `contato_${Date.now()}`,
          nome: nome.trim(),
          numero: numero.trim(),
          relacao: relacao.trim(),
          observacao: observacao.trim(),
          criadoEm: new Date().toISOString(),
        });
      }

      await AsyncStorage.setItem(CHAVE_CONTATOS, JSON.stringify(listaAtual));
      setContatos(listaAtual);
      setModalVisivel(false);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o contato.');
    }
  };

  // ── Excluir contato ─────────────────────────────────────
  const excluirContato = (contato) => {
    Alert.alert(
      'Excluir contato',
      `Deseja remover "${contato.nome}" dos contatos de emergência?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const nova = contatos.filter((c) => c.id !== contato.id);
            await AsyncStorage.setItem(CHAVE_CONTATOS, JSON.stringify(nova));
            setContatos(nova);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Emergência"
        subtitle="Contatos e serviços de urgência"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Aviso de emergência ── */}
        <View style={styles.avisoBox}>
          <Ionicons name="warning" size={20} color="#DC2626" />
          <Text style={styles.avisoText}>
            Em caso de emergência, ligue imediatamente para os serviços abaixo.
            Informe o endereço completo e a condição do paciente.
          </Text>
        </View>

        {/* ── Serviços de emergência ── */}
        <Text style={styles.secaoTitulo}>🚨 Serviços de Emergência</Text>

        <View style={styles.servicosGrid}>
          {SERVICOS_EMERGENCIA.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.servicoCard, { backgroundColor: s.corFundo, borderColor: s.cor }]}
              onPress={() => ligar(s.numero, s.nome)}
              activeOpacity={0.8}
            >
              <View style={[styles.servicoIconBox, { backgroundColor: s.cor }]}>
                <Ionicons name={s.icone} size={28} color="#fff" />
              </View>
              <Text style={[styles.servicoNome, { color: s.cor }]}>{s.nome}</Text>
              <Text style={[styles.servicoNumero, { color: s.cor }]}>{s.numero}</Text>
              <Text style={styles.servicoDesc} numberOfLines={2}>{s.descricao}</Text>
              <View style={[styles.ligarBtn, { backgroundColor: s.cor }]}>
                <Ionicons name="call" size={14} color="#fff" />
                <Text style={styles.ligarBtnText}>Ligar agora</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Contatos personalizados ── */}
        <View style={styles.secaoHeader}>
          <Text style={styles.secaoTitulo}>📞 Contatos Pessoais</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => abrirModal()}
          >
            <Ionicons name="add-circle" size={20} color={Colors.primary} />
            <Text style={styles.addBtnText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {contatos.length === 0 ? (
          <View style={styles.emptyContatos}>
            <Ionicons name="people-outline" size={40} color={Colors.outline} />
            <Text style={styles.emptyContatosText}>
              Nenhum contato cadastrado
            </Text>
            <Text style={styles.emptyContatosSubText}>
              Adicione parentes, médicos ou ambulância do convênio
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => abrirModal()}
            >
              <Text style={styles.emptyAddBtnText}>+ Adicionar contato</Text>
            </TouchableOpacity>
          </View>
        ) : (
          contatos.map((contato) => (
            <View key={contato.id} style={styles.contatoCard}>
              <View style={styles.contatoIconBox}>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </View>

              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={styles.contatoNome}>{contato.nome}</Text>
                {contato.relacao ? (
                  <Text style={styles.contatoRelacao}>{contato.relacao}</Text>
                ) : null}
                <Text style={styles.contatoNumero}>{contato.numero}</Text>
                {contato.observacao ? (
                  <Text style={styles.contatoObs} numberOfLines={1}>
                    {contato.observacao}
                  </Text>
                ) : null}
              </View>

              <View style={styles.contatoAcoes}>
                {/* Ligar */}
                <TouchableOpacity
                  style={styles.contatoLigarBtn}
                  onPress={() => ligar(contato.numero, contato.nome)}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                </TouchableOpacity>

                {/* Editar */}
                <TouchableOpacity
                  style={styles.contatoEditBtn}
                  onPress={() => abrirModal(contato)}
                >
                  <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
                </TouchableOpacity>

                {/* Excluir */}
                <TouchableOpacity
                  style={styles.contatoExcluirBtn}
                  onPress={() => excluirContato(contato)}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Dicas */}
        <View style={styles.dicasBox}>
          <Text style={styles.dicasTitulo}>💡 Dicas em caso de emergência:</Text>
          <Text style={styles.dicaItem}>• Mantenha a calma e fale claramente</Text>
          <Text style={styles.dicaItem}>• Informe o endereço completo</Text>
          <Text style={styles.dicaItem}>• Descreva os sintomas do paciente</Text>
          <Text style={styles.dicaItem}>• Informe idade e medicamentos em uso</Text>
          <Text style={styles.dicaItem}>• Não desligue até receber orientação</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal de cadastro ── */}
      <Modal
        visible={modalVisivel}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>
                {editando ? 'Editar Contato' : 'Novo Contato de Emergência'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}>
                <Ionicons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Nome */}
              <Text style={styles.inputLabel}>Nome *</Text>
              <TextInput
                style={styles.input}
                value={nome}
                onChangeText={setNome}
                placeholder="Ex: Dr. João, Ambulância Unimed, Filha Maria..."
                placeholderTextColor={Colors.outline}
              />

              {/* Número */}
              <Text style={styles.inputLabel}>Telefone *</Text>
              <TextInput
                style={styles.input}
                value={numero}
                onChangeText={setNumero}
                placeholder="Ex: (11) 99999-9999"
                keyboardType="phone-pad"
                placeholderTextColor={Colors.outline}
              />

              {/* Relação */}
              <Text style={styles.inputLabel}>Relação / Tipo</Text>
              <TextInput
                style={styles.input}
                value={relacao}
                onChangeText={setRelacao}
                placeholder="Ex: Filho, Médico, Ambulância convênio..."
                placeholderTextColor={Colors.outline}
              />

              {/* Sugestões de relação */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: Spacing.md }}
              >
                {['Filho(a)', 'Médico', 'Ambulância', 'Vizinho', 'Parente', 'Enfermeiro(a)'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.sugestaoBtn,
                      relacao === r && styles.sugestaoBtnAtivo,
                    ]}
                    onPress={() => setRelacao(r)}
                  >
                    <Text style={[
                      styles.sugestaoBtnText,
                      relacao === r && styles.sugestaoBtnTextAtivo,
                    ]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Observação */}
              <Text style={styles.inputLabel}>Observação</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={observacao}
                onChangeText={setObservacao}
                placeholder="Informações adicionais..."
                multiline
                placeholderTextColor={Colors.outline}
              />

              {/* Botões */}
              <TouchableOpacity style={styles.salvarBtn} onPress={salvarContato}>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.salvarBtnText}>
                  {editando ? 'Atualizar Contato' : 'Salvar Contato'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelarBtn}
                onPress={() => setModalVisivel(false)}
              >
                <Text style={styles.cancelarBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md },

  // Aviso
  avisoBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: '#FECACA',
    gap: Spacing.sm,
  },
  avisoText: {
    ...Typography.bodySmall,
    color: '#DC2626',
    flex: 1, lineHeight: 20,
  },

  // Seções
  secaoTitulo: {
    ...Typography.titleMedium,
    color: Colors.onBackground,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  addBtnText: { ...Typography.labelMedium, color: Colors.primary, fontWeight: '700' },

  // Grid de serviços
  servicosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  servicoCard: {
    width: '47%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    ...Elevation.level1,
  },
  servicoIconBox: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  servicoNome: {
    ...Typography.titleMedium,
    fontWeight: '900',
  },
  servicoNumero: {
    fontSize: 28, fontWeight: '900',
    marginVertical: 4,
  },
  servicoDesc: {
    ...Typography.labelSmall,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  ligarBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 6, marginTop: 4,
  },
  ligarBtnText: {
    ...Typography.labelMedium,
    color: '#fff', fontWeight: '700',
  },

  // Contatos personalizados
  contatoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Elevation.level2,
  },
  contatoIconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  contatoNome: { ...Typography.titleSmall, color: Colors.onSurface, fontWeight: '700' },
  contatoRelacao: { ...Typography.labelSmall, color: Colors.primary, marginTop: 1 },
  contatoNumero: { ...Typography.bodyMedium, color: Colors.secondary, fontWeight: '600', marginTop: 2 },
  contatoObs: { ...Typography.labelSmall, color: Colors.outline, marginTop: 1 },
  contatoAcoes: { alignItems: 'center', gap: 4 },
  contatoLigarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },
  contatoEditBtn: { padding: 6 },
  contatoExcluirBtn: { padding: 6 },

  // Empty state
  emptyContatos: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    borderWidth: 2, borderStyle: 'dashed',
    borderColor: Colors.outlineVariant,
  },
  emptyContatosText: {
    ...Typography.titleSmall,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.md,
  },
  emptyContatosSubText: {
    ...Typography.bodySmall,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  emptyAddBtn: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  emptyAddBtnText: {
    ...Typography.labelLarge,
    color: Colors.primary, fontWeight: '700',
  },

  // Dicas
  dicasBox: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  dicasTitulo: {
    ...Typography.labelLarge,
    color: Colors.onSurfaceVariant,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  dicaItem: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitulo: {
    ...Typography.titleLarge,
    color: Colors.onBackground, fontWeight: '700',
  },
  inputLabel: {
    ...Typography.labelMedium,
    color: Colors.onSurface, fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  sugestaoBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    marginRight: 8, marginBottom: Spacing.md,
  },
  sugestaoBtnAtivo: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  sugestaoBtnText: { ...Typography.labelMedium, color: Colors.onSurfaceVariant },
  sugestaoBtnTextAtivo: { color: Colors.primary, fontWeight: '700' },
  salvarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 16, gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  salvarBtnText: { ...Typography.titleMedium, color: Colors.onPrimary, fontWeight: '700' },
  cancelarBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  cancelarBtnText: { ...Typography.labelLarge, color: Colors.outline },
});
