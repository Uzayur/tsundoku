import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { TabConfig, TABS } from '~/src/components/navigation/tabs.config';
import { Fab } from '~/src/components/ui/Fab';
import { theme } from '~/src/theme/theme';

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.beige,
          tabBarInactiveTintColor: '#7f8b93',
          tabBarStyle: {
            backgroundColor: theme.ink,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderTopWidth: 0,
            height: 78,
            paddingTop: 10,
          },
          tabBarLabelStyle: { fontFamily: theme.font.semibold, fontSize: 10 },
        }}
      >
        {TABS.map((tab: TabConfig) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name={tab.icon} size={size} color={color} />
              ),
            }}
          />
        ))}
      </Tabs>
      <Fab onPress={() => router.push('/add')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
