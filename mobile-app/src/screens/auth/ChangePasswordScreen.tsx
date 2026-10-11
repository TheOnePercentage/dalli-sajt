import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, FlatList, Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

interface ChangePasswordScreenProps {
  navigation: any;
}

export const ChangePasswordScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { user, updateProfile } = useAuth();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Greška', 'Unesite sva polja');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Greška', 'Lozinke se ne podudaraju');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Greška', 'Lozinka mora imati najmanje 6 karaktera');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // In production, call API to change password
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert('Uspeh', 'Lozinka je uspešno promenjena', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Greška', error.message || 'Greška pri promeni lozinke');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Promena lozinke</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Promena lozinke</Text>
          <Text style={styles.formSubtitle}>Unesite trenutnu i novu lozinku</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Trenutna lozinka</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Trenutna lozinka"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                autoComplete="current-password"
                placeholder="Unesite trenutnu lozinku"
              />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowCurrent(!showCurrent)}>
                <Text style={styles.eyeIcon}>{showCurrent ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nova lozinka</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Nova lozinka"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                autoComplete="new-password"
                placeholder="Min. 6 karaktera"
              />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowNew(!showNew)}>
                <Text style={styles.eyeIcon}>{showNew ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>Minimalno 6 karaktera</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Potvrdi novu lozinku</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Potvrdi novu lozinku"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                autoComplete="new-password"
                placeholder="Ponovite lozinku"
              />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowConfirm(!showConfirm)}>
                <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="large" color="#fff" style={styles.loadingSpinner} />
            ) : (
              <Text style={styles.submitButtonText}>Promeni lozinku</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Otkaži</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#14141c',
    paddingRight: 52,
  },
  inputWrapper: {
    position: 'relative',
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  eyeIcon: {
    fontSize: 22,
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  loadingSpinner: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 16,
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
});
