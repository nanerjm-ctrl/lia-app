// ============================================================
// IDOSO FORM SCREEN - LIA App
// Atualizado com confirmação ao sair sem salvar
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  TouchableOpacity, Image, BackHandler
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
  const [salvando, setSalvando] = useState(false);
  const [errors, setErrors] = useState({});
  const [temAlteracoes, setTemAlteracoes] = useState(false);

  const imc = calcularIMC(parseFloat(peso), parseFloat(altura));

  useEffect(() => {
    if (isEdit) carregarIdoso();
  }, [idosoId]);

  // Marcar alterações quando qualquer campo muda
  useEffect(() => {
    if (isEdit) setTemAlteracoes(true);
  }, [nome, foto, dataNasc, peso, altura, vidaAtiva, doencasSelecionadas, medico, clinica, observacoes]);

  // ── Confirmação ao pressionar botão voltar do Android ──
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (temAlteracoes) {
          Alert.alert(
            'Descartar alterações?',
            'Você tem alterações não salvas. Deseja sair sem salvar?',
            [
              { text: 'Continuar editando', style: 'cancel' },
              { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() },
            ]
          );
          return true; // Intercepta o botão voltar
        }
        return false;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [temAlteracoes])
  );

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
    // Reset após carregar
    setTimeout(() => setTemAlteracoes(false), 100);
  };

  const handleVoltar = () => {
    if (temAlteracoes && nome.trim()) {
      Alert.alert(
        'Descartar alterações?',
        'Você tem dados não salvos. Deseja sair sem salvar?',
        [
          { text: 'Continuar editando', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const selecionarFoto = async (origem) => {
    try {
      let resultado;
      if (origem === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permissão', 'Câmera negada.'); return; }
        resultado = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permissão', 'Galeria negada.'); return; }
        resultado = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
      }
      if (!resultado.canceled) setFoto(resultado.assets[0].uri);
    } catch { Alert.alert('Erro', 'Não foi possível selecionar foto.'); }
  };

  const mostrarOpcoesFoto = () => {
    Alert.alert('Foto do Idoso', 'Como deseja escolher a foto?', [
      { text: 'Câmera', onPress: () => selecionarFoto('camera') },
      { text: 'Galeria', onPress: () => selecionarFoto('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const toggleDoenca = (d) => {
    setDoencasSelecionadas((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const validar = () => {
    const e = {};
    if (!nome.trim()) e.nome = 'Nome é obrigatório';
    if (dataNasc && !validarData(dataNasc)) e.dataNasc = 'Data inválida (DD/MM/AAAA)';
    if (peso && isNaN(parseFloat(peso))) e.peso = 'Peso inválido';
    if (altura && isNaN(parseFloat(altura))) e.altura = 'Altura inválida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      const dados = {
        nome: nome.trim(), foto, dataNasc,
        peso: peso ? parseFloat(peso) : null,
        altura: altura ? parseFloat(altura) : null,
        vidaAtiva, doencas: doencasSelecionadas,
        medico, clinica, observacoes,
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
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={isEdit ? 'Editar Idoso' : 'Novo Idoso'}
        subtitle={isEdit ? 'Atualize os dados' : 'Preencha os dados do idoso'}
        onBack={handleVoltar}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Foto */}
        <Card style={styles.fotoCard}>
          <View style={{ alignItems: 'center' }}>
            <Avatar uri={foto} nome={nome || 'I'} size={110} onPress={mostrarOpcoesFoto} />
            <Text style={styles.fotoHint}>Toque para escolher a foto</Text>
            <View style={{ flexDirection: 'row', marginTop: Spacing.sm, gap: 10 }}>
              <TouchableOpacity style={styles.fotoBtn} onPress={() => selecionarFoto('camera')}>
                <Ionicons name="camera" size={16} color={Colors.primary} />
                <Text style={styles.fotoBtnText}>Câmera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fotoBtn} onPress={() => selecionarFoto('galeria')}>
                <Ionicons name="images" size={16} color={Colors.primary} />
                <Text style={styles.fotoBtnText}>Galeria</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Dados pessoais */}
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
            error={errors.dataNasc}
            hint="Formato: dia/mês/ano"
          />
        </Card>

        {/* Saúde */}
        <Card>
          <Text style={styles.cardTitle}>⚖️ Dados de Saúde</Text>
          <View style={styles.row}>
            <InputField
              label="Peso (kg)"
              value={peso}
              onChangeText={setPeso}
              placeholder="Ex: 72.5"
              keyboardType="decimal-pad"
              error={errors.peso}
              style={{ flex: 1, marginRight: Spacing.sm }}
            />
            <InputField
              label="Altura (m)"
              value={altura}
              onChangeText={setAltura}
              placeholder="Ex: 1.68"
              keyboardType="decimal-pad"
              error={errors.altura}
              style={{ flex: 1 }}
            />
          </View>
          {imc && <IMCCard imc={imc} />}
          <ToggleField
            label="Tem vida ativa / pratica atividade física?"
            value={vidaAtiva}
            onToggle={setVidaAtiva}
            hint="Caminhadas, fisioterapia, exercícios regulares"
          />
        </Card>

        {/* Doenças */}
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

        {/* Médico */}
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

        {/* Observações */}
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
  fotoCard: { alignItems: 'center', marginBottom: Spacing.md },
  fotoHint: { ...Typography.bodySmall, color: Colors.outline, marginTop: Spacing.sm },
  fotoBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  fotoBtnText: { ...Typography.labelSmall, color: Colors.primary, marginLeft: 6 },
  cardTitle: { ...Typography.titleMedium, color: Colors.onSurface, fontWeight: '700', marginBottom: Spacing.sm },
  cardSubtitle: { ...Typography.bodySmall, color: Colors.outline, marginBottom: Spacing.md },
  row: { flexDirection: 'row' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm },
});
