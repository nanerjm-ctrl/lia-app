// ============================================================
// WELCOME SCREEN - LIA App
// Corrigido: logo LIA carregando corretamente
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

// ✅ Logo LIA referenciada corretamente
const LOGO_LIA = require('../../assets/logo_Lia.png');

const SLIDES = [
  {
    id: 1,
    usarLogo: true, // ✅ Primeiro slide usa a logo LIA
    iconColor: Colors.primary,
    titulo: 'Bem-vindo ao LIA!',
    subtitulo: 'Seu assistente digital de cuidado para idosos',
    desc: 'Organize medicamentos, consultas e receitas de forma simples e segura.',
  },
  {
    id: 2,
    icon: 'medical',
    iconColor: Colors.secondary,
    titulo: 'Nunca perca um remédio',
    subtitulo: 'Alarmes inteligentes',
    desc: 'Configure alarmes que tocam igual ao despertador do celular para cada medicamento.',
  },
  {
    id: 3,
    icon: 'calendar',
    iconColor: Colors.tertiary,
    titulo: 'Consultas organizadas',
    subtitulo: 'Lembretes automáticos',
    desc: 'Receba alertas 24h antes de cada consulta médica para nunca perder um compromisso.',
  },
  {
    id: 4,
    icon: 'people',
    iconColor: Colors.primary,
    titulo: 'Vários idosos',
    subtitulo: 'Perfis individuais',
    desc: 'Cadastre múltiplos idosos, cada um com seus próprios dados, remédios e consultas.',
  },
];

export default function WelcomeScreen({ navigation }) {
  const [slideAtual, setSlideAtual] = useState(0);

  const proximo = () => {
    if (slideAtual < SLIDES.length - 1) {
      setSlideAtual(slideAtual + 1);
    } else {
      navigation.replace('Tabs');
    }
  };

  const pular = () => navigation.replace('Tabs');

  const slide = SLIDES[slideAtual];
  const isUltimo = slideAtual === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Botão pular */}
      {!isUltimo && (
        <TouchableOpacity onPress={pular} style={styles.pularBtn}>
          <Text style={styles.pularText}>Pular</Text>
        </TouchableOpacity>
      )}

      {/* Conteúdo */}
      <View style={styles.content}>

        {/* ✅ Primeiro slide mostra a logo LIA real */}
        {slide.usarLogo ? (
          <View style={styles.logoContainer}>
            <Image
              source={LOGO_LIA}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={[styles.iconBox, { backgroundColor: slide.iconColor + '22' }]}>
            <Ionicons name={slide.icon} size={100} color={slide.iconColor} />
          </View>
        )}

        {/* Tag LIA */}
        <View style={styles.liaTag}>
          <Text style={styles.liaTagText}>LIA</Text>
        </View>

        <Text style={styles.titulo}>{slide.titulo}</Text>
        <Text style={styles.subtitulo}>{slide.subtitulo}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </View>

      {/* Indicadores */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, idx) => (
          <View
            key={idx}
            style={[styles.dot, idx === slideAtual && styles.dotAtivo]}
          />
        ))}
      </View>

      {/* Botão */}
      <TouchableOpacity
        style={[styles.btnProximo, isUltimo && styles.btnComecar]}
        onPress={proximo}
        activeOpacity={0.85}
      >
        <Text style={styles.btnProximoText}>
          {isUltimo ? '🚀 Começar agora' : 'Próximo'}
        </Text>
        {!isUltimo && (
          <Ionicons name="arrow-forward" size={20} color={Colors.onPrimary} style={{ marginLeft: 8 }} />
        )}
      </TouchableOpacity>

      {isUltimo && (
        <Text style={styles.avisoConfig}>
          Primeiro vamos configurar o perfil do cuidador
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  pularBtn: {
    alignSelf: 'flex-end',
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  pularText: { ...Typography.labelLarge, color: Colors.outline },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },

  // ✅ Container da logo LIA
  logoContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  logoImg: {
    width: 180,
    height: 180,
  },

  iconBox: {
    width: 180, height: 180,
    borderRadius: 90,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },

  liaTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  liaTagText: {
    ...Typography.titleLarge,
    color: Colors.onPrimary, fontWeight: '900',
    letterSpacing: 4,
  },

  titulo: {
    ...Typography.headlineMedium,
    color: Colors.onBackground, fontWeight: '700',
    textAlign: 'center', marginBottom: Spacing.sm,
  },
  subtitulo: {
    ...Typography.titleMedium,
    color: Colors.primary, fontWeight: '600',
    textAlign: 'center', marginBottom: Spacing.md,
  },
  desc: {
    ...Typography.bodyLarge,
    color: Colors.onSurfaceVariant,
    textAlign: 'center', lineHeight: 26,
  },

  dotsRow: { flexDirection: 'row', marginBottom: Spacing.lg },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.outlineVariant, marginHorizontal: 4,
  },
  dotAtivo: { width: 24, backgroundColor: Colors.primary },

  btnProximo: {
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 16, paddingHorizontal: Spacing.xxl,
    width: '100%', minHeight: 56,
  },
  btnComecar: { backgroundColor: Colors.secondary },
  btnProximoText: {
    ...Typography.titleMedium,
    color: Colors.onPrimary, fontWeight: '700',
  },
  avisoConfig: {
    ...Typography.bodySmall,
    color: Colors.outline, marginTop: Spacing.md, textAlign: 'center',
  },
});
