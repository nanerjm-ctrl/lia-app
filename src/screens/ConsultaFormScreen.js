// ============================================================
// CONSULTA FORM SCREEN - LIA App
// Cadastro e edição de consulta médica com notificação 24h antes
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { Card, Button, InputField, ScreenHeader } from '../components';
import { ConsultaStorage, IdosoStorage } from '../storage';
import {
  mascaraData, mascaraHora, validarData, parseDataHoraISO
} from '../services/helpers';
import {
  agendarNotificacaoConsulta, cancelarNotificacao, requestPermissions
} from '../services/notifications';

export default function ConsultaFormScreen({ navigation, route }) {
  const { consultaId, idosoId: idosoIdParam } = route?.params || {};
  const isEdit = !!consultaId;

  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [medico, setMedico] = useState('');
  const [local, setLocal] = useState('');
  const [idosoId, setIdosoId] = useState(idosoIdParam || '');
  const [observacoes, setObservacoes] = useState('');
  const [notifId, setNotifId] = useState(null);
  const [idosos, setIdosos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    carregarIdosos();
    if (isEdit) carregarConsulta();
    requestPermissions();
  }, []);

  const carregarIdosos = async () => {
    const lista = await IdosoStorage.getAll();
    setIdosos(lista);
    if (lista.length === 1 && !idosoId) setIdosoId(lista[0].id);
  };

  const carregarConsulta = async () => {
    const lista = await ConsultaStorage.getAll();
    const c = lista.find((x) => x.id === consultaId);
    if (!c) return;
    // Preencher campos a partir do ISO salvo
    const d = new Date(c.dataHoraISO);
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    const ano = d.getFullYear();
    setData(`${dia}/${mes}/${ano}`);
    setHorario(c.horario || '');
    setEspecialidade(c.especialidade || '');
    setMedico(c.medico || '');
    setLocal(c.local || '');
    setIdosoId(c.idosoId || '');
    setObservacoes(c.observacoes || '');
    setNotifId(c.notifId || null);
  };

  const validar = () => {
    const e = {};
    if (!data.trim()) e.data = 'Data é obrigatória';
    else if (!validarData(data)) e.data = 'Data inválida (DD/MM/AAAA)';
    if (!horario.trim()) e.horario = 'Horário é obrigatório';
    if (!idosoId) e.idoso = 'Selecione o idoso';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);

    try {
      // Monta ISO a partir de data + horario
      const dataHoraISO = parseDataHoraISO(data, horario);
      if (!dataHoraISO) {
        Alert.alert('Erro', 'Data ou horário inválido.');
        setSalvando(false);
        return;
      }

      const idoso = idosos.find((i) => i.id === idosoId);

      // Cancelar notificação anterior (se edição)
      if (notifId) await cancelarNotificacao(notifId);

      // Agendar nova notificação 24h antes
      const consulta = { dataHoraISO, horario, id: consultaId || 'temp' };
      const novoNotifId = await agendarNotificacaoConsulta(consulta, idoso?.nome || 'Idoso');

      const dados = {
        data,
        horario,
        dataHoraISO,
        especialidade: especialidade.trim(),
        medico: medico.trim(),
        local: local.trim(),
        idosoId,
        observacoes,
        notifId: novoNotifId,
      };

      if (isEdit) {
        await ConsultaStorage.update(consultaId, dados);
      } else {
        await ConsultaStorage.add(dados);
      }

      Alert.alert(
        '✅ Consulta salva!',
        novoNotifId
          ? 'Você receberá um lembrete 24h antes da consulta.'
          : 'Consulta salva. Habilite as notificações para receber lembretes.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível salvar a consulta.');
    } finally {
      setSalvando(false);
    }
  };

  // Especialidades comuns para seleção rápida
  const ESPECIALIDADES = [
    'Clínico Geral', 'Cardiologista', 'Neurologista', 'Ortopedista',
    'Oftalmologista', 'Endocrinologista', 'Geriatra', 'Pneumologista',
    'Urologista', 'Dermatologista', 'Fisioterapeuta', 'Outro',
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={isEdit ? 'Editar Consulta' : 'Nova Consulta'}
        subtitle="Agendamento médico"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Data e hora */}
        <Card>
          <Text style={styles.cardTitle}>📅 Data e Horário</Text>

          <View style={styles.row}>
            <InputField
              label="Data"
              value={data}
              onChangeText={(v) => setData(mascaraData(v))}
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              icon="calendar-outline"
              required
              error={errors.data}
              style={{ flex: 1, marginRight: Spacing.sm }}
            />
            <InputField
              label="Horário"
              value={horario}
              onChangeText={(v) => setHorario(mascaraHora(v))}
              placeholder="HH:MM"
              keyboardType="numeric"
              icon="time-outline"
              required
              error={errors.horario}
              style={{ flex: 1 }}
            />
          </View>

          {/* Informação sobre notificação */}
          <View style={styles.notifInfo}>
            <Ionicons name="notifications-outline" size={16} color={Colors.primary} />
            <Text style={styles.notifInfoText}>
              Você receberá uma notificação 24h antes desta consulta.
            </Text>
          </View>
        </Card>

        {/* Especialidade */}
        <Card>
          <Text style={styles.cardTitle}>🩺 Especialidade</Text>
          <InputField
            label="Especialidade médica"
            value={especialidade}
            onChangeText={setEspecialidade}
            placeholder="Ex: Cardiologista, Geriatra..."
            icon="medical-outline"
          />

          {/* Seleção rápida de especialidade */}
          <Text style={styles.cardHint}>Seleção rápida:</Text>
          <View style={styles.especWrap}>
            {ESPECIALIDADES.map((e) => (
              <TouchableOpacity
                key={e}
                style={[
                  styles.especChip,
                  especialidade === e && styles.especChipActive,
                ]}
                onPress={() => setEspecialidade(e)}
              >
                <Text
                  style={[
                    styles.especChipText,
                    especialidade === e && styles.especChipTextActive,
                  ]}
                >
                  {e}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Médico e local */}
        <Card>
          <Text style={styles.cardTitle}>👨‍⚕️ Médico e Local</Text>

          <InputField
            label="Nome do Médico"
            value={medico}
            onChangeText={setMedico}
            placeholder="Dr. / Dra. ..."
            icon="person-circle-outline"
            hint="Opcional"
          />

          <InputField
            label="Clínica / Hospital / Endereço"
            value={local}
            onChangeText={setLocal}
            placeholder="Local da consulta"
            icon="business-outline"
            hint="Opcional"
          />
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

        {/* Observações */}
        <Card>
          <InputField
            label="Observações"
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Exames necessários, orientações, documentos..."
            multiline
            numberOfLines={3}
            icon="document-text-outline"
            hint="Opcional"
          />
        </Card>

        <Button
          label={isEdit ? 'Atualizar Consulta' : 'Agendar Consulta'}
          onPress={salvar}
          loading={salvando}
          icon="calendar-outline"
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
    color: Colors.outline, marginBottom: Spacing.sm,
  },
  errorText: { ...Typography.labelSmall, color: Colors.error, marginBottom: Spacing.sm },

  row: { flexDirection: 'row' },

  notifInfo: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  notifInfoText: {
    ...Typography.bodySmall,
    color: Colors.onPrimaryContainer,
    marginLeft: Spacing.sm, flex: 1,
  },

  especWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  especChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    margin: 3,
  },
  especChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  especChipText: { ...Typography.labelMedium, color: Colors.onSurfaceVariant },
  especChipTextActive: { color: Colors.primary, fontWeight: '700' },

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
  idosoInitial: { ...Typography.titleSmall, color: Colors.primary, fontWeight: '700' },
  idosoNome: {
    ...Typography.bodyLarge, color: Colors.onSurface,
    flex: 1, marginLeft: Spacing.md,
  },
});
