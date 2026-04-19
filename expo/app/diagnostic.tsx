import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { DiagnosticInfo } from '@/components/DiagnosticInfo';
import { useTheme } from '@/hooks/theme-context';

export default function DiagnosticScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Diagnostics',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }} 
      />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <DiagnosticInfo />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
});
