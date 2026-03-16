// ============================================================
// CONFIGURACOES SCREEN - LIA App
// Tela de configurações com backup, importar e preferências
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme';
import { Card, ScreenHeader, ConfirmModal } from '../components';
import { exportarBackup, importarBackup, obterInfoDados } from '../services/backup';
import { cancelarTodosAlarmes, enviarNotificacaoTeste } from '../services/notifications';
import { clearAll } from '../storage';

export default function ConfiguracoesScreen({ navigation }) {
  const [info, setInfo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [showConfirmLimpar, setShowConfirmLimpar] = useState(false);
  const [showConfirmImportar, setShowConfirmImportar] = useState(false);
  const [arquivoImportar, setArquivoImportar] = useState(null);

  useEffect(() => {
    carregarInfo();
  }, []);

  const carregarInfo = async () => {
    const dados = await obterInfoDados();
    setInfo(dados);
  };

  // ── Exportar backup ───────────────────────────────────────
  const handleExportar = async () => {
    setCarregando(true);
    try {
      const sucesso = await exportarBackup();
      if (sucesso) {
        Alert.alert(
          '✅ Backup exportado!',
          'Salve o arquivo em um local seguro como Google Drive, WhatsApp ou email.'
        );
      }
    } finally {
      setCarregando(false);
    }
  };

  // ── Selecionar arquivo para importar ─────────────────────
  const handleSelecionarArquivo = async () => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (resultado.canceled) return;

      const arquivo = resultado.assets[0];

      // Verificar extensão
      if (!arquivo.name.endsWith('.json')) {
        Alert.alert('Arquivo inválido', 'Selecione um arquivo .json de backup do LIA.');
        return;
      }

      setArquivoImportar(arquivo);
      setShowConfirmImportar(true);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo.');
    }
  };

  // ── Confirmar importação ──────────────────────────────────
  const handleImportar = async () => {
    if (!arquivoImportar) return;
    setShowConfirmImportar(false);
    setCarregando(true);
    try {
      await importarBackup(arquivoImportar.uri);
      carregarInfo();
    } finally {
      setCarregando(false);
      setArquivoImportar(null);
    }
  };

  // ── Teste de notificação ──────────────────────────────────
  const handleTesteNotificacao = async () => {
    await enviarNotificacaoTeste();
    Alert.alert(
      '🔔 Teste enviado!',
      'Uma notificação de teste será exibida em 2 segundos.'
    );
  };

  // ── Limpar todos os dados ─────────────────────────────────
  const handleLimparDados = async () => {
    setShowConfirmLimpar(false);
    setCarregando(true);
    try {
      await cancelarTodosAlarmes();
      await clearAll();
      Alert.alert(
        '✅ Dados removidos',
        'Todos os dados foram apagados com sucesso.',
        [{ text: 'OK', onPress: () => navigation.navigate('Tabs') }]
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Configurações"
        subtitle="Backup e preferências"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Resumo dos dados */}
        {info && (
          <Card style={styles.infoCard}>
            <Text style={styles.cardTitle}>📊 Dados Armazenados</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoValor}>{info.totalIdosos}</Text>
                <Text style={styles.infoLabel}>Idosos</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoValor}>{info.totalMedicamentos}</Text>
                <Text style={styles.infoLabel}>Remédios</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoValor}>{info.totalConsultas}</Text>
                <Text style={styles.infoLabel}>Consultas</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoValor}>{info.totalReceitas}</Text>
                <Text style={styles.infoLabel}>Receitas</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Backup */}
        <Card>
          <Text style={styles.cardTitle}>💾 Backup dos Dados</Text>
          <Text style={styles.cardDesc}>
            Faça backup regularmente para não perder os dados se trocar de celular ou reinstalar o app.
          </Text>

          {/* Exportar */}
          <TouchableOpacity
            style={styles.opcaoBtn}
            onPress={handleExportar}
            disabled={carregando}
          >
            <View style={[styles.opcaoIconBox, { backgroundColor: Colors.primaryContainer }]}>
              <Ionicons name="cloud-upload-outline" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.opcaoTitulo}>Exportar Backup</Text>
              <Text style={styles.opcaoDesc}>
                Salvar todos os dados em arquivo JSON
              </Text>
            </View>
            {carregando ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
            )}
          </TouchableOpacity>

          <View style={styles.divisor} />

          {/* Importar */}
          <TouchableOpacity
            style={styles.opcaoBtn}
            onPress={handleSelecionarArquivo}
            disabled={carregando}
          >
            <View style={[styles.opcaoIconBox, { backgroundColor: Colors.secondaryContainer }]}>
              <Ionicons name="cloud-download-outline" size={24} color={Colors.secondary} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.opcaoTitulo}>Importar Backup</Text>
              <Text style={styles.opcaoDesc}>
                Restaurar dados de um arquivo JSON
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
          </TouchableOpacity>

          {/* Aviso */}
          <View style={styles.avisoBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.avisoText}>
              Recomendado: exporte o backup semanalmente e salve no Google Drive ou WhatsApp para si mesmo.
            </Text>
          </View>
        </Card>

        {/* Notificações */}
        <Card>
          <Text style={styles.cardTitle}>🔔 Notificações e Alarmes</Text>

          <TouchableOpacity
            style={styles.opcaoBtn}
            onPress={handleTesteNotificacao}
          >
            <View style={[styles.opcaoIconBox, { backgroundColor: Colors.tertiaryContainer }]}>
              <Ionicons name="notifications-outline" size={24} color={Colors.tertiary} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.opcaoTitulo}>Testar Notificação</Text>
              <Text style={styles.opcaoDesc}>
                Enviar notificação de teste em 2 segundos
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
          </TouchableOpacity>

          <View style={styles.divisor} />

          <TouchableOpacity
            style={styles.opcaoBtn}
            onPress={() => {
              Alert.alert(
                'Cancelar todos os alarmes?',
                'Isso vai cancelar TODOS os alarmes de medicamentos. Você precisará reabrir cada medicamento para reativar.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Cancelar alarmes',
                    style: 'destructive',
                    onPress: async () => {
                      await cancelarTodosAlarmes();
                      Alert.alert('✅ Feito', 'Todos os alarmes foram cancelados.');
                    },
                  },
                ]
              );
            }}
          >
            <View style={[styles.opcaoIconBox, { backgroundColor: Colors.errorContainer }]}>
              <Ionicons name="alarm-outline" size={24} color={Colors.error} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={[styles.opcaoTitulo, { color: Colors.error }]}>
                Cancelar Todos os Alarmes
              </Text>
              <Text style={styles.opcaoDesc}>
                Desativar todos os alarmes de medicamentos
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
          </TouchableOpacity>
        </Card>

        {/* Sobre o app */}
        <Card style={styles.sobreCard}>
          <View style={styles.sobreRow}>
            <View style={styles.liaLogo}>
              <Text style={styles.liaLogoText}>LIA</Text>
            </View>
            <View style={{ marginLeft: Spacing.md }}>
              <Text style={styles.sobreTitulo}>LIA — Assistente de Cuidado</Text>
              <Text style={styles.sobreVersao}>Versão 1.0.0</Text>
              <Text style={styles.sobreDesc}>
                Desenvolvido com ❤️ para cuidadores de idosos
              </Text>
            </View>
          </View>
        </Card>

        {/* Zona de perigo */}
        <Card style={styles.perigoCard}>
          <Text style={[styles.cardTitle, { color: Colors.error }]}>
            ⚠️ Zona de Perigo
          </Text>
          <Text style={styles.cardDesc}>
            Estas ações são irreversíveis. Faça um backup antes de prosseguir.
          </Text>

          <TouchableOpacity
            style={styles.btnPerigo}
            onPress={() => setShowConfirmLimpar(true)}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.onError} />
            <Text style={styles.btnPerigoText}>Apagar Todos os Dados</Text>
          </TouchableOpacity>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal confirmar importar */}
      <ConfirmModal
        visible={showConfirmImportar}
        title="Importar Backup"
        message={`Isso substituirá TODOS os dados atuais pelos dados do arquivo:\n\n"${arquivoImportar?.name}"\n\nEsta ação não pode ser desfeita. Deseja continuar?`}
        onConfirm={handleImportar}
        onCancel={() => {
          setShowConfirmImportar(false);
          setArquivoImportar(null);
        }}
        confirmLabel="Importar"
        confirmColor={Colors.primary}
      />

      {/* Modal confirmar limpar */}
      <ConfirmModal
        visible={showConfirmLimpar}
        title="Apagar Todos os Dados"
        message="Todos os idosos, medicamentos, consultas e receitas serão removidos permanentemente. Esta ação NÃO pode ser desfeita. Tem certeza?"
        onConfirm={handleLimparDados}
        onCancel={() => setShowConfirmLimpar(false)}
        confirmLabel="Apagar tudo"
        confirmColor={Colors.error}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md },

  cardTitle: {
    ...Typography.titleMedium,
    color: Colors.onSurface, fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  cardDesc: {
    ...Typography.bodySmall,
    color: Colors.outline,
    marginBottom: Spacing.md, lineHeight: 20,
  },

  // Info card
  infoCard: { backgroundColor: Colors.primaryContainer },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.sm,
  },
  infoItem: { alignItems: 'center' },
  infoValor: {
    ...Typography.headlineSmall,
    color: Colors.primary, fontWeight: '900',
  },
  infoLabel: {
    ...Typography.labelSmall,
    color: Colors.onPrimaryContainer,
  },

  // Opção
  opcaoBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  opcaoIconBox: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  opcaoTitulo: {
    ...Typography.titleSmall,
    color: Colors.onSurface, fontWeight: '600',
  },
  opcaoDesc: {
    ...Typography.bodySmall,
    color: Colors.outline, marginTop: 2,
  },
  divisor: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: Spacing.sm,
  },

  // Aviso
  avisoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  avisoText: {
    ...Typography.bodySmall,
    color: Colors.onPrimaryContainer,
    marginLeft: Spacing.sm, flex: 1, lineHeight: 18,
  },

  // Sobre
  sobreCard: { backgroundColor: Colors.primaryContainer },
  sobreRow: { flexDirection: 'row', alignItems: 'center' },
  liaLogo: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  liaLogoText: {
    ...Typography.titleLarge,
    color: Colors.onPrimary, fontWeight: '900',
  },
  sobreTitulo: {
    ...Typography.titleSmall,
    color: Colors.onPrimaryContainer, fontWeight: '700',
  },
  sobreVersao: {
    ...Typography.labelSmall,
    color: Colors.primary, marginTop: 2,
  },
  sobreDesc: {
    ...Typography.bodySmall,
    color: Colors.onPrimaryContainer, marginTop: 2,
  },

  // Perigo
  perigoCard: { borderWidth: 1, borderColor: Colors.error + '44' },
  btnPerigo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    paddingVertical: 14, paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  btnPerigoText: {
    ...Typography.labelLarge,
    color: Colors.onError, fontWeight: '700',
    marginLeft: Spacing.sm,
  },
});
