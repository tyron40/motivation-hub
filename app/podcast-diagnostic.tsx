import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PodcastDiagnostic } from '@/components/PodcastDiagnostic';

export default function PodcastDiagnosticPage() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingBottom: insets.bottom }}>
      <Stack.Screen
        options={{
          title: 'Podcast Diagnostic',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
        }}
      />
      <PodcastDiagnostic />
    </View>
  );
}
