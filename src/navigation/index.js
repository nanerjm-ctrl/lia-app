// ============================================================
// NAVIGATION - LIA App
// Bottom Tab + Stack navigation com Material 3
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../theme';

// Telas
import HomeScreen from '../screens/HomeScreen';
import MedicamentosScreen from '../screens/MedicamentosScreen';
import ConsultasScreen from '../screens/ConsultasScreen';
import ReceitasScreen from '../screens/ReceitasScreen';
import IdososScreen from '../screens/IdososScreen';
import CuidadorScreen from '../screens/CuidadorScreen';
import IdosoFormScreen from '../screens/IdosoFormScreen';
import IdosoDetailScreen from '../screens/IdosoDetailScreen';
import MedicamentoFormScreen from '../screens/MedicamentoFormScreen';
import ConsultaFormScreen from '../screens/ConsultaFormScreen';
import ReceitaFormScreen from '../screens/ReceitaFormScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Ícones da bottom tab ───────────────────────────────────
const TAB_ICONS = {
  Home: { focused: 'home', outline: 'home-outline' },
  Medicamentos: { focused: 'medical', outline: 'medical-outline' },
  Consultas: { focused: 'calendar', outline: 'calendar-outline' },
  Receitas: { focused: 'document-text', outline: 'document-text-outline' },
  Idosos: { focused: 'people', outline: 'people-outline' },
};

// ── Bottom Tab Navigator ───────────────────────────────────
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const iconSet = TAB_ICONS[route.name];
          const iconName = focused ? iconSet.focused : iconSet.outline;
          return (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconActive]}>
              <Ionicons name={iconName} size={22} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen
        name="Medicamentos"
        component={MedicamentosScreen}
        options={{ tabBarLabel: 'Remédios' }}
      />
      <Tab.Screen
        name="Consultas"
        component={ConsultasScreen}
        options={{ tabBarLabel: 'Consultas' }}
      />
      <Tab.Screen
        name="Receitas"
        component={ReceitasScreen}
        options={{ tabBarLabel: 'Receitas' }}
      />
      <Tab.Screen
        name="Idosos"
        component={IdososScreen}
        options={{ tabBarLabel: 'Idosos' }}
      />
    </Tab.Navigator>
  );
}

// ── Root Stack Navigator ───────────────────────────────────
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Cuidador" component={CuidadorScreen} />
        <Stack.Screen name="IdosoForm" component={IdosoFormScreen} />
        <Stack.Screen name="IdosoDetail" component={IdosoDetailScreen} />
        <Stack.Screen name="MedicamentoForm" component={MedicamentoFormScreen} />
        <Stack.Screen name="ConsultaForm" component={ConsultaFormScreen} />
        <Stack.Screen name="ReceitaForm" component={ReceitaFormScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.outlineVariant,
    borderTopWidth: 1,
    height: Platform.OS === 'android' ? 64 : 80,
    paddingBottom: Platform.OS === 'android' ? 8 : 16,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabLabel: {
    ...Typography.labelSmall,
    marginTop: 2,
  },
  tabIconWrapper: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tabIconActive: {
    backgroundColor: Colors.primaryContainer,
  },
});
