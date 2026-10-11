import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { user, logout, updateProfile } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);

  const handleLogout = async () => {
    Alert.alert('Odjava', 'Da li ste sigurni da želite da se odjavite?', [
      { text: 'Otkaži', style: 'cancel' },
      { text: 'Odjavi se', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleSaveProfile = async () => {
    // Save profile changes
    Alert.alert('Uspeh', 'Profil je ažuriran');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarBtn} onPress={() => {}}>
              <Text style={styles.editAvatarText}>Izmeni</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {user?.role === 'admin' ? 'Administrator' : user?.role === 'vendor' ? 'Prodavac' : 'Kupac'}
            </Text>
          </View>
          {user?.loyaltyTier && (
            <View style={styles.loyaltyBadge}>
              <Text style={styles.loyaltyBadgeText}>
                {user.loyaltyTier === 'platinum' ? '💎' : user.loyaltyTier === 'gold' ? '🥇' : user.loyaltyTier === 'silver' ? '🥈' : '🥉'} 
                {user.loyaltyTier === 'platinum' ? 'Platina' : user.loyaltyTier === 'gold' ? 'Zlato' : user.loyaltyTier === 'silver' ? 'Srebro' : 'Bronza'}
                {' '}• {user.loyaltyPoints?.toLocaleString('sr-RS') || 0} poena
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil</Text>
          <View style={styles.formGroup}>
            <TextInput
              style={styles.input}
              placeholder="Ime"
              defaultValue={user?.firstName}
              onChangeText={(text) => {}}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Prezime"
              defaultValue={user?.lastName}
              onChangeText={(text) => {}}
              autoCapitalize="words"
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Email"
            defaultValue={user?.email}
            onChangeText={(text) => {}}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Telefon"
            defaultValue={user?.phone}
            onChangeText={(text) => {}}
            keyboardType="phone-pad"
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
            <Text style={styles.saveButtonText}>Sačuvaj izmene</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sigurnost</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Lozinka</Text>
              <Text style={styles.settingSubtitle}>Promenite lozinku</Text>
            </View>
            <TouchableOpacity style={styles.chevronButton} onPress={() => navigation.navigate('ChangePassword')}>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Dvofaktorska autentifikacija</Text>
              <Text style={styles.settingSubtitle}>Dodatni nivo sigurnosti</Text>
            </View>
            <TouchableOpacity onPress={() => {}}>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Biometrijska prijava</Text>
              <Text style={styles.settingSubtitle}>Face ID / Touch ID / Otisak prsta</Text>
            </View>
            <TouchableOpacity onPress={() => setBiometricEnabled(!biometricEnabled)}>
              <View style={[
                styles.toggleTrack,
                biometricEnabled && styles.toggleTrackOn
              ]}>
                <View style={[
                  styles.toggleThumb,
                  biometricEnabled && styles.toggleThumbOn
                ]} />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Promena lozinke</Text>
              <Text style={styles.settingSubtitle}>Ažurirajte svoju lozinku</Text>
            </View>
            <TouchableOpacity style={styles.chevronButton} onPress={() => navigation.navigate('ChangePassword')}>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Podešavanja</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Obaveštenja</Text>
              <Text style={styles.settingSubtitle}>Push obaveštenja za narudžbine i promocije</Text>
            </View>
            <TouchableOpacity onPress={() => setNotificationsEnabled(!notificationsEnabled)}>
              <View style={[
                styles.toggleTrack,
                notificationsEnabled && styles.toggleTrackOn
              ]}>
                <View style={[
                  styles.toggleThumb,
                  notificationsEnabled && styles.toggleThumbOn
                ]} />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Tamna tema</Text>
              <Text style={styles.settingSubtitle}>Prilagodi se sistemu</Text>
            </View>
            <TouchableOpacity onPress={() => setDarkMode(!darkMode)}>
              <View style={[
                styles.toggleTrack,
                darkMode && styles.toggleTrackOn
              ]}>
                <View style={[
                  styles.toggleThumb,
                  darkMode && styles.toggleThumbOn
                ]} />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Jezik</Text>
              <Text style={styles.settingSubtitle}>Srpski (ćirilica)</Text>
            </View>
            <TouchableOpacity style={styles.chevronButton} onPress={() => {}}>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Valuta</Text>
              <Text style={styles.settingSubtitle}>RSD (Dinari)</Text>
            </View>
            <TouchableOpacity style={styles.chevronButton} onPress={() => {}}>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aplikacija</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Verzija aplikacije</Text>
              <Text style={styles.settingSubtitle}>1.0.0</Text>
            </View>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>O nama</Text>
              <Text style={styles.settingSubtitle}>Verzija, licenca, tim</Text>
            </View>
            <TouchableOpacity style={styles.chevronButton} onPress={() => {}}>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Politika privatnosti</Text>
              <Text style={styles.settingSubtitle}>Kako koristimo vaše podatke</Text>
            </View>
            <TouchableOpacity style={styles.chevronButton} onPress={() => {}}>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Uslovi korišćenja</Text>
              <Text style={styles.settingSubtitle}>Pravila korišćenja aplikacije</Text>
            </View>
            <TouchableOpacity style={styles.chevronButton} onPress={() => {}}>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Odjavi se</Text>
        </TouchableOpacity>

        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>DALLI v1.0.0</Text>
          <Text style={styles.builtWith}>Izgrađeno sa ❤️ u Srbiji</Text>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#2a2a3a',
  },
  avatarText: {
    fontSize: 40,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0a0a0f',
  },
  editAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#e74c3c',
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loyaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(247,147,26,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(247,147,26,0.3)',
  },
  loyaltyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f7931a',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#14141c',
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  toggleTrack: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a2a3a',
  },
  toggleTrackOn: {
    backgroundColor: '#e74c3c',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 14,
    backgroundColor: '#fff',
    marginLeft: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: {
    transform: [{ translateX: 24 }],
  },
  toggleTrackOn: {
    backgroundColor: '#e74c3c',
  },
  chevronButton: {
    padding: 8,
  },
  logoutButton: {
    marginTop: 16,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  appInfo: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
    alignItems: 'center',
  },
  appVersion: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  builtWith: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
});
