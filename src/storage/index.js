// ============================================================
// STORAGE SERVICE - LIA App
// Gerenciamento de dados com AsyncStorage
// Preparado para futura migração para SQLite / Cloud
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// Chaves de armazenamento
const KEYS = {
  CUIDADORES: '@lia_cuidadores',
  IDOSOS: '@lia_idosos',
  CONSULTAS: '@lia_consultas',
  MEDICAMENTOS: '@lia_medicamentos',
  RECEITAS: '@lia_receitas',
  HISTORICO: '@lia_historico',
};

// ── Utilitários genéricos ──────────────────────────────────

/** Lê e faz parse de uma chave; retorna [] em caso de falha */
const getList = async (key) => {
  try {
    const json = await AsyncStorage.getItem(key);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error(`[Storage] getList(${key}) error:`, e);
    return [];
  }
};

/** Persiste uma lista como JSON */
const setList = async (key, list) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error(`[Storage] setList(${key}) error:`, e);
    return false;
  }
};

/** Gera um ID único baseado em timestamp + random */
export const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ── CUIDADORES ─────────────────────────────────────────────

export const CuidadorStorage = {
  /** Retorna lista de cuidadores */
  getAll: () => getList(KEYS.CUIDADORES),

  /** Salva novo cuidador */
  add: async (cuidador) => {
    const list = await getList(KEYS.CUIDADORES);
    const novo = { ...cuidador, id: generateId(), criadoEm: new Date().toISOString() };
    list.push(novo);
    await setList(KEYS.CUIDADORES, list);
    return novo;
  },

  /** Atualiza cuidador existente */
  update: async (id, dados) => {
    const list = await getList(KEYS.CUIDADORES);
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...dados, atualizadoEm: new Date().toISOString() };
    return setList(KEYS.CUIDADORES, list);
  },

  /** Remove cuidador */
  remove: async (id) => {
    const list = await getList(KEYS.CUIDADORES);
    return setList(KEYS.CUIDADORES, list.filter((c) => c.id !== id));
  },

  /** Busca cuidador por ID */
  getById: async (id) => {
    const list = await getList(KEYS.CUIDADORES);
    return list.find((c) => c.id === id) || null;
  },
};

// ── IDOSOS ─────────────────────────────────────────────────

export const IdosoStorage = {
  getAll: () => getList(KEYS.IDOSOS),

  add: async (idoso) => {
    const list = await getList(KEYS.IDOSOS);
    const novo = { ...idoso, id: generateId(), criadoEm: new Date().toISOString() };
    list.push(novo);
    await setList(KEYS.IDOSOS, list);
    return novo;
  },

  update: async (id, dados) => {
    const list = await getList(KEYS.IDOSOS);
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...dados, atualizadoEm: new Date().toISOString() };
    return setList(KEYS.IDOSOS, list);
  },

  remove: async (id) => {
    const list = await getList(KEYS.IDOSOS);
    return setList(KEYS.IDOSOS, list.filter((i) => i.id !== id));
  },

  getById: async (id) => {
    const list = await getList(KEYS.IDOSOS);
    return list.find((i) => i.id === id) || null;
  },
};

// ── CONSULTAS ──────────────────────────────────────────────

