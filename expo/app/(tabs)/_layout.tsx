import { Tabs, Redirect } from "expo-router";
import { Home, User, BookOpen, MessageCircle } from "lucide-react-native";
import React from "react";
import MiniPlayer from "@/components/MiniPlayer";
import { useTheme } from "@/hooks/theme-context";
import { useAuth } from "@/hooks/auth-context";

export default function TabLayout() {
  const { colors } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/auth" />;
  }

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
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="scripture"
          options={{
            title: "Scripture",
            tabBarIcon: ({ color }) => <BookOpen color={color} size={24} />,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "AI Chat",
            tabBarIcon: ({ color }) => <MessageCircle color={color} size={24} />,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <User color={color} size={24} />,
            headerShown: false,
          }}
        />
      </Tabs>
      <MiniPlayer />
    </>
  );
}