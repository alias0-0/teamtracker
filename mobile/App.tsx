import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth';
import { RootNavigator } from '@/navigation';
import '@/lib/location-task'; // registers the background task at module load

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
