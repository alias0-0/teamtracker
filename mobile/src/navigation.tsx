import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { colors } from '@/theme';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerTintColor: colors.fg }}>
        {!session ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={({ navigation }) => ({
                title: 'Team Tracker',
                headerRight: () => (
                  <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                    <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>Profile</Text>
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
