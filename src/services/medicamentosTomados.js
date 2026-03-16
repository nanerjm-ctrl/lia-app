// ============================================================
// MEDICAMENTOS TOMADOS - LIA App
// Registro de medicamentos tomados no dia (histórico de aderência)
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = '@lia_medicamentos_tomados';

/**
 * Gera chave única para um registro de medicamento tomado
 * Formato: medicamentoId_AAAA-MM-DD_HH:MM
 */
const gerarChaveRegistro = (medicamentoId, horario) => {
  const hoje = new Date().toISOString().split('T')[0];
  return `${medicamentoId}_${hoje}_${horario}`;
};

/**
 * Marca um medicamento como tomado
 */
export const marcarComoTomado = async (medicamentoId, horario, nomeMed, nomeIdoso) => {
  try {
    const lista = JSON.parse(await AsyncStorage.getItem(CHAVE) || '[]');
    const chave = gerarChaveRegistro(medicamentoId, horario);

    // Evitar duplicatas
    const jaExiste = lista.find((r) => r.chave === chave);
    if (jaExiste) return true;

    lista.push({
      chave,
      medicamentoId,
      horario,
      nomeMed,
      nomeIdoso,
      tomadoEm: new Date().toISOString(),
      data: new Date().toISOString().split('T')[0],
    });

    await AsyncStorage.setItem(CHAVE, JSON.stringify(lista));
    return true;
  } catch (error) {
    console.error('[Tomados] Erro ao marcar:', error);
    return false;
  }
};

/**
 * Verifica se um medicamento já foi tomado hoje em determinado horário
 */
export const jaFoiTomado = async (medicamentoId, horario) => {
  try {
    const lista = JSON.parse(await AsyncStorage.getItem(CHAVE) || '[]');
    const chave = gerarChaveRegistro(medicamentoId, horario);
    return lista.some((r) => r.chave === chave);
  } catch {
    return false;
  }
};

/**
 * Retorna todos os registros de hoje
 */
export const getTomadosHoje = async () => {
  try {
    const lista = JSON.parse(await AsyncStorage.getItem(CHAVE) || '[]');
    const hoje = new Date().toISOString().split('T')[0];
    return lista.filter((r) => r.data === hoje);
  } catch {
    return [];
  }
};

/**
 * Retorna histórico completo
 */
export const getHistorico = async (idosoId, medicamentoId) => {
  try {
    const lista = JSON.parse(await AsyncStorage.getItem(CHAVE) || '[]');
    return lista
      .filter((r) => !medicamentoId || r.medicamentoId === medicamentoId)
      .sort((a, b) => new Date(b.tomadoEm) - new Date(a.tomadoEm));
  } catch {
    return [];
  }
};

/**
 * Desmarca um medicamento como tomado (desfazer)
 */
export const desmarcarTomado = async (medicamentoId, horario) => {
  try {
    const lista = JSON.parse(await AsyncStorage.getItem(CHAVE) || '[]');
    const chave = gerarChaveRegistro(medicamentoId, horario);
    const nova = lista.filter((r) => r.chave !== chave);
    await AsyncStorage.setItem(CHAVE, JSON.stringify(nova));
    return true;
  } catch {
    return false;
  }
};
