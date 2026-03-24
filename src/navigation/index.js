// ============================================================
// NAVIGATION - LIA App
// Adicionada rota Emergencia
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, Typography } from '../theme';

// Telas principais
import HomeScreen from '../screens/HomeScreen';
import MedicamentosScreen from '../screens/MedicamentosScreen';
import ConsultasScreen from '../screens/ConsultasScreen';
import ReceitasScreen from '../screens/ReceitasScreen';
import IdososScreen from '../screens/IdososScreen';

// Telas secundárias
import CuidadorScreen from '../screens/CuidadorScreen';
import IdosoFormScreen from '../screens/IdosoFormScreen';
import IdosoDetailScreen from '../screens/IdosoDetailScreen';
import MedicamentoFormScreen from '../screens/MedicamentoFormScreen';
import ConsultaFormScreen from '../screens/ConsultaFormScreen';
import ReceitaFormScreen from '../screens/ReceitaFormScreen';
import ConfiguracoesScreen from '../screens/ConfiguracoesScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import TelaAlarme from '../screens/TelaAlarme';

// ✅ Nova tela de emergência
import EmergenciaScreen from '../screens/EmergenciaScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Home: { focused: 'home', outline: 'home-outline' },
  Medicamentos: { focused: 'medical', outline: 'medical-outline' },
  Consultas: { focused: 'calendar', outline: 'calendar-outline' },
  Receitas: { focused: 'document-text', outline: 'document-text-outline' },
  Idosos: { focused: 'people', outline: 'people-outline' },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="Medicamentos" component={MedicamentosScreen} options={{ tabBarLabel: 'Remédios' }} />
      <Tab.Screen name="Consultas" component={ConsultasScreen} options={{ tabBarLabel: 'Consultas' }} />
      <Tab.Screen name="Receitas" component={ReceitasScreen} options={{ tabBarLabel: 'Receitas' }} />
      <Tab.Screen name="Idosos" component={IdososScreen} options={{ tabBarLabel: 'Idosos' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ navigationRef }) {
  const [primeiroAcesso, setPrimeiroAcesso] = useState(null);

  useEffect(() => {
    verificarPrimeiroAcesso();
  }, []);

  const verificarPrimeiroAcesso = async () => {
    try {
      const visto = await AsyncStorage.getItem('@lia_welcome_visto');
      setPrimeiroAcesso(!visto);
      if (!visto) await AsyncStorage.setItem('@lia_welcome_visto', 'true');
    } catch {
      setPrimeiroAcesso(false);
    }
  };

  if (primeiroAcesso === null) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={primeiroAcesso ? 'Welcome' : 'Tabs'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Cuidador" component={CuidadorScreen} />
        <Stack.Screen name="IdosoForm" component={IdosoFormScreen} />
        <Stack.Screen name="IdosoDetail" component={IdosoDetailScreen} />
        <Stack.Screen name="MedicamentoForm" component={MedicamentoFormScreen} />
        <Stack.Screen name="ConsultaForm" component={ConsultaFormScreen} />
        <Stack.Screen name="ReceitaForm" component={ReceitaFormScreen} />
        <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} />

        {/* ✅ Tela de emergência */}
        <Stack.Screen name="Emergencia" component={EmergenciaScreen} />

        {/* Tela de alarme — modal fullscreen */}
        <Stack.Screen
          name="TelaAlarme"
          component={TelaAlarme}
          options={{ animation: 'fade', presentation: 'fullScreenModal' }}
        />
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
  },
  tabLabel: { ...Typography.labelSmall, marginTop: 2 },
  tabIconWrapper: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  tabIconActive: { backgroundColor: Colors.primaryContainer },
});
