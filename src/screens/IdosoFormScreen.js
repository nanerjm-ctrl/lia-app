// ============================================================
// IDOSO FORM SCREEN - LIA App (VERSÃO COMPLETA)
// Agora com:
// ✅ Convênio (público/particular)
// ✅ Número do convênio
// ✅ RG e CPF
// ✅ Endereço completo
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  TouchableOpacity, BackHandler
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

  // ── STATES EXISTENTES ─────────────────────────────────────
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

  // ── NOVOS STATES ──────────────────────────────────────────
  const [convenio, setConvenio] = useState('publico');
  const [numeroConvenio, setNumeroConvenio] = useState('');
  const [rg, setRg] = useState('');
  const [cpf, setCpf] = useState('');

  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
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
    convenio, numeroConvenio, rg, cpf,
    logradouro, numero, bairro, cidade, estado, cep
  ]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (temAlteracoes) {
          Alert.alert(
            'Descartar alterações?',
            'Você tem alterações não salvas.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Descartar', onPress: () => navigation.goBack() },
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

    // NOVOS DADOS
    setConvenio(idoso.convenio || 'publico');
    setNumeroConvenio(idoso.numeroConvenio || '');
    setRg(idoso.rg || '');
    setCpf(idoso.cpf || '');

    setLogradouro(idoso.logradouro || '');
    setNumero(idoso.numero || '');
    setBairro(idoso.bairro || '');
    setCidade(idoso.cidade || '');
    setEstado(idoso.estado || '');
    setCep(idoso.cep || '');

    setTimeout(() => setTemAlteracoes(false), 100);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const dados = {
        nome, foto, dataNasc,
        peso: parseFloat(peso),
        altura: parseFloat(altura),
        vidaAtiva,
        doencas: doencasSelecionadas,
        medico, clinica, observacoes,

        convenio,
        numeroConvenio,
        rg,
        cpf,

        logradouro,
        numero,
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

      Alert.alert('Sucesso', 'Dados salvos!');
      navigation.goBack();

    } catch {
      Alert.alert('Erro', 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={isEdit ? 'Editar Idoso' : 'Novo Idoso'} />

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* FOTO */}
        <Card>
          <Avatar uri={foto} nome={nome} size={100} />
        </Card>

        {/* DADOS */}
        <Card>
          <InputField label="Nome" value={nome} onChangeText={setNome} />
          <InputField label="Data Nascimento" value={dataNasc} onChangeText={setDataNasc} />
        </Card>

        {/* CONVÊNIO */}
        <Card>
          <Text style={styles.title}>Convênio</Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Chip label="SUS" selected={convenio === 'publico'} onPress={() => setConvenio('publico')} />
            <Chip label="Particular" selected={convenio === 'particular'} onPress={() => setConvenio('particular')} />
          </View>

          <InputField label="Número do Convênio" value={numeroConvenio} onChangeText={setNumeroConvenio} />
          <InputField label="RG" value={rg} onChangeText={setRg} />
          <InputField label="CPF" value={cpf} onChangeText={setCpf} />
        </Card>

        {/* ENDEREÇO */}
        <Card>
          <Text style={styles.title}>Endereço</Text>

          <InputField label="Logradouro" value={logradouro} onChangeText={setLogradouro} />
          <InputField label="Número" value={numero} onChangeText={setNumero} />
          <InputField label="Bairro" value={bairro} onChangeText={setBairro} />
          <InputField label="Cidade" value={cidade} onChangeText={setCidade} />
          <InputField label="Estado" value={estado} onChangeText={setEstado} />
          <InputField label="CEP" value={cep} onChangeText={setCep} />
        </Card>

        <Button label="Salvar" onPress={salvar} loading={salvando} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 }
});
