import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, FlatList, Keyboard } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface SearchScreenProps {
  navigation: any;
}

export const SearchScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const recentSearchesList = React.useMemo(() => {
    try {
      const stored = localStorage.getItem('recent_searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const handleSearch = React.useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    setShowSuggestions(true);

    // Simulate API call
    setTimeout(() => {
      const mockResults = [
        { id: 1, name: 'Osnovna Majica', category: 'majice', price: 1290, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
        { id: 2, name: 'Muški Duks', category: 'dukseri', price: 4290, salePrice: 3490, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400' },
        { id: 3, name: 'Ženska Trenerka', category: 'trenerke', price: 3890, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400' },
      ].filter(item => item.name.toLowerCase().includes(query.toLowerCase()));

      setResults(mockResults);
      setLoading(false);
    }, 300);

    // Update suggestions
    const suggestions = ['majica', 'dukseri', 'trenerka', 'čarape', 'šalica', 'kapa']
      .filter(s => s.toLowerCase().includes(query.toLowerCase()));
    setSuggestions(suggestions);
  }, []);


  const handleSubmit = (query: string) => {
    Keyboard.dismiss();
    navigation.navigate('Products', { query });
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowSuggestions(false);
  };

  const handleRecentSearch = (query: string) => {
    setQuery(query);
    handleSubmit(query);
  };

  const clearRecentSearches = () => {
    localStorage.removeItem('recent_searches');
    setRecentSearches([]);
  };

  useEffect(() => {
    if (query) {
      handleSearch(query);
    }
  }, [query]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => Keyboard.dismiss() || navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={24} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pretraži proizvode..."
            value={query}
            onChangeText={handleSearch}
            onSubmitEditing={() => handleSubmit(query)}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.textTertiary}
          />
          {query && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Ionicons name="close-circle" size={24} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
        <View style={styles.suggestionsContainer}>
          {suggestions.length > 0 && (
            <>
              <Text style={styles.suggestionsTitle}>Predlozi</Text>
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSubmit(item)}>
                    <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.suggestionIcon} />
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
          </>)}
          {recentSearches.length > 0 && (
            <>
              <View style={styles.suggestionsHeader}>
                <Text style={styles.suggestionsTitle}>Nedavne pretrage</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={styles.clearText}>Očisti</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={recentSearches}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.recentItem} onPress={() => handleRecentSearch(item)}>
                    <Ionicons name="time" size={20} color={colors.textTertiary} style={styles.recentIcon} />
                    <Text style={styles.recentText}>{item}</Text>
                    <TouchableOpacity onPress={() => {
                      const updated = recentSearches.filter(s => s !== item);
                      localStorage.setItem('recent_searches', JSON.stringify(updated));
                    }}>
                      <Ionicons name="trash" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
          </>)}
        </View>
      )}

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>
            Rezultati za "{query}" ({results.length})
          </Text>
          <FlatList
            data={results}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
                <Image source={{ uri: item.image }} style={styles.resultImage} />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.resultCategory}>{item.category}</Text>
                  <Text style={styles.resultPrice}>
                    {item.salePrice ? `${item.salePrice.toLocaleString('sr-RS')} RSD` : `${item.price.toLocaleString('sr-RS')} RSD`}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.resultsContent}
          />
        </View>
      )}

      {!query && results.length === 0 && !showSuggestions && (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Pretraži proizvode</Text>
          <Text style={styles.emptySubtitle}>Unesite ključnu reč da biste pronašli proizvode</Text>
        </View>
      )}
      </View>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  backButton: {
    padding: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14141c',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  clearButton: {
    padding: 8,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 15,
    color: '#fff',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  recentIcon: {
    marginRight: 12,
  },
  recentText: {
    fontSize: 15,
    color: '#fff',
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  resultsContent: {
    paddingHorizontal: 16,
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: '#14141c',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  resultCategory: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  resultPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e74c3c',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});