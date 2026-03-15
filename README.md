# 💙 LIA — Assistente Digital de Cuidado para Idosos

Aplicativo mobile React Native + Expo para cuidadores de idosos.  
Gerencia medicamentos, consultas, receitas e perfis com notificações locais.

---

## 📂 Estrutura do Projeto

```
LIA/
├── App.js                          # Ponto de entrada
├── app.json                        # Configuração Expo
├── eas.json                        # Configuração EAS Build (APK)
├── package.json
├── babel.config.js
└── src/
    ├── theme.js                    # Design tokens Material 3
    ├── navigation/
    │   └── index.js                # Stack + Bottom Tab navigation
    ├── storage/
    │   └── index.js                # AsyncStorage (cuidadores, idosos, meds, consultas, receitas)
    ├── services/
    │   ├── helpers.js              # IMC, formatação de datas, máscaras, validações
    │   └── notifications.js       # Notificações locais via expo-notifications
    ├── components/
    │   └── index.js                # Componentes reutilizáveis Material 3
    └── screens/
        ├── HomeScreen.js           # Dashboard com resumo do dia
        ├── CuidadorScreen.js       # Perfil do cuidador
        ├── IdososScreen.js         # Lista de idosos
        ├── IdosoFormScreen.js      # Cadastro/edição de idoso
        ├── IdosoDetailScreen.js    # Perfil completo do idoso
        ├── MedicamentosScreen.js   # Lista de medicamentos
        ├── MedicamentoFormScreen.js# Cadastro/edição de medicamento
        ├── ConsultasScreen.js      # Lista de consultas
        ├── ConsultaFormScreen.js   # Cadastro/edição de consulta
        ├── ReceitasScreen.js       # Galeria de receitas
        └── ReceitaFormScreen.js    # Upload de receita
```

---

## 🚀 Como Executar (Expo Go)

### Pré-requisitos
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Aplicativo **Expo Go** no celular Android

### Instalação

```bash
# 1. Entrar na pasta
cd LIA

# 2. Instalar dependências
npm install

# 3. Iniciar o servidor de desenvolvimento
npx expo start

# 4. Escanear o QR Code com o app Expo Go no celular
```

> ⚠️ **Notificações locais** funcionam normalmente em APK de produção.  
> No Expo Go podem ter limitações em alguns dispositivos Android.

---

## 📦 Gerar APK via EAS Build

### 1. Instalar EAS CLI
```bash
npm install -g eas-cli
```

### 2. Fazer login na conta Expo
```bash
eas login
```

### 3. Configurar o projeto (primeira vez)
```bash
eas build:configure
```

### 4. Gerar APK (build de preview)
```bash
eas build --platform android --profile preview
```

### 5. Build de produção (APK ou AAB)
```bash
eas build --platform android --profile production
```

O APK será gerado na nuvem do Expo e disponibilizado para download.

---

## ✅ Funcionalidades

| Funcionalidade | Status |
|---|---|
| Cadastro de Cuidador com foto | ✅ |
| Cadastro de Idosos (CRUD completo) | ✅ |
| Foto de câmera ou galeria | ✅ |
| Cálculo automático de IMC | ✅ |
| Doenças crônicas (seleção múltipla) | ✅ |
| Medicamentos com múltiplos horários | ✅ |
| Consultas médicas agendadas | ✅ |
| Notificação 24h antes da consulta | ✅ |
| Receitas médicas com foto | ✅ |
| Dashboard com resumo do dia | ✅ |
| Alertas de consultas amanhã | ✅ |
| Banco local (AsyncStorage) | ✅ |
| Filtro por idoso | ✅ |
| Navegação Material 3 | ✅ |
| Validação de formulários | ✅ |
| Design acessível (botões grandes) | ✅ |

---

## 🎨 Design System

O app segue o **Material Design 3** do Google:

- **Paleta**: Azul índigo suave + Verde como cor secundária
- **Tipografia**: Tamanhos grandes para melhor leitura
- **Botões**: Altura mínima de 52px para facilitar o toque
- **Cards**: Cantos arredondados com sombra suave
- **Cores de status**: IMC com cores por faixa de risco

---

## 🔧 Configuração de Permissões Android

O arquivo `app.json` já inclui todas as permissões necessárias:
- `CAMERA` — Fotos de perfil e receitas
- `READ/WRITE_EXTERNAL_STORAGE` — Acesso à galeria
- `RECEIVE_BOOT_COMPLETED` — Reativar notificações após reinicialização
- `VIBRATE` — Vibração nas notificações
- `SCHEDULE_EXACT_ALARM` — Notificações exatas
- `POST_NOTIFICATIONS` — Android 13+

---

## 🔄 Migração Futura para Cloud

O storage está encapsulado em `src/storage/index.js`.  
Para migrar para Firebase, Supabase ou API REST:
1. Substituir as funções em `storage/index.js` por chamadas HTTP
2. Manter a mesma interface de retorno
3. As telas não precisarão de alterações

---

## 📱 Requisitos Mínimos

- Android 8.0+ (API 26)
- 50MB de espaço livre
- Câmera (opcional, para fotos)

---

## 🆘 Problemas Comuns

**`npm install` com erros de peer deps:**
```bash
npm install --legacy-peer-deps
```

**Câmera não abre no Expo Go:**
> Use um dispositivo físico. O simulador não tem câmera.

**Notificações não chegam no Expo Go:**
> Compile o APK com `eas build` para notificações completas.

**Erro de `AsyncStorage`:**
```bash
npx expo install @react-native-async-storage/async-storage
```
