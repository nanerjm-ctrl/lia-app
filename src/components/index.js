// ============================================================
// COMPONENTS - LIA App
// Componentes reutilizáveis Material 3
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Card ───────────────────────────────────────────────────
export const Card = ({ children, style, onPress }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, style]}
    >
      {children}
    </Wrapper>
  );
};

// ── Botão primário ─────────────────────────────────────────
export const Button = ({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  variant = 'filled', // filled | outlined | text | tonal
  color,
  style,
  textStyle,
}) => {
  const isPrimary = variant === 'filled';
  const isTonal = variant === 'tonal';
  const isOutlined = variant === 'outlined';

  const bg = isPrimary
    ? color || Colors.primary
    : isTonal
    ? Colors.primaryContainer
    : 'transparent';

  const textColor = isPrimary
    ? Colors.onPrimary
    : isTonal
    ? Colors.onPrimaryContainer
    : color || Colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        { backgroundColor: bg },
        isOutlined && { borderWidth: 1.5, borderColor: color || Colors.primary },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={textColor}
              style={{ marginRight: Spacing.sm }}
            />
          )}
          <Text style={[styles.buttonLabel, { color: textColor }, textStyle]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// ── FAB (Floating Action Button) ───────────────────────────
export const FAB = ({ icon = 'add', onPress, label, style }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[styles.fab, style]}
  >
    <Ionicons name={icon} size={24} color={Colors.onPrimary} />
    {label && (
      <Text style={styles.fabLabel}>{label}</Text>
    )}
  </TouchableOpacity>
);

// ── Campo de texto ─────────────────────────────────────────
export const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  numberOfLines,
  secureTextEntry,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  editable = true,
  style,
  inputStyle,
  required,
  hint,
}) => (
  <View style={[styles.inputWrapper, style]}>
    {label && (
      <Text style={styles.inputLabel}>
        {label}
        {required && <Text style={{ color: Colors.error }}> *</Text>}
      </Text>
    )}
    <View
      style={[
        styles.inputContainer,
        error && { borderColor: Colors.error },
        !editable && { backgroundColor: Colors.surfaceVariant },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={20}
          color={Colors.onSurfaceVariant}
          style={styles.inputIcon}
        />
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.outline}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        secureTextEntry={secureTextEntry}
        editable={editable}
        style={[
          styles.input,
          icon && { paddingLeft: 0 },
          multiline && { height: 24 * (numberOfLines || 3), textAlignVertical: 'top' },
          inputStyle,
        ]}
      />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
          <Ionicons name={rightIcon} size={20} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      )}
    </View>
    {error ? (
      <Text style={styles.inputError}>{error}</Text>
    ) : hint ? (
      <Text style={styles.inputHint}>{hint}</Text>
    ) : null}
  </View>
);

