// ============================================================
// BACKUP SERVICE - LIA App
// Exportar e importar todos os dados do app em JSON
// Permite transferir dados entre celulares sem perder nada
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

// Chaves do AsyncStorage
const CHAVES = [
  '@lia_cuidadores',
  '@lia_idosos',
  '@lia_consultas',
  '@lia_medicamentos',
  '@lia_receitas',
  '@lia_historico',
  '@lia_medicamentos_tomados',
];

// ── Exportar backup ─────────────────────────────────────────
/**
 * Exporta todos os dados do app em um arquivo JSON
 * e abre o compartilhamento do Android para salvar/enviar
 */
export const exportarBackup = async () => {
  try {
    // Coletar todos os dados
    const dados = {};
    for (const chave of CHAVES) {
      const valor = await AsyncStorage.getItem(chave);
      if (valor) dados[chave] = JSON.parse(valor);
    }

    // Criar objeto de backup com metadados
    const backup = {
      versao: '1.0.0',
      app: 'LIA',
      dataBackup: new Date().toISOString(),
      totalIdosos: dados['@lia_idosos']?.length || 0,
      totalMedicamentos: dados['@lia_medicamentos']?.length || 0,
      totalConsultas: dados['@lia_consultas']?.length || 0,
      totalReceitas: dados['@lia_receitas']?.length || 0,
      dados,
    };

    // Gerar nome do arquivo com data
    const dataFormatada = new Date()
      .toLocaleDateString('pt-BR')
      .replace(/\//g, '-');
    const nomeArquivo = `LIA_backup_${dataFormatada}.json`;
    const caminhoArquivo = `${FileSystem.documentDirectory}${nomeArquivo}`;

    // Salvar arquivo JSON
    await FileSystem.writeAsStringAsync(
      caminhoArquivo,
      JSON.stringify(backup, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    // Verificar se compartilhamento está disponível
    const disponivel = await Sharing.isAvailableAsync();
    if (!disponivel) {
      Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo.');
      return false;
    }

    // Abrir menu de compartilhamento
    await Sharing.shareAsync(caminhoArquivo, {
      mimeType: 'application/json',
      dialogTitle: 'Salvar backup do LIA',
      UTI: 'public.json',
    });

    return true;
  } catch (error) {
    console.error('[Backup] Erro ao exportar:', error);
    Alert.alert('Erro', 'Não foi possível exportar o backup.');
    return false;
  }
};

// ── Importar backup ─────────────────────────────────────────
/**
 * Importa dados de um arquivo JSON de backup
 * Substitui TODOS os dados atuais pelos do backup
 *
 * @param {string} uri - URI do arquivo de backup selecionado
 */
export const importarBackup = async (uri) => {
  try {
    // Ler arquivo
    const conteudo = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const backup = JSON.parse(conteudo);

    // Validar formato do arquivo
    if (!backup.app || backup.app !== 'LIA' || !backup.dados) {
      Alert.alert(
        'Arquivo inválido',
        'Este arquivo não é um backup válido do LIA.'
      );
      return false;
    }

    // Restaurar cada chave
    for (const [chave, valor] of Object.entries(backup.dados)) {
      await AsyncStorage.setItem(chave, JSON.stringify(valor));
    }

    Alert.alert(
      '✅ Backup restaurado!',
      `Dados importados com sucesso!\n\n` +
      `📅 Backup de: ${new Date(backup.dataBackup).toLocaleDateString('pt-BR')}\n` +
      `👥 ${backup.totalIdosos} idoso(s)\n` +
      `💊 ${backup.totalMedicamentos} medicamento(s)\n` +
      `📅 ${backup.totalConsultas} consulta(s)\n` +
      `📄 ${backup.totalReceitas} receita(s)`,
      [{ text: 'OK' }]
    );

    return true;
  } catch (error) {
    console.error('[Backup] Erro ao importar:', error);
    Alert.alert(
      'Erro',
      'Não foi possível importar o backup. Verifique se o arquivo é válido.'
    );
    return false;
  }
};

// ── Informações do backup atual ─────────────────────────────
export const obterInfoDados = async () => {
  try {
    const idosos = JSON.parse(await AsyncStorage.getItem('@lia_idosos') || '[]');
    const medicamentos = JSON.parse(await AsyncStorage.getItem('@lia_medicamentos') || '[]');
    const consultas = JSON.parse(await AsyncStorage.getItem('@lia_consultas') || '[]');
    const receitas = JSON.parse(await AsyncStorage.getItem('@lia_receitas') || '[]');

    return {
      totalIdosos: idosos.length,
      totalMedicamentos: medicamentos.length,
      totalConsultas: consultas.length,
      totalReceitas: receitas.length,
    };
  } catch {
    return { totalIdosos: 0, totalMedicamentos: 0, totalConsultas: 0, totalReceitas: 0 };
  }
};
