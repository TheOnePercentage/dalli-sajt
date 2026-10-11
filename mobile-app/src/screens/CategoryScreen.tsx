import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, FlatList } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface CategoryScreenProps {
  navigation: any;
  route: { params?: { category?: string } };
}

const categories = [
  { id: 'muska', name: 'Muška Garderoba', icon: '👨', color: '#3b82f6', subcategories: ['majice', 'trenerke', 'duksevi'] },
  { id: 'zenska', name: 'Ženska Garderoba', icon: '👩', color: '#ec4899', subcategories: ['majice', 'trenerke', 'duksevi'] },
  { id: 'dukseri', name: 'Duksevi', icon: '🧥', color: '#16a34a', subcategories: ['kapuljaca', 'sportska', 'oversized'] },
  { id: 'trenerke', name: 'Trenerke', icon: '🏃', color: '#f59e0b', subcategories: ['sportska', 'kapuljaca', 'hoodie'] },
  { id: 'carape', name: 'Čarape', icon: '🧦', color: '#8b5cf6', subcategories: ['duge', 'kratke', 'sport'] },
  { id: 'ostalo', name: 'Ostalo', icon: '📦', color: '#6b7280', subcategories: ['šalice', 'šalovi', 'rukavice'] },
];

export const CategoryScreen = ({ navigation, route }: any) => {
  const { colors } = useTheme();
  const { params } = route.params || {};
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(params.category || null);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const navigateToProducts = (categoryId: string, subcategory?: string) => {
    navigation.navigate('Products', { category: categoryId, subcategory });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Kategorije</Text>
          <Text style={styles.headerSubtitle}>Izaberite kategoriju proizvoda</Text>
        </View>

        <FlatList
          data={categories}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.categoryCard, { borderColor: item.color }]}
              onPress={() => toggleCategory(item.id)}
            >
              <View style={[styles.categoryHeader, { borderColor: item.color }]}>
                <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
                  <Text style={styles.categoryIconText}>{item.icon}</Text>
                </View>
                <View style={styles.categoryHeaderContent}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  <Text style={styles.categorySubtext}>
                    {item.subcategories.length} podkategorija
                  </Text>
                </View>
                <Ionicons
                  name={expandedCategory === item.id ? 'remove' : 'add'}
                  size={24}
                  color={colors.textTertiary}
                />
              </View>
              {expandedCategory === item.id && (
                <View style={styles.subcategories}>
                  {item.subcategories.map((sub) => (
                    <TouchableOpacity
                      key={sub}
                      style={styles.subcategoryItem}
                      onPress={() => navigation.navigate('Products', { category: item.id, subcategory: sub })}
                    >
                      <Text style={styles.subcategoryName}>
                        {sub.charAt(0).toUpperCase() + sub.slice(1)}
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
      />
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  categoryCard: {
    backgroundColor: '#14141c',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconText: {
    fontSize: 24,
  },
  categoryHeaderContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  categorySubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  subcategories: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  subcategoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});