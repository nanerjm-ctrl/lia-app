// ============================================================
// MEDICAMENTO FORM SCREEN - LIA App
// Cadastro/edição de medicamento com alarme persistente
// Opção de ativar/desativar alarme por medicamento
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
import { mascaraHora } from '../services/helpers';
import {
  agendarTodosAlarmes,
  cancelarAlarmesMedicamento,
  requestPermissions,
} from '../services/notifications';

export default function MedicamentoFormScreen({ navigation, route }) {
  const { medicamentoId, idosoId: idosoIdParam } = route?.params || {};
  const isEdit = !!medicamentoId;

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

  // ── Opção de alarme persistente ──────────────────────────
  // true = alarme toca e vibra até a pessoa dispensar
  // false = sem alarme (silencioso)
  const [alarmeAtivo, setAlarmeAtivo] = useState(true);

  useEffect(() => {
    requestPermissions();
    carregarIdosos();
    if (isEdit) carregarMedicamento();
  }, []);

  const carregarIdosos = async () => {
    const lista = await IdosoStorage.getAll();
    setIdosos(lista);
    if (lista.length === 1 && !idosoId) {
      setIdosoId(lista[0].id);
    }
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
    setAlarmeAtivo(med.alarmeAtivo !== false); // padrão true
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
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      const horariosValidos = horarios.filter((h) => h.trim());
      const idoso = idosos.find((i) => i.id === idosoId);

      // Cancelar alarmes antigos se estiver editando
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
        alarmeAtivo, // Salvar preferência de alarme
        notifIds: [], // Será preenchido abaixo
      };

      // Agendar alarmes persistentes se ativado
      let novosNotifIds = [];
      if (horariosValidos.length > 0) {
        novosNotifIds = await agendarTodosAlarmes(
          { ...dados, id: medicamentoId || 'novo' },
          idoso?.nome || 'Idoso',
          alarmeAtivo
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
      let mensagem = '';
      if (!alarmeAtivo) {
        mensagem = 'Medicamento salvo sem alarme.';
      } else if (horariosValidos.length > 0) {
        mensagem = `Alarme persistente configurado para: ${horariosValidos.join(', ')}\n\nO alarme tocará e vibrará até ser dispensado.`;
      } else {
        mensagem = 'Medicamento salvo. Adicione horários para ativar o alarme.';
      }

      Alert.alert('✅ Salvo!', mensagem, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('[MedicamentoForm] Erro:', error);
      Alert.alert('Erro', 'Não foi possível salvar o medicamento.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={isEdit ? 'Editar Medicamento' : 'Novo Medicamento'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Dados do medicamento */}
        <Card>
          <Text style={styles.cardTitle}>💊 Dados do Medicamento</Text>
          <InputField
            label="Nome do Medicamento"
            value={nome}
            onChangeText={setNome}
            placeholder="Ex: Losartana, Metformina..."
            icon="medical-outline"
            required
            error={errors.nome}
          />
          <InputField
            label="Dose / Posologia"
            value={dose}
            onChangeText={setDose}
            placeholder="Ex: 50mg, 1 comprimido..."
            icon="flask-outline"
            required
            error={errors.dose}
          />
        </Card>

        {/* Horários */}
        <Card>
          <Text style={styles.cardTitle}>⏰ Horários de Administração</Text>
          <Text style={styles.cardHint}>
            Adicione um horário para cada dose diária
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

          {horarios.length < 6 && (
            <TouchableOpacity onPress={adicionarHorario} style={styles.addHorarioBtn}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.addHorarioText}>Adicionar horário</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* ── OPÇÃO DE ALARME PERSISTENTE ── */}
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
              <Text style={styles.alarmeTitulo}>
                Alarme Persistente
              </Text>
              <Text style={styles.alarmeSubtitulo}>
                {alarmeAtivo
                  ? '🔔 Alarme toca e vibra até ser dispensado'
                  : '🔕 Sem alarme sonoro'}
              </Text>
            </View>
            {/* Switch de ativar/desativar */}
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

          {/* Detalhes quando ativado */}
          {alarmeAtivo && (
            <View style={styles.alarmeDetalhes}>
              <View style={styles.alarmeDetalheItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.secondary} />
                <Text style={styles.alarmeDetalheText}>
                  Toca mesmo no modo silencioso
                </Text>
              </View>
              <View style={styles.alarmeDetalheItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.secondary} />
                <Text style={styles.alarmeDetalheText}>
                  Vibra continuamente até dispensar
                </Text>
              </View>
              <View style={styles.alarmeDetalheItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.secondary} />
                <Text style={styles.alarmeDetalheText}>
                  Reforço após 5 minutos se não dispensado
                </Text>
              </View>
              <View style={styles.alarmeDetalheItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.secondary} />
                <Text style={styles.alarmeDetalheText}>
                  Repete todos os dias nos horários cadastrados
                </Text>
              </View>
            </View>
          )}

          {/* Aviso quando desativado */}
          {!alarmeAtivo && (
            <View style={styles.alarmeDesativadoAviso}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.outline} />
              <Text style={styles.alarmeDesativadoTexto}>
                O medicamento será salvo mas não haverá alarme sonoro. Você ainda verá o lembrete na tela inicial.
              </Text>
            </View>
          )}
        </Card>

        {/* Idoso */}
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
                <Text
                  style={[
                    styles.idosoNome,
                    idosoId === i.id && { color: Colors.primary, fontWeight: '700' },
                  ]}
                >
                  {i.nome}
                </Text>
                {idosoId === i.id && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Foto da receita */}
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

        {/* Observações */}
        <Card>
          <InputField
            label="Observações"
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Como administrar, efeitos, observações..."
            multiline
            numberOfLines={3}
            icon="document-text-outline"
            hint="Opcional"
          />
        </Card>

        <Button
          label={isEdit ? 'Atualizar Medicamento' : 'Salvar Medicamento'}
          onPress={salvar}
          loading={salvando}
          icon="checkmark-circle-outline"
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

  horarioRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  removeHorario: { marginLeft: Spacing.sm, marginTop: 4 },
  addHorarioBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  addHorarioText: {
    ...Typography.labelMedium,
    color: Colors.primary, marginLeft: 6,
  },

  // Cards de alarme
  alarmeCardAtivo: {
    borderWidth: 2,
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondaryContainer + '33',
  },
  alarmeCardInativo: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceVariant,
  },
  alarmeHeader: {
    flexDirection: 'row', alignItems: 'center',
  },
  alarmeIconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    ...({ elevation: 1 }),
  },
  alarmeTitulo: {
    ...Typography.titleSmall,
    color: Colors.onSurface, fontWeight: '700',
  },
  alarmeSubtitulo: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant, marginTop: 2,
  },
  alarmeDetalhes: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  alarmeDetalheItem: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8,
  },
  alarmeDetalheText: {
    ...Typography.bodySmall,
    color: Colors.onSurface, marginLeft: 8,
  },
  alarmeDesativadoAviso: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  alarmeDesativadoTexto: {
    ...Typography.bodySmall,
    color: Colors.outline, marginLeft: 8, flex: 1,
  },

  idosoOption: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    marginBottom: Spacing.sm,
  },
  idosoOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  idosoFoto: { width: 40, height: 40, borderRadius: 20 },
  idosoFotoPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  idosoInitial: {
    ...Typography.titleSmall,
    color: Colors.primary, fontWeight: '700',
  },
  idosoNome: {
    ...Typography.bodyLarge,
    color: Colors.onSurface, flex: 1, marginLeft: Spacing.md,
  },

  receitaFotoContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden', position: 'relative',
  },
  receitaFoto: {
    width: '100%', height: 200, borderRadius: BorderRadius.md,
  },
  removeFotoBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full, padding: 8,
  },
  uploadBtn: {
    borderWidth: 2, borderStyle: 'dashed',
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl, alignItems: 'center',
  },
  uploadBtnText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    marginTop: Spacing.sm, textAlign: 'center',
  },
});
