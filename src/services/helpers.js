// ============================================================
// HELPERS / UTILITÁRIOS - LIA App
// ============================================================

/**
 * Calcula o IMC e retorna objeto com valor e classificação
 * @param {number} peso - em kg
 * @param {number} altura - em metros (ex: 1.70)
 * @returns {{ valor: number, classificacao: string, cor: string }}
 */
export const calcularIMC = (peso, altura) => {
  if (!peso || !altura || altura === 0) return null;
  const alturaM = altura > 3 ? altura / 100 : altura; // aceita cm ou m
  const imc = peso / (alturaM * alturaM);
  const valor = Math.round(imc * 10) / 10;

  let classificacao, cor;
  if (imc < 18.5) {
    classificacao = 'Abaixo do peso';
    cor = '#3B82F6';
  } else if (imc < 25) {
    classificacao = 'Peso normal';
    cor = '#059669';
  } else if (imc < 30) {
    classificacao = 'Sobrepeso';
    cor = '#F59E0B';
  } else if (imc < 35) {
    classificacao = 'Obesidade grau I';
    cor = '#F97316';
  } else if (imc < 40) {
    classificacao = 'Obesidade grau II';
    cor = '#EF4444';
  } else {
    classificacao = 'Obesidade grau III';
    cor = '#991B1B';
  }

  return { valor, classificacao, cor };
};

/**
 * Formata data ISO para DD/MM/AAAA
 */
export const formatarData = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch {
    return isoString;
  }
};

/**
 * Formata data ISO para DD/MM/AAAA HH:mm
 */
export const formatarDataHora = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    const ano = d.getFullYear();
    const hora = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
  } catch {
    return isoString;
  }
};

/**
 * Converte string DD/MM/AAAA para objeto Date
 */
export const parseData = (str) => {
  if (!str) return null;
  const [dia, mes, ano] = str.split('/');
  if (!dia || !mes || !ano) return null;
  return new Date(Number(ano), Number(mes) - 1, Number(dia));
};

/**
 * Converte string DD/MM/AAAA HH:mm para ISO
 */
export const parseDataHoraISO = (data, hora) => {
  try {
    const [dia, mes, ano] = data.split('/');
    const [h, m] = hora.split(':');
    const d = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(h), Number(m));
    return d.toISOString();
  } catch {
    return null;
  }
};

/**
 * Calcula a idade a partir da data de nascimento (DD/MM/AAAA)
 */
export const calcularIdade = (dataNasc) => {
  if (!dataNasc) return null;
  const nasc = parseData(dataNasc);
  if (!nasc) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
};

/**
 * Valida formato DD/MM/AAAA
 */
export const validarData = (str) => {
  if (!str) return false;
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!regex.test(str)) return false;
  const [, d, m, y] = str.match(regex);
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return (
    date.getFullYear() === Number(y) &&
    date.getMonth() === Number(m) - 1 &&
    date.getDate() === Number(d)
  );
};

/**
 * Máscara para campo de data: transforma "01122000" em "01/12/2000"
 */
export const mascaraData = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/**
 * Máscara para hora HH:mm
 */
export const mascaraHora = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

/**
 * Pluraliza palavra conforme quantidade
 */
export const pluralizar = (n, singular, plural) =>
  `${n} ${n === 1 ? singular : plural}`;

/**
 * Trunca texto
 */
export const truncar = (str, max = 30) => {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
};

/**
 * Converte bytes para string legível
 */
export const formatarBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Lista de doenças crônicas comuns para seleção */
export const DOENCAS_CRONICAS = [
  'Hipertensão Arterial',
  'Diabetes Mellitus tipo 1',
  'Diabetes Mellitus tipo 2',
  'Insuficiência Cardíaca',
  'Doença Coronariana',
  'Fibrilação Atrial',
  'AVC / Sequelas de AVC',
  'Doença de Parkinson',
  'Alzheimer / Demência',
  'DPOC / Enfisema',
  'Asma',
  'Osteoporose',
  'Artrite / Artrose',
  'Insuficiência Renal',
  'Hipotireoidismo',
  'Hipertireoidismo',
  'Depressão',
  'Ansiedade',
  'Glaucoma',
  'Catarata',
  'Câncer (especificar nas obs.)',
  'Outras',
];
