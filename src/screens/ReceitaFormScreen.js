// ============================================================
// RECEITA FORM SCREEN - LIA App
// Upload de foto de receita médica e vinculação ao idoso
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  TouchableOpacity, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { Card, Button, InputField, ScreenHeader } from '../components';
import { ReceitaStorage, IdosoStorage } from '../storage';

export default function ReceitaFormScreen({ navigation, route }) {
  const { idosoId: idosoIdParam } = route?.params || {};

  const [titulo, setTitulo] = useState('');
  const [foto, setFoto] = useState(null);
  const [idosoId, setIdosoId] = useState(idosoIdParam || '');
  const [observacoes, setObservacoes] = useState('');
  const [idosos, setIdosos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    carregarIdosos();
  }, []);

  const carregarIdosos = async () => {
    const lista = await IdosoStorage.getAll();
    setIdosos(lista);
    if (lista.length === 1 && !idosoId) setIdosoId(lista[0].id);
  };

  const selecionarFoto = async (origem) => {
    try {
      let resultado;
      if (origem === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permissão', 'Câmera negada.'); return; }
        resultado = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permissão', 'Galeria negada.'); return; }
        resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
      }
      if (!resultado.canceled) setFoto(resultado.assets[0].uri);
    } catch {
      Alert.alert('Erro', 'Não foi possível selecionar foto.');
    }
  };

  const mostrarOpcoes = () => {
    Alert.alert('Foto da Receita', 'Como deseja escolher?', [
      { text: 'Câmera', onPress: () => selecionarFoto('camera') },
      { text: 'Galeria', onPress: () => selecionarFoto('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const validar = () => {
    const e = {};
    if (!foto) e.foto = 'Adicione a foto da receita';
    if (!idosoId) e.idoso = 'Selecione o idoso';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      await ReceitaStorage.add({ titulo: titulo.trim(), foto, idosoId, observacoes });
      Alert.alert('✅ Receita salva!', 'A receita foi armazenada com sucesso.', [
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
        title="Nova Receita"
        subtitle="Fotografe ou importe a receita"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Foto */}
        <Card>
          <Text style={styles.cardTitle}>📄 Foto da Receita</Text>
          <Text style={styles.cardHint}>
            Tire uma foto nítida de toda a receita para facilitar a leitura
          </Text>

          {foto ? (
            <View style={styles.fotoContainer}>
              <Image source={{ uri: foto }} style={styles.foto} resizeMode="contain" />
              <View style={styles.fotoBtns}>
                <TouchableOpacity onPress={mostrarOpcoes} style={styles.fotoAcao}>
                  <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
                  <Text style={styles.fotoAcaoText}>Trocar foto</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFoto(null)} style={[styles.fotoAcao, styles.fotoAcaoDanger]}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  <Text style={[styles.fotoAcaoText, { color: Colors.error }]}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              {errors.foto && <Text style={styles.errorText}>{errors.foto}</Text>}
              <View style={styles.uploadBtns}>
                <TouchableOpacity
                  style={styles.uploadBtnCamera}
                  onPress={() => selecionarFoto('camera')}
                >
                  <Ionicons name="camera" size={36} color={Colors.primary} />
                  <Text style={styles.uploadBtnTitle}>Tirar Foto</Text>
                  <Text style={styles.uploadBtnSub}>Use a câmera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadBtnGaleria}
                  onPress={() => selecionarFoto('galeria')}
                >
                  <Ionicons name="images" size={36} color={Colors.secondary} />
                  <Text style={[styles.uploadBtnTitle, { color: Colors.secondary }]}>
                    Galeria
                  </Text>
                  <Text style={styles.uploadBtnSub}>Importar imagem</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>

        {/* Título */}
        <Card>
          <InputField
            label="Título da Receita"
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ex: Receita Cardiologista jan/25"
            icon="document-text-outline"
            hint="Opcional — ajuda a identificar a receita depois"
          />

          <InputField
            label="Observações"
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Validade, observações do médico..."
            multiline
            numberOfLines={3}
            icon="create-outline"
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
                style={[styles.idosoOption, idosoId === i.id && styles.idosoOptionActive]}
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

        {/* Dica de organização */}
        <Card style={styles.dicaCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={styles.dicaEmoji}>💡</Text>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.dicaTitle}>Dica</Text>
              <Text style={styles.dicaText}>
                Mantenha as receitas organizadas por data. Receitas digitalizadas
                garantem acesso rápido mesmo sem o papel original.
              </Text>
            </View>
          </View>
        </Card>

        <Button
          label="Salvar Receita"
          onPress={salvar}
          loading={salvando}
          icon="cloud-upload-outline"
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
  cardHint: { ...Typography.bodySmall, color: Colors.outline, marginBottom: Spacing.md },
  errorText: { ...Typography.labelSmall, color: Colors.error, marginBottom: Spacing.sm },

  fotoContainer: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  foto: { width: '100%', height: 300, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceVariant },
  fotoBtns: {
    flexDirection: 'row', marginTop: Spacing.md, gap: 10,
  },
  fotoAcao: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  fotoAcaoDanger: { borderColor: Colors.error },
  fotoAcaoText: { ...Typography.labelMedium, color: Colors.primary, marginLeft: 6 },

  uploadBtns: { flexDirection: 'row', gap: 12 },
  uploadBtnCamera: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer + '44',
  },
  uploadBtnGaleria: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.secondary,
    backgroundColor: Colors.secondaryContainer + '44',
  },
  uploadBtnTitle: {
    ...Typography.titleSmall, color: Colors.primary,
    fontWeight: '700', marginTop: Spacing.sm,
  },
  uploadBtnSub: { ...Typography.labelSmall, color: Colors.outline, marginTop: 2 },

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

  dicaCard: {
    backgroundColor: Colors.infoContainer,
    marginBottom: Spacing.md,
  },
  dicaEmoji: { fontSize: 22 },
  dicaTitle: { ...Typography.titleSmall, color: Colors.info, fontWeight: '700' },
  dicaText: { ...Typography.bodySmall, color: Colors.onBackground, marginTop: 4, lineHeight: 20 },
});