// ── Avatar com foto ────────────────────────────────────────
export const Avatar = ({ uri, nome, size = 64, onPress, style }) => {
  const initials = nome
    ? nome
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.avatarInitials, { fontSize: size * 0.35 }]}>
          {initials}
        </Text>
      )}
      {onPress && (
        <View style={styles.avatarBadge}>
          <Ionicons name="camera" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── Chip de seleção ────────────────────────────────────────
export const Chip = ({ label, selected, onPress, style }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[
      styles.chip,
      selected && { backgroundColor: Colors.primaryContainer, borderColor: Colors.primary },
      style,
    ]}
  >
    {selected && (
      <Ionicons name="checkmark" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
    )}
    <Text
      style={[
        styles.chipLabel,
        selected && { color: Colors.onPrimaryContainer, fontWeight: '600' },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// ── Toggle Sim/Não ─────────────────────────────────────────
export const ToggleField = ({ label, value, onToggle, hint }) => (
  <View style={styles.toggleWrapper}>
    <View style={{ flex: 1 }}>
      <Text style={styles.toggleLabel}>{label}</Text>
      {hint && <Text style={styles.inputHint}>{hint}</Text>}
    </View>
    <TouchableOpacity
      onPress={() => onToggle(!value)}
      activeOpacity={0.8}
      style={[styles.toggleTrack, value && { backgroundColor: Colors.primary }]}
    >
      <View
        style={[
          styles.toggleThumb,
          value && { transform: [{ translateX: 20 }], backgroundColor: Colors.onPrimary },
        ]}
      />
    </TouchableOpacity>
  </View>
);

// ── Seção separadora ───────────────────────────────────────
export const SectionHeader = ({ title, action, actionLabel }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={action}>
        <Text style={styles.sectionAction}>{actionLabel || 'Ver todos'}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ── Badge de status ────────────────────────────────────────
export const Badge = ({ label, color = Colors.primary, bgColor }) => (
  <View
    style={[
      styles.badge,
      { backgroundColor: bgColor || color + '22' },
    ]}
  >
    <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
  </View>
);

// ── Empty state ────────────────────────────────────────────
export const EmptyState = ({ icon = 'file-tray-outline', title, subtitle, action, actionLabel }) => (
  <View style={styles.emptyState}>
    <Ionicons name={icon} size={64} color={Colors.outline} />
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    {action && (
      <Button label={actionLabel || 'Adicionar'} onPress={action} style={{ marginTop: Spacing.lg }} />
    )}
  </View>
);

// ── Modal de confirmação ───────────────────────────────────
export const ConfirmModal = ({ visible, title, message, onConfirm, onCancel, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', confirmColor = Colors.error }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalBox}>
        <Text style={styles.modalTitle}>{title}</Text>
        {message && <Text style={styles.modalMessage}>{message}</Text>}
        <View style={styles.modalActions}>
          <Button
            label={cancelLabel}
            onPress={onCancel}
            variant="text"
            style={{ flex: 1 }}
          />
          <Button
            label={confirmLabel}
            onPress={onConfirm}
            color={confirmColor}
            style={{ flex: 1, marginLeft: Spacing.sm }}
          />
        </View>
      </View>
    </View>
  </Modal>
);

// ── Loading overlay ────────────────────────────────────────
export const LoadingOverlay = ({ visible, message = 'Carregando...' }) =>
  visible ? (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  ) : null;

// ── ScreenHeader ───────────────────────────────────────────
export const ScreenHeader = ({ title, subtitle, onBack, rightAction, rightIcon = 'ellipsis-vertical' }) => (
  <View style={styles.screenHeader}>
    {onBack && (
      <TouchableOpacity onPress={onBack} style={styles.headerBack}>
        <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
      </TouchableOpacity>
    )}
    <View style={{ flex: 1 }}>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </View>
    {rightAction && (
      <TouchableOpacity onPress={rightAction} style={styles.headerRight}>
        <Ionicons name={rightIcon} size={24} color={Colors.onSurface} />
      </TouchableOpacity>
    )}
  </View>
);

// ── IMC Card ───────────────────────────────────────────────
export const IMCCard = ({ imc }) => {
  if (!imc) return null;
  return (
    <View style={[styles.imcCard, { borderLeftColor: imc.cor }]}>
      <View>
        <Text style={styles.imcLabel}>IMC</Text>
        <Text style={[styles.imcValue, { color: imc.cor }]}>{imc.valor}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <Text style={[styles.imcClassificacao, { color: imc.cor }]}>{imc.classificacao}</Text>
        <Text style={styles.imcDesc}>Índice de Massa Corporal</Text>
      </View>
    </View>
  );
};

// ── Pill de horário de medicamento ─────────────────────────
export const HorarioPill = ({ horario }) => (
  <View style={styles.horarioPill}>
    <Ionicons name="time-outline" size={12} color={Colors.secondary} />
    <Text style={styles.horarioPillText}>{horario}</Text>
  </View>
);

// ─────────────────────── STYLES ───────────────────────────

const styles = StyleSheet.create({
  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Elevation.level2,
  },

  // Button
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    minHeight: 52,
  },
  buttonLabel: {
    ...Typography.labelLarge,
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Elevation.level3,
  },
  fabLabel: {
    color: Colors.onPrimary,
    ...Typography.labelLarge,
    marginLeft: Spacing.sm,
  },

  // Input
  inputWrapper: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.labelMedium,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.onSurface,
    paddingVertical: Spacing.sm,
  },
  rightIcon: {
    padding: Spacing.xs,
  },
  inputError: {
    ...Typography.labelSmall,
    color: Colors.error,
    marginTop: 4,
  },
  inputHint: {
    ...Typography.labelSmall,
    color: Colors.outline,
    marginTop: 4,
  },

  // Avatar
  avatar: {
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitials: {
    color: Colors.primary,
    fontWeight: '700',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Chip
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
    margin: 4,
  },
  chipLabel: {
    ...Typography.labelMedium,
    color: Colors.onSurfaceVariant,
  },

  // Toggle
  toggleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  toggleLabel: {
    ...Typography.bodyLarge,
    color: Colors.onSurface,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.outlineVariant,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.outline,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    color: Colors.onSurface,
  },
  sectionAction: {
    ...Typography.labelMedium,
    color: Colors.primary,
  },

  // Badge
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeLabel: {
    ...Typography.labelSmall,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyTitle: {
    ...Typography.titleMedium,
    color: Colors.onSurface,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.bodyMedium,
    color: Colors.outline,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...Typography.headlineSmall,
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    ...Typography.bodyLarge,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    marginTop: Spacing.md,
  },

  // Screen Header
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  headerBack: {
    marginRight: Spacing.sm,
    padding: 4,
  },
  headerTitle: {
    ...Typography.titleLarge,
    color: Colors.onSurface,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.outline,
  },
  headerRight: {
    marginLeft: Spacing.sm,
    padding: 4,
  },

  // IMC Card
  imcCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    marginBottom: Spacing.md,
    ...Elevation.level1,
  },
  imcLabel: {
    ...Typography.labelSmall,
    color: Colors.outline,
  },
  imcValue: {
    ...Typography.headlineSmall,
    fontWeight: '700',
  },
  imcClassificacao: {
    ...Typography.titleSmall,
    fontWeight: '700',
  },
  imcDesc: {
    ...Typography.bodySmall,
    color: Colors.outline,
  },

  // Horário Pill
  horarioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryContainer,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 4,
  },
  horarioPillText: {
    ...Typography.labelSmall,
    color: Colors.secondary,
    marginLeft: 3,
  },
});
