import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export const ReferralScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text>Referral</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});
