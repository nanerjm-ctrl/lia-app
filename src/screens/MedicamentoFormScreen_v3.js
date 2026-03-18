// ============================================================
// MEDICAMENTO FORM SCREEN - LIA App v3
// Cadastro com alarmes inteligentes:
// - Uso contínuo (repete indefinidamente)
// - Tempo determinado (X dias e para automaticamente)
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  TouchableOpacity, Image, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { Card, Button, InputField, ScreenHeader } from '../components';
import { MedicamentoStorage, IdosoStorage } from '../storage';
import { mascaraHora, validarHorario } from '../services/helpers';
import {
  agendarAlarmesMedicamento,
  cancelarAlarmesMedicamento,
  requestPermissions,
} from '../services/alarmManager';

export default function MedicamentoFormScreen({ navigation, route }) {
  const { medicamentoId, idosoId: idosoIdParam } = route?.params || {};
  const isEdit = !!medicamentoId;

  // Dados básicos
  const [nome, setNome] = useState('');
  const [dose, setDose] = useState('');
  const [horarios, setHorarios] = useState(['']);
  const [idosoId, setIdosoId] = useState(idosoIdParam || '');
  const [foto, setFoto] = useState(null);
  const [observacoes, setObservacoes] = useState('');
  const [idosos, setIdosos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [errors, setErrors] = useState({});
  const [notifIdsAntigos, setNotifIdsAntigos] = useState([]);

  // Configurações de alarme
  const [alarmeAtivo, setAlarmeAtivo] = useState(true);
  const [usoContinuo, setUsoContinuo] = useState(true); // true = contínuo, false = X dias
  const [diasTratamento, setDiasTratamento] = useState('');

  useEffect(() => {
    requestPermissions();
    carregarIdosos();
    if (isEdit) carregarMedicamento();
  }, []);

  const carregarIdosos = async () => {
    const lista = await IdosoStorage.getAll();
    setIdosos(lista);
    if (lista.length === 1 && !idosoId) setIdosoId(lista[0].id);
  };

  const carregarMedicamento = async () => {
    const lista = await MedicamentoStorage.getAll();
    const med = lista.find((m) => m.id === medicamentoId);
    if (!med) return;
    setNome(med.nome || '');
    setDose(med.dose || '');
    setHorarios(med.horarios?.length ? med.horarios : ['']);
    setIdosoId(med.idosoId || '');
    setFoto(med.foto || null);
    setObservacoes(med.observacoes || '');
    setAlarmeAtivo(med.alarmeAtivo !== false);
    setUsoContinuo(med.usoContinuo !== false);
    setDiasTratamento(med.diasTratamento?.toString() || '');
    setNotifIdsAntigos(med.notifIds || []);
  };

  const adicionarHorario = () => {
    if (horarios.length < 6) setHorarios([...horarios, '']);
  };

  const atualizarHorario = (idx, val) => {
    const novo = [...horarios];
    novo[idx] = mascaraHora(val);
    setHorarios(novo);
  };

  const removerHorario = (idx) => {
    if (horarios.length === 1) return;
    setHorarios(horarios.filter((_, i) => i !== idx));
  };

  const selecionarFoto = async () => {
    Alert.alert('Foto da Receita', 'Como deseja escolher?', [
      {
        text: 'Câmera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!r.canceled) setFoto(r.assets[0].uri);
        },
      },
      {
        text: 'Galeria',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return;
          const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!r.canceled) setFoto(r.assets[0].uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const validar = () => {
    const e = {};
    if (!nome.trim()) e.nome = 'Nome do medicamento é obrigatório';
    if (!dose.trim()) e.dose = 'Dose é obrigatória';
    if (!idosoId) e.idoso = 'Selecione o idoso';

    // Validar horários
    const horariosValidos = horarios.filter((h) => h.trim());
    if (horariosValidos.length === 0) {
      e.horario = 'Adicione pelo menos um horário';
    } else {
      const horarioInvalido = horariosValidos.find((h) => !validarHorario(h));
      if (horarioInvalido) e.horario = `Horário inválido: ${horarioInvalido}`;
    }

    // Validar dias se tempo determinado
    if (!usoContinuo) {
      const dias = parseInt(diasTratamento);
      if (!diasTratamento || isNaN(dias) || dias < 1) {
        e.dias = 'Informe a duração do tratamento em dias';
      } else if (dias > 365) {
        e.dias = 'Máximo de 365 dias';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);

    try {
      const horariosValidos = horarios.filter((h) => h.trim());
      const idoso = idosos.find((i) => i.id === idosoId);
      const dias = usoContinuo ? null : parseInt(diasTratamento);

      // Cancelar alarmes anteriores
      if (notifIdsAntigos.length > 0) {
        await cancelarAlarmesMedicamento(notifIdsAntigos);
      }

      const dados = {
        nome: nome.trim(),
        dose: dose.trim(),
        horarios: horariosValidos,
        idosoId,
        foto,
        observacoes,
        alarmeAtivo,
        usoContinuo,
        diasTratamento: dias,
        dataInicio: new Date().toISOString(),
        notifIds: [],
      };

      // Agendar alarmes se ativo
      let novosNotifIds = [];
      if (alarmeAtivo && horariosValidos.length > 0) {
        novosNotifIds = await agendarAlarmesMedicamento(
          { ...dados, id: medicamentoId || `temp_${Date.now()}` },
          idoso?.nome || 'Idoso',
          true
        );
        dados.notifIds = novosNotifIds;
      }

      // Salvar no banco
      if (isEdit) {
        await MedicamentoStorage.update(medicamentoId, dados);
      } else {
        await MedicamentoStorage.add(dados);
      }

      // Mensagem de confirmação
      const horariosTexto = horariosValidos.join(' e ');
      const duracaoTexto = usoContinuo
        ? 'Uso contínuo — alarme todos os dias'
        : `Por ${dias} dia${dias > 1 ? 's' : ''} — ${dias * horariosValidos.length} alarmes agendados`;

      Alert.alert(
        '✅ Medicamento salvo!',
        alarmeAtivo
          ? `${dados.nome} — ${dados.dose}\n\n⏰ Alarme configurado para: ${horariosTexto}\n📅 ${duracaoTexto}\n\nO alarme tocará e vibrará até ser dispensado.`
          : `${dados.nome} salvo sem alarme.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error('[MedicamentoForm] Erro:', error);
      Alert.alert('Erro', 'Não foi possível salvar o medicamento.');
    } finally {
      setSalvando(false);
    }
  };

  // Calcular quantos alarmes serão agendados
  const totalAlarmes = () => {
    const h = horarios.filter((x) => x.trim()).length;
    if (usoContinuo) return `${h * 90} alarmes (90 dias) + reagendamento automático`;
    const dias = parseInt(diasTratamento) || 0;
    return `${h * dias} alarmes no total`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={isEdit ? 'Editar Medicamento' : 'Novo Medicamento'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Dados do medicamento ── */}
        <Card>
          <Text style={styles.cardTitle}>💊 Dados do Medicamento</Text>

          <InputField
            label="Nome do Medicamento"
            value={nome}
            onChangeText={setNome}
            placeholder="Ex: Losartana, Insulina, Amoxicilina..."
            icon="medical-outline"
            required
            error={errors.nome}
          />

          <InputField
            label="Dose / Posologia"
            value={dose}
            onChangeText={setDose}
            placeholder="Ex: 50mg, 1 comprimido, 10 unidades..."
            icon="flask-outline"
            required
            error={errors.dose}
            hint="Informe a dose exata conforme prescrição"
          />
        </Card>

        {/* ── Horários ── */}
        <Card>
          <Text style={styles.cardTitle}>⏰ Horários de Administração</Text>
          <Text style={styles.cardHint}>
            Cada horário gerará um alarme automático
          </Text>

          {horarios.map((h, idx) => (
            <View key={idx} style={styles.horarioRow}>
              <InputField
                label={`Horário ${idx + 1}`}
                value={h}
                onChangeText={(v) => atualizarHorario(idx, v)}
                placeholder="HH:MM"
                keyboardType="numeric"
                icon="time-outline"
                style={{ flex: 1, marginBottom: 0 }}
              />
              {horarios.length > 1 && (
                <TouchableOpacity
                  onPress={() => removerHorario(idx)}
                  style={styles.removeHorario}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {errors.horario && (
            <Text style={styles.errorText}>{errors.horario}</Text>
          )}

          {horarios.length < 6 && (
            <TouchableOpacity onPress={adicionarHorario} style={styles.addHorarioBtn}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.addHorarioText}>Adicionar horário</Text>
            </TouchableOpacity>
          )}

          {/* Exemplos de uso */}
          <View style={styles.exemplosBox}>
            <Text style={styles.exemplosTitle}>💡 Exemplos:</Text>
            <Text style={styles.exemplosText}>• A cada 8h → 08:00, 16:00 e 00:00</Text>
            <Text style={styles.exemplosText}>• A cada 12h → 08:00 e 20:00</Text>
            <Text style={styles.exemplosText}>• 1x ao dia → 08:00</Text>
          </View>
        </Card>

        {/* ── Duração do tratamento ── */}
        <Card style={styles.duracaoCard}>
          <Text style={styles.cardTitle}>📅 Duração do Tratamento</Text>

          {/* Toggle Contínuo / Determinado */}
          <View style={styles.duracaoToggleRow}>
            {/* Botão Uso Contínuo */}
            <TouchableOpacity
              style={[
                styles.duracaoBtn,
                usoContinuo && styles.duracaoBtnAtivo,
              ]}
              onPress={() => setUsoContinuo(true)}
            >
              <Ionicons
                name="infinite"
                size={22}
                color={usoContinuo ? Colors.onPrimary : Colors.outline}
              />
              <Text style={[
                styles.duracaoBtnText,
                usoContinuo && styles.duracaoBtnTextAtivo,
              ]}>
                Uso{'\n'}Contínuo
              </Text>
            </TouchableOpacity>

            {/* Botão Tempo Determinado */}
            <TouchableOpacity
              style={[
                styles.duracaoBtn,
                !usoContinuo && styles.duracaoBtnAtivo,
                { backgroundColor: !usoContinuo ? Colors.secondary : undefined },
              ]}
              onPress={() => setUsoContinuo(false)}
            >
              <Ionicons
                name="calendar-outline"
                size={22}
                color={!usoContinuo ? Colors.onSecondary || '#fff' : Colors.outline}
              />
              <Text style={[
                styles.duracaoBtnText,
                !usoContinuo && { color: Colors.onSecondary || '#fff' },
              ]}>
                Tempo{'\n'}Determinado
              </Text>
            </TouchableOpacity>
          </View>

          {/* Descrição do modo selecionado */}
          {usoContinuo ? (
            <View style={styles.duracaoInfo}>
              <Ionicons name="infinite" size={18} color={Colors.primary} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.duracaoInfoTitle}>Uso Contínuo</Text>
                <Text style={styles.duracaoInfoDesc}>
                  O alarme tocará todos os dias indefinidamente.{'\n'}
                  Ideal para: pressão, diabetes, colesterol, tireoide, etc.
                </Text>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.duracaoInfo}>
                <Ionicons name="calendar-outline" size={18} color={Colors.secondary} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[styles.duracaoInfoTitle, { color: Colors.secondary }]}>
                    Tempo Determinado
                  </Text>
                  <Text style={styles.duracaoInfoDesc}>
                    O alarme para automaticamente após os dias definidos.{'\n'}
                    Ideal para: antibióticos, anti-inflamatórios, analgésicos, etc.
                  </Text>
                </View>
              </View>

              <InputField
                label="Duração do tratamento"
                value={diasTratamento}
                onChangeText={(v) => setDiasTratamento(v.replace(/\D/g, ''))}
                placeholder="Ex: 7, 14, 30"
                keyboardType="numeric"
                icon="calendar-number-outline"
                required
                error={errors.dias}
                hint="Quantos dias dura o tratamento?"
                style={{ marginTop: Spacing.md, marginBottom: 0 }}
              />

              {/* Presets rápidos */}
              <View style={styles.presetsRow}>
                {['5', '7', '10', '14', '21', '30'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.presetBtn,
                      diasTratamento === d && styles.presetBtnAtivo,
                    ]}
                    onPress={() => setDiasTratamento(d)}
                  >
                    <Text style={[
                      styles.presetBtnText,
                      diasTratamento === d && styles.presetBtnTextAtivo,
                    ]}>
                      {d}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Resumo dos alarmes */}
          {horarios.filter((h) => h.trim()).length > 0 && alarmeAtivo && (
            <View style={styles.resumoAlarmes}>
              <Ionicons name="alarm-outline" size={16} color={Colors.primary} />
              <Text style={styles.resumoAlarmesText}>
                {totalAlarmes()}
              </Text>
            </View>
          )}
        </Card>

        {/* ── Alarme ── */}
        <Card style={alarmeAtivo ? styles.alarmeCardAtivo : styles.alarmeCardInativo}>
          <View style={styles.alarmeHeader}>
            <View style={styles.alarmeIconBox}>
              <Ionicons
                name={alarmeAtivo ? 'alarm' : 'alarm-outline'}
                size={28}
                color={alarmeAtivo ? Colors.secondary : Colors.outline}
              />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.alarmeTitulo}>Alarme Sonoro</Text>
              <Text style={styles.alarmeSubtitulo}>
                {alarmeAtivo
                  ? '🔔 Toca e vibra até ser dispensado'
                  : '🔕 Sem alarme sonoro'}
              </Text>
            </View>
            <Switch
              value={alarmeAtivo}
              onValueChange={setAlarmeAtivo}
              trackColor={{
                false: Colors.outlineVariant,
                true: Colors.secondaryContainer,
              }}
              thumbColor={alarmeAtivo ? Colors.secondary : Colors.outline}
            />
          </View>

          {alarmeAtivo && (
            <View style={styles.alarmeDetalhes}>
              {[
                'Toca mesmo com tela desligada',
                'Vibra continuamente até dispensar',
                'Reforço após 5 minutos se não dispensado',
                'Toca mesmo no modo silencioso',
              ].map((item, i) => (
                <View key={i} style={styles.alarmeDetalheItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.secondary} />
                  <Text style={styles.alarmeDetalheText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* ── Idoso ── */}
        {idosos.length > 0 && (
          <Card>
            <Text style={styles.cardTitle}>👤 Idoso</Text>
            {errors.idoso && <Text style={styles.errorText}>{errors.idoso}</Text>}
            {idosos.map((i) => (
              <TouchableOpacity
                key={i.id}
                style={[
                  styles.idosoOption,
                  idosoId === i.id && styles.idosoOptionActive,
                ]}
                onPress={() => setIdosoId(i.id)}
              >
                {i.foto ? (
                  <Image source={{ uri: i.foto }} style={styles.idosoFoto} />
                ) : (
                  <View style={styles.idosoFotoPlaceholder}>
                    <Text style={styles.idosoInitial}>{i.nome.charAt(0)}</Text>
                  </View>
                )}
                <Text style={[
                  styles.idosoNome,
                  idosoId === i.id && { color: Colors.primary, fontWeight: '700' },
                ]}>
                  {i.nome}
                </Text>
                {idosoId === i.id && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* ── Foto da receita ── */}
        <Card>
          <Text style={styles.cardTitle}>📄 Foto da Receita (opcional)</Text>
          <Text style={styles.cardHint}>Fotografe ou importe a receita do médico</Text>

          {foto ? (
            <View style={styles.receitaFotoContainer}>
              <Image source={{ uri: foto }} style={styles.receitaFoto} resizeMode="cover" />
              <TouchableOpacity onPress={() => setFoto(null)} style={styles.removeFotoBtn}>
                <Ionicons name="trash" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={selecionarFoto} style={styles.uploadBtn}>
              <Ionicons name="camera-outline" size={32} color={Colors.primary} />
              <Text style={styles.uploadBtnText}>Tirar foto ou importar da galeria</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* ── Observações ── */}
        <Card>
          <InputField
            label="Observações"
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Como administrar, efeitos colaterais, cuidados..."
            multiline
            numberOfLines={3}
            icon="document-text-outline"
            hint="Opcional"
          />
        </Card>

        <Button
          label={isEdit ? 'Atualizar Medicamento' : 'Salvar e Agendar Alarme'}
          onPress={salvar}
          loading={salvando}
          icon={alarmeAtivo ? 'alarm-outline' : 'checkmark-circle-outline'}
          style={{ marginBottom: Spacing.lg }}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
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
  cardHint: {
    ...Typography.bodySmall,
    color: Colors.outline, marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.labelSmall,
    color: Colors.error, marginBottom: Spacing.sm,
  },

  horarioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  removeHorario: { marginLeft: Spacing.sm, marginTop: 4 },
  addHorarioBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  addHorarioText: { ...Typography.labelMedium, color: Colors.primary, marginLeft: 6 },

  exemplosBox: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  exemplosTitle: { ...Typography.labelMedium, color: Colors.onSurfaceVariant, fontWeight: '700', marginBottom: 4 },
  exemplosText: { ...Typography.bodySmall, color: Colors.onSurfaceVariant, marginTop: 2 },

  // Duração
  duracaoCard: { },
  duracaoToggleRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  duracaoBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceVariant,
    gap: 6,
  },
  duracaoBtnAtivo: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  duracaoBtnText: {
    ...Typography.labelMedium,
    color: Colors.outline, textAlign: 'center', fontWeight: '600',
  },
  duracaoBtnTextAtivo: { color: Colors.onPrimary },

  duracaoInfo: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  duracaoInfoTitle: {
    ...Typography.titleSmall,
    color: Colors.primary, fontWeight: '700',
  },
  duracaoInfoDesc: {
    ...Typography.bodySmall,
    color: Colors.onPrimaryContainer,
    marginTop: 4, lineHeight: 18,
  },

  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.sm },
  presetBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
  },
  presetBtnAtivo: {
    backgroundColor: Colors.secondaryContainer,
    borderColor: Colors.secondary,
  },
  presetBtnText: { ...Typography.labelMedium, color: Colors.onSurfaceVariant },
  presetBtnTextAtivo: { color: Colors.secondary, fontWeight: '700' },

  resumoAlarmes: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  resumoAlarmesText: {
    ...Typography.labelMedium,
    color: Colors.primary, marginLeft: 8, fontWeight: '600',
  },

  // Alarme
  alarmeCardAtivo: { borderWidth: 2, borderColor: Colors.secondary, backgroundColor: Colors.secondaryContainer + '22' },
  alarmeCardInativo: { borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceVariant },
  alarmeHeader: { flexDirection: 'row', alignItems: 'center' },
  alarmeIconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    elevation: 1,
  },
  alarmeTitulo: { ...Typography.titleSmall, color: Colors.onSurface, fontWeight: '700' },
  alarmeSubtitulo: { ...Typography.bodySmall, color: Colors.onSurfaceVariant, marginTop: 2 },
  alarmeDetalhes: {
    marginTop: Spacing.md, padding: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
  },
  alarmeDetalheItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  alarmeDetalheText: { ...Typography.bodySmall, color: Colors.onSurface, marginLeft: 8 },

  // Idoso
  idosoOption: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.outlineVariant, marginBottom: Spacing.sm,
  },
  idosoOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  idosoFoto: { width: 40, height: 40, borderRadius: 20 },
  idosoFotoPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  idosoInitial: { ...Typography.titleSmall, color: Colors.primary, fontWeight: '700' },
  idosoNome: { ...Typography.bodyLarge, color: Colors.onSurface, flex: 1, marginLeft: Spacing.md },

  // Receita
  receitaFotoContainer: { borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative' },
  receitaFoto: { width: '100%', height: 200, borderRadius: BorderRadius.md },
  removeFotoBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: Colors.error, borderRadius: BorderRadius.full, padding: 8,
  },
  uploadBtn: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.primary,
    borderRadius: BorderRadius.md, padding: Spacing.xl, alignItems: 'center',
  },
  uploadBtnText: { ...Typography.bodyMedium, color: Colors.primary, marginTop: Spacing.sm, textAlign: 'center' },
});