export const ConsultaStorage = {
  getAll: () => getList(KEYS.CONSULTAS),

  /** Retorna consultas de um idoso específico */
  getByIdoso: async (idosoId) => {
    const list = await getList(KEYS.CONSULTAS);
    return list.filter((c) => c.idosoId === idosoId);
  },

  /** Retorna próximas consultas (a partir de hoje) ordenadas por data */
  getProximas: async () => {
    const list = await getList(KEYS.CONSULTAS);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return list
      .filter((c) => new Date(c.dataHoraISO) >= hoje)
      .sort((a, b) => new Date(a.dataHoraISO) - new Date(b.dataHoraISO));
  },

  /** Retorna consultas do dia seguinte (para alertas) */
  getAmanha: async () => {
    const list = await getList(KEYS.CONSULTAS);
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(0, 0, 0, 0);
    const fim = new Date(amanha);
    fim.setHours(23, 59, 59, 999);
    return list.filter((c) => {
      const d = new Date(c.dataHoraISO);
      return d >= amanha && d <= fim;
    });
  },

  add: async (consulta) => {
    const list = await getList(KEYS.CONSULTAS);
    const nova = { ...consulta, id: generateId(), criadoEm: new Date().toISOString() };
    list.push(nova);
    await setList(KEYS.CONSULTAS, list);
    return nova;
  },

  update: async (id, dados) => {
    const list = await getList(KEYS.CONSULTAS);
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...dados, atualizadoEm: new Date().toISOString() };
    return setList(KEYS.CONSULTAS, list);
  },

  remove: async (id) => {
    const list = await getList(KEYS.CONSULTAS);
    return setList(KEYS.CONSULTAS, list.filter((c) => c.id !== id));
  },
};

// ── MEDICAMENTOS ───────────────────────────────────────────

export const MedicamentoStorage = {
  getAll: () => getList(KEYS.MEDICAMENTOS),

  getByIdoso: async (idosoId) => {
    const list = await getList(KEYS.MEDICAMENTOS);
    return list.filter((m) => m.idosoId === idosoId);
  },

  /** Retorna medicamentos de hoje para todos os idosos */
  getHoje: async () => {
    const list = await getList(KEYS.MEDICAMENTOS);
    return list.filter((m) => m.ativo !== false);
  },

  add: async (medicamento) => {
    const list = await getList(KEYS.MEDICAMENTOS);
    const novo = {
      ...medicamento,
      id: generateId(),
      ativo: true,
      criadoEm: new Date().toISOString(),
    };
    list.push(novo);
    await setList(KEYS.MEDICAMENTOS, list);
    return novo;
  },

  update: async (id, dados) => {
    const list = await getList(KEYS.MEDICAMENTOS);
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...dados, atualizadoEm: new Date().toISOString() };
    return setList(KEYS.MEDICAMENTOS, list);
  },

  remove: async (id) => {
    const list = await getList(KEYS.MEDICAMENTOS);
    return setList(KEYS.MEDICAMENTOS, list.filter((m) => m.id !== id));
  },
};

// ── RECEITAS ───────────────────────────────────────────────

export const ReceitaStorage = {
  getAll: () => getList(KEYS.RECEITAS),

  getByIdoso: async (idosoId) => {
    const list = await getList(KEYS.RECEITAS);
    return list
      .filter((r) => r.idosoId === idosoId)
      .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  },

  add: async (receita) => {
    const list = await getList(KEYS.RECEITAS);
    const nova = { ...receita, id: generateId(), criadoEm: new Date().toISOString() };
    list.push(nova);
    await setList(KEYS.RECEITAS, list);
    return nova;
  },

  remove: async (id) => {
    const list = await getList(KEYS.RECEITAS);
    return setList(KEYS.RECEITAS, list.filter((r) => r.id !== id));
  },
};

// ── HISTÓRICO ──────────────────────────────────────────────

export const HistoricoStorage = {
  getByIdoso: async (idosoId) => {
    const list = await getList(KEYS.HISTORICO);
    return list
      .filter((h) => h.idosoId === idosoId)
      .sort((a, b) => new Date(b.dataISO) - new Date(a.dataISO));
  },

  add: async (entry) => {
    const list = await getList(KEYS.HISTORICO);
    const nova = { ...entry, id: generateId(), dataISO: new Date().toISOString() };
    list.push(nova);
    return setList(KEYS.HISTORICO, list);
  },
};

// ── LIMPAR TODOS OS DADOS (debug / reset) ──────────────────

export const clearAll = async () => {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    return true;
  } catch (e) {
    return false;
  }
};
