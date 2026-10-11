import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';

export const LoginScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Unesite email i lozinku');
      return;
    }

    try {
      await login(email, password);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error: any) {
      setError(error.message || 'Greška pri prijavljivanju');
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>📦</Text>
          </View>
          <Text style={styles.title}>DALLI</Text>
          <Text style={styles.subtitle}>Premium Online Garderoba</Text>
        </View>

        <Text style={styles.formTitle}>Prijavite se</Text>
        <Text style={styles.formSubtitle}>Ulogujte se da nastavite kupovinu</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Email adresa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCompleteType="email"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.formGroup}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Lozinka</Text>
            <TextInput
              style={styles.input}
              placeholder="Lozinka"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCompleteType="password"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
          <Text style={styles.forgotPasswordText}>Zaboravili ste lozinku?</Text>
        </TouchableOpacity>

        {isLoading ? (
          <TouchableOpacity style={styles.submitButton} disabled>
            <ActivityIndicator size="large" color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={handleLogin} activeOpacity={0.8}>
            <Text style={styles.submitButtonText}>Prijavi se</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ili</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.googleButton} onPress={() => {}}>
          <Text style={styles.googleButtonText}>
            {' '}🔐{' '}Prijava sa Google-om
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.appleButton} onPress={() => {}}>
          <Text style={styles.appleButtonText}>
            {' '}🍎{' '}Prijava sa Apple ID-om
          </Text>
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Nemate nalog? </Text>
          <TouchableOpacity onPress={handleRegister}>
            <Text style={styles.registerLink}>Registrujte se</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cryptoNote}>
          <Text style={styles.cryptoNoteText}>💰 Plaćajte kriptovalutom i uštedite 15%</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputWrapper: {
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#14141c',
    paddingRight: 48,
  },
  inputWrapper: {
    position: 'relative',
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  eyeIcon: {
    fontSize: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a2a3a',
  },
  dividerText: {
    color: '#71717a',
    fontSize: 14,
    marginHorizontal: 16,
  },
  googleButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1e1e2e',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appleButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1e1e2e',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  registerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  registerLink: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  cryptoNote: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  cryptoNoteText: {
    color: '#f7931a',
    fontSize: 13,
    fontWeight: '600',
  },
});
