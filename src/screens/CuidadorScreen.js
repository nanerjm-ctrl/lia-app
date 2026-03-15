// ============================================================
// CUIDADOR SCREEN - LIA App
// Cadastro e edição do perfil do cuidador
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { Card, Button, InputField, Avatar, ScreenHeader } from '../components';
import { CuidadorStorage } from '../storage';
import { requestPermissions } from '../services/notifications';

export default function CuidadorScreen({ navigation }) {
  const [cuidador, setCuidador] = useState(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [foto, setFoto] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    carregarCuidador();
    requestPermissions();
  }, []);

  const carregarCuidador = async () => {
    const lista = await CuidadorStorage.getAll();
    if (lista.length > 0) {
      const c = lista[0];
      setCuidador(c);
      setNome(c.nome || '');
      setTelefone(c.telefone || '');
      setEmail(c.email || '');
      setObservacoes(c.observacoes || '');
      setFoto(c.foto || null);
    }
  };

  const selecionarFoto = async (origem) => {
    try {
      let resultado;
      if (origem === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão', 'Precisamos de acesso à câmera.');
          return;
        }
        resultado = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
          return;
        }
        resultado = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!resultado.canceled) {
        setFoto(resultado.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível acessar a foto.');
    }
  };

  const mostrarOpcoesFoto = () => {
    Alert.alert('Foto do Cuidador', 'Como deseja escolher a foto?', [
      { text: 'Câmera', onPress: () => selecionarFoto('camera') },
      { text: 'Galeria', onPress: () => selecionarFoto('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const validar = () => {
    const e = {};
    if (!nome.trim()) e.nome = 'Nome é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      const dados = { nome: nome.trim(), telefone, email, observacoes, foto };
      if (cuidador) {
        await CuidadorStorage.update(cuidador.id, dados);
      } else {
        await CuidadorStorage.add(dados);
      }
      Alert.alert('✅ Salvo!', 'Perfil do cuidador salvo com sucesso.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o perfil.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Perfil do Cuidador"
        subtitle="Seus dados de contato"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Foto */}
        <Card style={styles.fotoCard}>
          <View style={styles.fotoSection}>
            <Avatar uri={foto} nome={nome || 'C'} size={96} onPress={mostrarOpcoesFoto} />
            <View style={{ marginLeft: Spacing.lg, flex: 1 }}>
              <Text style={styles.fotoTitle}>Foto do Cuidador</Text>
              <Text style={styles.fotoHint}>
                Toque na foto para tirar com a câmera ou escolher da galeria
              </Text>
              <View style={{ flexDirection: 'row', marginTop: Spacing.sm, gap: 8 }}>
                <TouchableOpacity
                  style={styles.fotoBtn}
                  onPress={() => selecionarFoto('camera')}
                >
                  <Ionicons name="camera" size={16} color={Colors.primary} />
                  <Text style={styles.fotoBtnText}>Câmera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fotoBtn}
                  onPress={() => selecionarFoto('galeria')}
                >
                  <Ionicons name="images" size={16} color={Colors.primary} />
                  <Text style={styles.fotoBtnText}>Galeria</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Card>

        {/* Dados */}
        <Card>
          <Text style={styles.sectionTitle}>Informações Pessoais</Text>

          <InputField
            label="Nome Completo"
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome completo"
            icon="person-outline"
            required
            error={errors.nome}
          />

          <InputField
            label="Telefone / WhatsApp"
            value={telefone}
            onChangeText={setTelefone}
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
            icon="call-outline"
            hint="Opcional — para contato de emergência"
          />

          <InputField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            icon="mail-outline"
            hint="Opcional"
          />

          <InputField
            label="Observações"
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Informações adicionais sobre você..."
            multiline
            numberOfLines={3}
            icon="document-text-outline"
            hint="Opcional"
          />
        </Card>

        <Button
          label={cuidador ? 'Atualizar Perfil' : 'Salvar Perfil'}
          onPress={salvar}
          loading={salvando}
          icon="checkmark-circle-outline"
          style={{ marginTop: Spacing.sm, marginBottom: Spacing.lg }}
        />

        {/* Sobre o App */}
        <Card style={styles.aboutCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
            <View style={styles.liaLogo}>
              <Text style={styles.liaLogoText}>LIA</Text>
            </View>
            <View style={{ marginLeft: Spacing.md }}>
              <Text style={styles.aboutTitle}>LIA — Assistente de Cuidado</Text>
              <Text style={styles.aboutVersion}>Versão 1.0.0</Text>
            </View>
          </View>
          <Text style={styles.aboutDesc}>
            LIA é um aplicativo de cuidado para idosos, desenvolvido para ajudar cuidadores a
            organizar medicamentos, consultas e acompanhar a saúde dos seus idosos com carinho.
          </Text>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md },

  fotoCard: { marginBottom: Spacing.md },
  fotoSection: { flexDirection: 'row', alignItems: 'center' },
  fotoTitle: { ...Typography.titleSmall, color: Colors.onSurface, fontWeight: '600' },
  fotoHint: { ...Typography.bodySmall, color: Colors.outline, marginTop: 4 },
  fotoBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.primary,
    marginRight: 6,
  },
  fotoBtnText: { ...Typography.labelSmall, color: Colors.primary, marginLeft: 4 },

  sectionTitle: {
    ...Typography.titleMedium,
    color: Colors.onSurface, fontWeight: '700',
    marginBottom: Spacing.md,
  },

  aboutCard: {
    backgroundColor: Colors.primaryContainer,
    marginTop: Spacing.sm,
  },
  liaLogo: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  liaLogoText: { ...Typography.titleLarge, color: Colors.onPrimary, fontWeight: '900' },
  aboutTitle: { ...Typography.titleSmall, color: Colors.onPrimaryContainer, fontWeight: '700' },
  aboutVersion: { ...Typography.labelSmall, color: Colors.primary },
  aboutDesc: { ...Typography.bodySmall, color: Colors.onPrimaryContainer, lineHeight: 20 },
});
