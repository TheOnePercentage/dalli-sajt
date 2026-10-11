import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useCartStore } from '../../store/cartStore';
import { useAuth } from '../../hooks/useAuth';
import { NavigationProp } from '@react-navigation/native';

interface CheckoutScreenProps {
  navigation: any;
}

export const CheckoutScreen = ({ navigation }: CheckoutScreenProps) => {
  const { colors } = useTheme();
  const { items, subtotal, discount, shippingCost, total, clearCart, appliedPromoCode } = useCartStore();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [shippingMethod, setShippingMethod] = useState('post_express');
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    postalCode: '',
    country: 'RS',
    // Payment
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
    // Crypto
    cryptoCurrency: 'BTC',
    cryptoAddress: '',
    // Bank transfer
    bankAccount: '',
  });

  const handleSubmit = async () => {
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'postalCode'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      Alert.alert('Greška', `Popunite sva obavezna polja: ${missingFields.join(', ')}`);
      return;
    }

    if (paymentMethod === 'card' && (!formData.cardNumber || !formData.expiryDate || !formData.cvv || !formData.cardName)) {
      Alert.alert('Greška', 'Unesite podatke kartice');
      return;
    }

    if (paymentMethod.startsWith('crypto') && !formData.cryptoAddress) {
      Alert.alert('Greška', 'Unesite adresu kripto novčanika');
      return;
    }

    setLoading(true);
    
    try {
      // In production, call API to create order
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful order
      Alert.alert('Uspeh!', 'Vaša porudžbina je uspešno kreirana.', [
        {
          text: 'OK',
          onPress: () => {
            // Clear cart
            // useCartStore.getState().clearCart();
            navigation.navigate('Home');
          }
        },
      ]);
      } catch (error) {
        Alert.alert('Greška', 'Došlo je do greške. Pokušajte ponovo.');
      } finally {
        setLoading(false);
      }
    };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((stepNum) => (
        <View key={stepNum} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            step === stepNum ? styles.stepActive : step < stepNum ? styles.stepCompleted : styles.stepInactive
          ]}>
            <Text style={[
              styles.stepNumber,
              step === stepNum ? styles.stepNumberActive : step < stepNum ? styles.stepNumberCompleted : styles.stepNumberInactive
            ]}>
              {stepNum}
            </Text>
          </View>
          <Text style={[
            styles.stepLabel,
            step === stepNum ? styles.stepLabelActive : {}
          ]}>
            {['Adresa', 'Placanje', 'Potvrda'][stepNum - 1]}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <ScrollView contentContainerStyle={styles.formContainer}>
            <Text style={styles.sectionTitle}>Adresa dostave</Text>
            <View style={styles.formRow}>
              <TextInput
                style={styles.input}
                placeholder="Ime"
                value={formData.firstName}
                onChangeText={(text) => setFormData({...formData, firstName: text})}
                placeholder="Ime"
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Prezime"
                value={formData.lastName}
                onChangeText={(text) => setFormData({...formData, lastName: text})}
                autoCapitalize="words"
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              style={styles.input}
              placeholder="Telefon"
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <TextInput
              style={styles.input}
              placeholder="Adresa"
              value={formData.address}
              onChangeText={(text) => setFormData({...formData, address: text})}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Stan / Broj (opciono)"
              value={formData.apartment}
              onChangeText={(text) => setFormData({...formData, apartment: text})}
              autoCapitalize="words"
            />
            <View style={styles.formRow}>
              <TextInput
                style={styles.inputHalf}
                placeholder="Grad"
                value={formData.city}
                onChangeText={(text) => setFormData({...formData, city: text})}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.inputHalf}
                placeholder="Poštanski broj"
                value={formData.postalCode}
                onChangeText={(text) => setFormData({...formData, postalCode: text})}
                keyboardType="numeric"
              />
            </View>
          </ScrollView>
        </View>
      ) : step === 2 ? (
          <ScrollView contentContainerStyle={styles.formContainer}>
            <Text style={styles.sectionTitle}>Način plaćanja</Text>
            <View style={styles.paymentOptions}>
              {[
                { id: 'cash_on_delivery', label: '💵 Plaćanje pri preuzimanju', desc: 'Platite gotovinom ili karticom kod kurira' },
                { id: 'card', label: '💳 Kartica', desc: 'Visa, Mastercard, Maestro' },
                { id: 'bank_transfer', label: '🏦 Bankovski transfer', desc: 'IBAN plaćanje' },
                { id: 'crypto_btc', label: '₿ Bitcoin', desc: 'BTC - 15% popust' },
                { id: 'crypto_eth', label: 'Ξ Ethereum', desc: 'ETH - 15% popust' },
                { id: 'crypto_usdt', label: '💲 USDT (TRC20/ERC20)', desc: 'USDT - 15% popust' },
                { id: 'crypto_usdc', label: '💲 USDC', desc: 'USDC - 15% popust' },
              ].map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentOption,
                    paymentMethod === method.id && styles.paymentOptionSelected
                  ]}
                  onPress={() => setPaymentMethod(method.id)}
                >
                  <View style={styles.paymentOptionContent}>
                    <Text style={styles.paymentOptionLabel}>{method.label}</Text>
                    <Text style={styles.paymentOptionDesc}>{method.desc}</Text>
                  </View>
                  <View style={[
                    styles.radioButton,
                    paymentMethod === method.id && styles.radioSelected
                  ]}>
                    <View style={[
                      styles.radioInner,
                      paymentMethod === method.id && styles.radioInnerSelected
                    ]} />
                  </View>
                </TouchableOpacity>
              ))}
              
              {paymentMethod === 'card' && (
                <View style={styles.cardForm}>
                  <Text style={styles.sectionTitle}>Podaci kartice</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Broj kartice"
                    value={formData.cardNumber}
                    onChangeText={(text) => setFormData({...formData, cardNumber: text.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim()})}
                    placeholder="1234 5678 9012 3456"
                    keyboardType="numeric"
                    maxLength={19}
                    autoComplete="cc-number"
                  />
                  <View style={styles.formRow}>
                    <TextInput
                      style={styles.inputHalf}
                      placeholder="MM/YY"
                      value={formData.expiryDate}
                      onChangeText={(text) => setFormData({...formData, expiryDate: text.replace(/[^\d]/g, '').replace(/(\d{2})(\d{2})/, '$1/$2').substring(0, 5)})}
                      placeholder="MM/YY"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                    <TextInput
                      style={styles.inputHalf}
                      placeholder="CVV"
                      value={formData.cvv}
                      onChangeText={(text) => setFormData({...formData, cvv: text})}
                      secureTextEntry
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Ime na kartici"
                    value={formData.cardName}
                    onChangeText={(text) => setFormData({...formData, cardName: text})}
                    autoCapitalize="words"
                  />
                </View>
              )}

              {paymentMethod.startsWith('crypto') && (
                <View style={styles.cryptoForm}>
                  <Text style={styles.sectionTitle}>Kripto plaćanje</Text>
                  <Text style={styles.cryptoInfo}>
                    Pošaljite tačan iznos na adresu ispod. Popust od 15% će biti automatski primenjen.
                  </Text>
                  <View style={styles.cryptoAddress}>
                    <Text style={styles.cryptoAddressLabel}>Adresa za plaćanje ({formData.cryptoCurrency}):</Text>
                    <Text style={styles.cryptoAddressValue}>{formData.cryptoAddress || 'Generiše se pri čekautu'}</Text>
                    <TouchableOpacity style={styles.copyButton} onPress={() => {}}>
                      <Text style={styles.copyButtonText}>Kopiraj adresu</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cryptoAmount}>
                    <Text style={styles.cryptoAmountLabel}>Iznos za plaćanje:</Text>
                    <Text style={styles.cryptoAmountValue}>{(total * 0.85).toFixed(8)} {formData.cryptoCurrency}</Text>
                  </View>
                </View>
              )}

              {paymentMethod === 'bank_transfer' && (
                <View style={styles.bankForm}>
                  <Text style={styles.sectionTitle}>Bankovski transfer</Text>
                  <Text style={styles.bankInfo}>
                    Iznos: {total.toLocaleString('sr-RS')} RSD\n
                    Primac: DALLI d.o.o.\n
                    IBAN: RS3526500000000123456789\n
                    Svrha plaćanja: Porudžbina #{orderNumber}
                  </Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Napomena za porudžbinu (opciono)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Napomena za kurira..."
                value={formData.notes}
                onChangeText={(text) => setFormData({...formData, notes: text})}
                multiline
                numberOfLines={3}
              />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.confirmContainer}>
              <Text style={styles.sectionTitle}>Pregled porudžbine</Text>
              <View style={styles.orderSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Međuzbir</Text>
                  <Text style={styles.summaryValue}>{subtotal.toLocaleString('sr-RS')} RSD</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Popust ({discount}%)</Text>
                    <Text style={[styles.summaryValue, styles.discountValue]}>-{discountAmount.toLocaleString('sr-RS')} RSD</Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Dostava</Text>
                  <Text style={styles.summaryValue}>{shippingCost === 0 ? 'Besplatno' : shippingCost.toLocaleString('sr-RS') + ' RSD'}</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Ukupno za plaćanje</Text>
                  <Text style={styles.totalValue}>{total.toLocaleString('sr-RS')} RSD</Text>
                </View>
              </View>

              <View style={styles.confirmSection}>
                <Text style={styles.confirmText}>
                  Potvrđujem da su svi podaci tačni i slažem se sa <Text style={{color: '#e74c3c', textDecorationLine: 'underline'}}>Uslovima korišćenja</Text> i <Text style={{color: '#e74c3c', textDecorationLine: 'underline'}}>Politikom privatnosti</Text>.
                </Text>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit} disabled={loading}>
                  <ActivityIndicator size="large" color="#fff" style={styles.loadingSpinner} />
                  <Text style={styles.confirmBtnText}>{loading ? 'Kreiranje porudžbine...' : 'Potvrdi i plati'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </ScrollView>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0a0a0f',
    },
    stepIndicator: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#2a2a3a',
    },
    stepContainer: {
      flex: 1,
      alignItems: 'center',
    },
    stepCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: '#2a2a3a',
      backgroundColor: '#14141c',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    stepActive: {
      borderColor: '#e74c3c',
      backgroundColor: '#e74c3c',
    },
    stepCompleted: {
      borderColor: '#16a34a',
      backgroundColor: '#16a34a',
    },
    stepInactive: {
      borderColor: '#2a2a3a',
      backgroundColor: '#14141c',
    },
    stepNumber: {
      fontSize: 14,
      fontWeight: '700',
      color: '#71717a',
    },
    stepNumberActive: {
      color: '#fff',
    },
    stepNumberCompleted: {
      color: '#fff',
    },
    stepNumberInactive: {
      color: '#71717a',
    },
    stepLabel: {
      fontSize: 11,
      color: '#71717a',
      marginTop: 4,
      textAlign: 'center',
    },
    stepLabelActive: {
      color: '#e74c3c',
      fontWeight: '600',
    },
    formContainer: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 16,
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
    },
    inputHalf: {
      flex: 1,
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
    },
    inputHalf: {
      flex: 1,
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
      marginBottom: 12,
      marginTop: 8,
    },
    paymentOptions: {
      gap: 10,
    },
    paymentOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: '#14141c',
      borderWidth: 1,
      borderColor: '#2a2a3a',
      borderRadius: 12,
    },
    paymentOptionSelected: {
      borderColor: '#e74c3c',
      borderWidth: 2,
      backgroundColor: 'rgba(231,76,60,0.1)',
    },
    paymentOptionContent: {
      flex: 1,
    },
    paymentOptionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    paymentOptionDesc: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.5)',
      marginTop: 2,
    },
    radioButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#2a2a3a',
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioSelected: {
      borderColor: '#e74c3c',
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: 'transparent',
    },
    radioInnerSelected: {
      backgroundColor: '#e74c3c',
    },
    cardForm: {
      marginTop: 16,
      padding: 16,
      backgroundColor: '#14141c',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#2a2a3a',
    },
    cryptoForm: {
      marginTop: 16,
      padding: 16,
      backgroundColor: 'rgba(247,147,26,0.1)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(247,147,26,0.3)',
    },
    cryptoInfo: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.7)',
      lineHeight: 20,
      marginBottom: 12,
    },
    cryptoAddress: {
      backgroundColor: '#0a0a0f',
      borderRadius: 10,
      padding: 12,
      marginTop: 8,
    },
    cryptoAddressLabel: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.5)',
      marginBottom: 4,
    },
    cryptoAddressValue: {
      fontSize: 13,
      fontFamily: 'monospace',
      color: '#fff',
      wordBreak: 'break-all',
    },
    cryptoAmount: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#2a2a3a',
    },
    cryptoAmountLabel: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.5)',
    },
    cryptoAmountValue: {
      fontSize: 18,
      fontWeight: '700',
      color: '#f7931a',
      fontFamily: 'monospace',
    },
    bankForm: {
      marginTop: 16,
      padding: 16,
      backgroundColor: 'rgba(22,163,74,0.1)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(22,163,74,0.3)',
    },
    bankInfo: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.7)',
      fontFamily: 'monospace',
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
      marginBottom: 12,
    },
    confirmText: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.6)',
      lineHeight: 20,
    },
    confirmBtn: {
      height: 56,
      borderRadius: 16,
      backgroundColor: '#e74c3c',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    loadingSpinner: {
      marginRight: 8,
    },
    confirmBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    confirmContainer: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.7)',
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    discountValue: {
      color: '#ef4444',
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: '#2a2a3a',
      paddingTop: 12,
      marginTop: 8,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    totalValue: {
      fontSize: 20,
      fontWeight: '700',
      color: '#e74c3c',
    },
    confirmSection: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
    },
    confirmText: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.6)',
      lineHeight: 20,
      marginBottom: 16,
    },
    confirmBtn: {
      height: 56,
      borderRadius: 16,
      backgroundColor: '#e74c3c',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingSpinner: {
      marginRight: 8,
    },
    confirmBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    confirmContainer: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
    },
    inputHalf: {
      flex: 1,
    },
  };

export { CheckoutScreen };