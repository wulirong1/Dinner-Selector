import { useState, createContext, useContext } from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

// 建立廣播站
export const ThemeContext = createContext();

export default function TabLayout() {
  const [isDark, setIsDark] = useState(false);

  // 配色
  const theme = {
    tabBg: isDark ? '#1A1A1A' : '#FFF0DE',
    activeBox: isDark ? '#8FAE9D' : '#A8BCB1',
    text: isDark ? '#FFF0DE' : '#6B4F4F',
    bg: isDark ? '#333333' : '#FFF0DE',
  };

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, theme }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          // tabBarActiveTintColor: theme.text,
          tabBarActiveTintColor: '#6B4F4F', // 先寫死顏色看還會不會噴錯
          tabBarStyle: {
            backgroundColor: theme.tabBg,
            height: 110,
            paddingBottom: 10,
            paddingTop: 10,
            borderTopWidth: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,        // 文字大小
            fontWeight: 'bold',  // 文字粗細
            marginTop: 5,        // ⬅️ 調整這個數字：Icon 與文字之間的距離
            marginBottom: 10,    // ⬅️ 調整這個數字：文字與螢幕底部的距離
          },
        }}
        
      >
        <Tabs.Screen name="menu" options={{ title: 'Menu', tabBarIcon: ({ focused }) => (
          <View style={[styles.iconBox, focused ? { backgroundColor: theme.activeBox } : null]}>
            <MaterialIcons name="menu" size={28} color={focused ? '#FFF' : theme.text} />
          </View>
        )}} />
        
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => (
          <View style={[styles.iconBox, focused ? { backgroundColor: theme.activeBox } : null]}>
            <MaterialIcons name="home" size={28} color={focused ? '#FFF' : theme.text} />
          </View>
        )}} />

        <Tabs.Screen name="setting" options={{ title: 'Setting', tabBarIcon: ({ focused }) => (
          <View style={[styles.iconBox, focused ? { backgroundColor: theme.activeBox } : null]}>
            <MaterialIcons name="settings" size={28} color={focused ? '#FFF' : theme.text} />
          </View>
        )}} />

        <Tabs.Screen name="card" options={{ href: null }} />
        <Tabs.Screen name="addcomment" options={{ href: null }} />
      </Tabs>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 60, height: 35, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});