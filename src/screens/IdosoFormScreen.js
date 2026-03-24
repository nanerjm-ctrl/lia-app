// ============================================================
// IDOSO FORM SCREEN - LIA App
// ✅ Convênio: SUS (Unidade + nº cadastro) ou Particular (Nome + carteirinha)
// ✅ RG, CPF
// ✅ Endereço completo
// ✅ Confirmação ao sair sem salvar
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  TouchableOpacity, BackHandler, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import {
  Card, Button, InputField, Avatar, Chip,
  ToggleField, ScreenHeader, IMCCard
} from '../components';
import { IdosoStorage } from '../storage';
import {
  mascaraData, validarData, calcularIMC, DOENCAS_CRONICAS
} from '../services/helpers';

export default function IdosoFormScreen({ navigation, route }) {
  const idosoId = route?.params?.idosoId;
  const isEdit = !!idosoId;

  // ── Dados básicos ──────────────────────────────────────────
  const [nome, setNome] = useState('');
  const [foto, setFoto] = useState(null);
  const [dataNasc, setDataNasc] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [vidaAtiva, setVidaAtiva] = useState(false);
  const [doencasSelecionadas, setDoencasSelecionadas] = useState([]);
  const [medico, setMedico] = useState('');
  const [clinica, setClinica] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // ── Convênio ───────────────────────────────────────────────
  // 'sus' ou 'particular'
  const [convenio, setConvenio] = useState('sus');
  // SUS
  const [unidadeSus, setUnidadeSus] = useState('');
  const [numeroCadastroSus, setNumeroCadastroSus] = useState('');
  // Particular
  const [nomeConvenio, setNomeConvenio] = useState('');
  const [numeroCarteirinha, setNumeroCarteirinha] = useState('');

  // ── Documentos ─────────────────────────────────────────────
  const [rg, setRg] = useState('');
  const [cpf, setCpf] = useState('');

  // ── Endereço ───────────────────────────────────────────────
  const [logradouro, setLogradouro] = useState('');
  const [numeroEnd, setNumeroEnd] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [errors, setErrors] = useState({});
  const [temAlteracoes, setTemAlteracoes] = useState(false);

  const imc = calcularIMC(parseFloat(peso), parseFloat(altura));

  useEffect(() => {
    if (isEdit) carregarIdoso();
  }, [idosoId]);

  useEffect(() => {
    if (isEdit) setTemAlteracoes(true);
  }, [
    nome, foto, dataNasc, peso, altura, vidaAtiva,
    doencasSelecionadas, medico, clinica, observacoes,
    convenio, unidadeSus, numeroCadastroSus,
    nomeConvenio, numeroCarteirinha,
    rg, cpf,
    logradouro, numeroEnd, bairro, cidade, estado, cep,
  ]);

  // ── Bloquear botão voltar se tem alterações ────────────────
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (temAlteracoes) {
          Alert.alert(
            'Descartar alterações?',
            'Você tem alterações não salvas. Deseja sair?',
            [
              { text: 'Continuar editando', style: 'cancel' },
              { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() },
            ]
          );
          return true;
        }
        return false;
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [temAlteracoes])
  );

  // ── Carregar dados do idoso para edição ────────────────────
  const carregarIdoso = async () => {
    const idoso = await IdosoStorage.getById(idosoId);
    if (!idoso) return;

    setNome(idoso.nome || '');
    setFoto(idoso.foto || null);
    setDataNasc(idoso.dataNasc || '');
    setPeso(idoso.peso?.toString() || '');
    setAltura(idoso.altura?.toString() || '');
    setVidaAtiva(idoso.vidaAtiva || false);
    setDoencasSelecionadas(idoso.doencas || []);
    setMedico(idoso.medico || '');
    setClinica(idoso.clinica || '');
    setObservacoes(idoso.observacoes || '');

    // Convênio
    setConvenio(idoso.convenio || 'sus');
    setUnidadeSus(idoso.unidadeSus || '');
    setNumeroCadastroSus(idoso.numeroCadastroSus || '');
    setNomeConvenio(idoso.nomeConvenio || '');
    setNumeroCarteirinha(idoso.numeroCarteirinha || '');

    // Documentos
    setRg(idoso.rg || '');
    setCpf(idoso.cpf || '');

    // Endereço
    setLogradouro(idoso.logradouro || '');
    setNumeroEnd(idoso.numeroEnd || '');
    setBairro(idoso.bairro || '');
    setCidade(idoso.cidade || '');
    setEstado(idoso.estado || '');
    setCep(idoso.cep || '');

    setTimeout(() => setTemAlteracoes(false), 100);
  };

  // ── Foto ───────────────────────────────────────────────────
  const selecionarFoto = () => {
    Alert.alert('Foto do Idoso', 'Como deseja escolher?', [
      {
        text: 'Câmera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const r = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
          if (!r.canceled) setFoto(r.assets[0].uri);
        },
      },
      {
        text: 'Galeria',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return;
          const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
          if (!r.canceled) setFoto(r.assets[0].uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  // ── Doenças ────────────────────────────────────────────────
  const toggleDoenca = (d) => {
    setDoencasSelecionadas((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  // ── Validar ────────────────────────────────────────────────
  const validar = () => {
    const e = {};
    if (!nome.trim()) e.nome = 'Nome é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Salvar ─────────────────────────────────────────────────
  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      const dados = {
        nome: nome.trim(),
        foto,
        dataNasc,
        peso: peso ? parseFloat(peso) : null,
        altura: altura ? parseFloat(altura) : null,
        vidaAtiva,
        doencas: doencasSelecionadas,
        medico,
        clinica,
        observacoes,

        // Convênio
        convenio,
        unidadeSus,
        numeroCadastroSus,
        nomeConvenio,
        numeroCarteirinha,

        // Documentos
        rg,
        cpf,

        // Endereço
        logradouro,
        numeroEnd,
        bairro,
        cidade,
        estado,
        cep,
      };

      if (isEdit) {
        await IdosoStorage.update(idosoId, dados);
      } else {
        await IdosoStorage.add(dados);
      }

      setTemAlteracoes(false);
      Alert.alert('✅ Salvo!', `Idoso ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Erro', 'Falha ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={isEdit ? 'Editar Idoso' : 'Novo Idoso'}
        onBack={() => {
          if (temAlteracoes) {
            Alert.alert(
              'Descartar alterações?',
              'Você tem dados não salvos.',
              [
                { text: 'Continuar editando', style: 'cancel' },
                { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() },
              ]
            );
          } else {
            navigation.goBack();
          }
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Foto ── */}
        <Card style={styles.fotoCard}>
          <TouchableOpacity onPress={selecionarFoto} style={styles.fotoWrapper}>
            {foto ? (
              <Image source={{ uri: foto }} style={styles.foto} />
            ) : (
              <View style={styles.fotoPlaceholder}>
                <Ionicons name="camera" size={36} color={Colors.primary} />
                <Text style={styles.fotoHint}>Adicionar foto</Text>
              </View>
            )}
          </TouchableOpacity>
          {foto && (
            <TouchableOpacity onPress={selecionarFoto} style={styles.trocarFotoBtn}>
              <Text style={styles.trocarFotoText}>Trocar foto</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* ── Dados pessoais ── */}
        <Card>
          <Text style={styles.cardTitle}>📋 Dados Pessoais</Text>
          <InputField
            label="Nome Completo"
            value={nome}
            onChangeText={setNome}
            placeholder="Nome completo do idoso"
            icon="person-outline"
            required
            error={errors.nome}
          />
          <InputField
            label="Data de Nascimento"
            value={dataNasc}
            onChangeText={(v) => setDataNasc(mascaraData(v))}
            placeholder="DD/MM/AAAA"
            keyboardType="numeric"
            icon="calendar-outline"
            hint="Formato: dia/mês/ano"
          />
        </Card>

        {/* ── Saúde ── */}
        <Card>
          <Text style={styles.cardTitle}>⚖️ Dados de Saúde</Text>
          <View style={styles.row}>
            <InputField
              label="Peso (kg)"
              value={peso}
              onChangeText={setPeso}
              placeholder="Ex: 72.5"
              keyboardType="decimal-pad"
              style={{ flex: 1, marginRight: Spacing.sm }}
            />
            <InputField
              label="Altura (m ou cm)"
              value={altura}
              onChangeText={setAltura}
              placeholder="Ex: 1.68"
              keyboardType="decimal-pad"
              style={{ flex: 1 }}
            />
          </View>
          {imc && <IMCCard imc={imc} />}
          <ToggleField
            label="Tem vida ativa / pratica atividade física?"
            value={vidaAtiva}
            onToggle={setVidaAtiva}
          />
        </Card>

        {/* ── Convênio ── */}
        <Card>
          <Text style={styles.cardTitle}>🏥 Convênio / Atendimento</Text>

          {/* Toggle SUS / Particular */}
          <View style={styles.convenioToggleRow}>
            <TouchableOpacity
              style={[
                styles.convenioBtn,
                convenio === 'sus' && styles.convenioBtnAtivoSus,
              ]}
              onPress={() => setConvenio('sus')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="medical"
                size={20}
                color={convenio === 'sus' ? '#fff' : Colors.outline}
              />
              <Text style={[
                styles.convenioBtnText,
                convenio === 'sus' && styles.convenioBtnTextAtivo,
              ]}>
                SUS{'\n'}(Público)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.convenioBtn,
                convenio === 'particular' && styles.convenioBtnAtivoParticular,
              ]}
              onPress={() => setConvenio('particular')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="card"
                size={20}
                color={convenio === 'particular' ? '#fff' : Colors.outline}
              />
              <Text style={[
                styles.convenioBtnText,
                convenio === 'particular' && styles.convenioBtnTextAtivo,
              ]}>
                Particular{'\n'}(Convênio)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Campos SUS */}
          {convenio === 'sus' && (
            <View style={styles.convenioFields}>
              <View style={styles.susTag}>
                <Text style={styles.susTagText}>🏥 Sistema Único de Saúde</Text>
              </View>
              <InputField
                label="Unidade de Saúde"
                value={unidadeSus}
                onChangeText={setUnidadeSus}
                placeholder="Nome da UBS / CAPS / Hospital"
                icon="business-outline"
                hint="Unidade de referência do paciente"
              />
              <InputField
                label="Número do Cartão SUS"
                value={numeroCadastroSus}
                onChangeText={setNumeroCadastroSus}
                placeholder="000 0000 0000 0000"
                keyboardType="numeric"
                icon="card-outline"
              />
            </View>
          )}

          {/* Campos Particular */}
          {convenio === 'particular' && (
            <View style={styles.convenioFields}>
              <View style={styles.particularTag}>
                <Text style={styles.particularTagText}>💳 Plano de Saúde Privado</Text>
              </View>
              <InputField
                label="Nome do Convênio"
                value={nomeConvenio}
                onChangeText={setNomeConvenio}
                placeholder="Ex: Unimed, Bradesco Saúde, Amil..."
                icon="business-outline"
              />
              <InputField
                label="Número da Carteirinha"
                value={numeroCarteirinha}
                onChangeText={setNumeroCarteirinha}
                placeholder="Número da carteirinha do plano"
                keyboardType="numeric"
                icon="card-outline"
              />
            </View>
          )}
        </Card>

        {/* ── Documentos ── */}
        <Card>
          <Text style={styles.cardTitle}>📄 Documentos</Text>
          <InputField
            label="RG"
            value={rg}
            onChangeText={setRg}
            placeholder="Número do RG"
            icon="document-outline"
            hint="Opcional"
          />
          <InputField
            label="CPF"
            value={cpf}
            onChangeText={setCpf}
            placeholder="000.000.000-00"
            keyboardType="numeric"
            icon="document-text-outline"
            hint="Opcional"
          />
        </Card>

        {/* ── Endereço ── */}
        <Card>
          <Text style={styles.cardTitle}>📍 Endereço</Text>
          <InputField
            label="Logradouro"
            value={logradouro}
            onChangeText={setLogradouro}
            placeholder="Rua, Avenida, Travessa..."
            icon="map-outline"
          />
          <View style={styles.row}>
            <InputField
              label="Número"
              value={numeroEnd}
              onChangeText={setNumeroEnd}
              placeholder="Nº"
              keyboardType="numeric"
              style={{ width: 100, marginRight: Spacing.sm }}
            />
            <InputField
              label="Bairro"
              value={bairro}
              onChangeText={setBairro}
              placeholder="Bairro"
              style={{ flex: 1 }}
            />
          </View>
          <View style={styles.row}>
            <InputField
              label="Cidade"
              value={cidade}
              onChangeText={setCidade}
              placeholder="Cidade"
              style={{ flex: 1, marginRight: Spacing.sm }}
            />
            <InputField
              label="Estado"
              value={estado}
              onChangeText={(v) => setEstado(v.toUpperCase().slice(0, 2))}
              placeholder="UF"
              style={{ width: 70 }}
              maxLength={2}
            />
          </View>
          <InputField
            label="CEP"
            value={cep}
            onChangeText={setCep}
            placeholder="00000-000"
            keyboardType="numeric"
            icon="location-outline"
          />
        </Card>

        {/* ── Médico ── */}
        <Card>
          <Text style={styles.cardTitle}>👨‍⚕️ Médico Responsável</Text>
          <InputField
            label="Nome do Médico"
            value={medico}
            onChangeText={setMedico}
            placeholder="Dr. / Dra."
            icon="person-circle-outline"
            hint="Opcional"
          />
          <InputField
            label="Clínica / Hospital"
            value={clinica}
            onChangeText={setClinica}
            placeholder="Nome do local"
            icon="business-outline"
            hint="Opcional"
          />
        </Card>

        {/* ── Doenças crônicas ── */}
        <Card>
          <Text style={styles.cardTitle}>🏥 Doenças Crônicas</Text>
          <Text style={styles.cardSubtitle}>Selecione todas que se aplicam</Text>
          <View style={styles.chipsWrap}>
            {DOENCAS_CRONICAS.map((d) => (
              <Chip
                key={d}
                label={d}
                selected={doencasSelecionadas.includes(d)}
                onPress={() => toggleDoenca(d)}
              />
            ))}
          </View>
        </Card>

        {/* ── Observações ── */}
        <Card>
          <Text style={styles.cardTitle}>📝 Observações</Text>
          <InputField
            label="Informações adicionais"
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Alergias, hábitos, informações importantes..."
            multiline
            numberOfLines={4}
            icon="document-text-outline"
            hint="Opcional"
          />
        </Card>

        <Button
          label={isEdit ? 'Atualizar Idoso' : 'Cadastrar Idoso'}
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
  cardSubtitle: {
    ...Typography.bodySmall,
    color: Colors.outline, marginBottom: Spacing.md,
  },
  row: { flexDirection: 'row' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm },

  // Foto
  fotoCard: { alignItems: 'center' },
  fotoWrapper: { alignItems: 'center' },
  foto: { width: 110, height: 110, borderRadius: 55 },
  fotoPlaceholder: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  fotoHint: { ...Typography.labelSmall, color: Colors.primary, marginTop: 4 },
  trocarFotoBtn: { marginTop: Spacing.sm },
  trocarFotoText: { ...Typography.labelMedium, color: Colors.primary },

  // Convênio
  convenioToggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.md,
  },
  convenioBtn: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceVariant,
    gap: 6,
  },
  convenioBtnAtivoSus: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  convenioBtnAtivoParticular: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  convenioBtnText: {
    ...Typography.labelMedium,
    color: Colors.outline,
    textAlign: 'center', fontWeight: '600',
  },
  convenioBtnTextAtivo: { color: '#fff' },

  convenioFields: { marginTop: Spacing.sm },

  susTag: {
    backgroundColor: '#DBEAFE',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  susTagText: { ...Typography.labelMedium, color: '#1D4ED8', fontWeight: '700' },

  particularTag: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  particularTagText: { ...Typography.labelMedium, color: Colors.primary, fontWeight: '700' },
});
