import { Tabs } from "expo-router";
import { Home, User, BookOpen, MessageCircle } from "lucide-react-native";
import React from "react";
import { MiniPlayer } from "@/components/MiniPlayer";
import { useTheme } from "@/hooks/theme-context";

export default function TabLayout() {
  const { colors } = useTheme();
  
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.tabBar.active,
          tabBarInactiveTintColor: colors.tabBar.inactive,
          tabBarStyle: {
            backgroundColor: colors.tabBar.background,
            borderTopColor: 'rgba(255,255,255,0.1)',
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Home color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="scripture"
          options={{
            title: "Scripture",
            tabBarIcon: ({ color }) => <BookOpen color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "AI Chat",
            tabBarIcon: ({ color }) => <MessageCircle color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <User color={color} size={24} />,
          }}
        />
      </Tabs>
      <MiniPlayer />
    </>
  );
}