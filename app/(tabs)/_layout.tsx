import { Tabs } from "expo-router";
import { Home, User, BookOpen, MessageCircle } from "lucide-react-native";
import React from "react";
import Colors from "@/constants/colors";
import { MiniPlayer } from "@/components/MiniPlayer";
import { StyleSheet } from "react-native";

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.tabBar.active,
          tabBarInactiveTintColor: Colors.tabBar.inactive,
          tabBarStyle: styles.tabBarStyle,
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

const styles = StyleSheet.create({
  tabBarStyle: {
    backgroundColor: Colors.tabBar.background,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
});