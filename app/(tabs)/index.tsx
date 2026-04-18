import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppTheme, SportCategories } from "@/constants/theme";
import { CourtsService, Court } from "@/services/courts.service";
import { NotificationsService, Notification } from "@/services/notifications.service";
import { supabase } from "@/lib/supabase";
import { AthloLogo } from "@/assets/AthloLogo";

const C = AppTheme.colors;
const R = AppTheme.radius;
const T = AppTheme.typography;

const FALLBACK_COURTS: Court[] = [
  {
    field_id: 1, field_name: "Pádel Club Miramontes", sport_name: "Pádel",
    price_per_hour: 2450, rating: 4.5, review_count: 38,
    image_url: "https://images.unsplash.com/photo-1663680941982-522814fd1e6a?w=800",
    is_available: true, is_premium: false, surface_type: "Cristal",
    capacity: 4, description: null, facility_name: "Club Miramontes",
    city: "Tegucigalpa", address: "Col. Miramontes",
    has_lighting: true, has_changing_rooms: true, parking_available: true,
  },
  {
    field_id: 2, field_name: "Tenis Club Tegucigalpa", sport_name: "Tenis",
    price_per_hour: 3675, rating: 4.8, review_count: 62,
    image_url: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800",
    is_available: true, is_premium: true, surface_type: "Dura",
    capacity: 4, description: null, facility_name: "Tenis Club TGU",
    city: "Tegucigalpa", address: "Col. Palmira",
    has_lighting: true, has_changing_rooms: true, parking_available: true,
  },
  {
    field_id: 3, field_name: "Canchas Sintéticas Honduras", sport_name: "Fútbol",
    price_per_hour: 2940, rating: 4.3, review_count: 95,
    image_url: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800",
    is_available: true, is_premium: false, surface_type: "Sintética",
    capacity: 10, description: null, facility_name: "Canchas Agua Dulce",
    city: "Tegucigalpa", address: "Residencial Agua Dulce",
    has_lighting: true, has_changing_rooms: false, parking_available: true,
  },
];

export default function HomeScreen() {
  const [featuredCourts, setFeaturedCourts] = useState<Court[]>([]);
  const [popularCourts, setPopularCourts] = useState<Court[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    loadData();
    loadUserName();
  }, []);

  const loadUserName = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const meta = session?.user?.user_metadata;
    if (meta?.name) setUserName(meta.name.split(" ")[0]);
  };

  const loadData = async () => {
    try {
      const [featured, popular, notifs] = await Promise.allSettled([
        CourtsService.getFeaturedCourts(),
        CourtsService.getPopularCourts(),
        NotificationsService.getNotifications(),
      ]);
      setFeaturedCourts(featured.status === "fulfilled" ? featured.value.courts : FALLBACK_COURTS.slice(0, 2));
      setPopularCourts(popular.status === "fulfilled" ? popular.value.courts : FALLBACK_COURTS);
      if (notifs.status === "fulfilled") setNotifications(notifs.value.notifications);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleCourtPress = (court: Court) =>
    router.push({ pathname: "/screens/reserve", params: { courtId: court.field_id } });

  const handleCategoryPress = (cat: string) => {
    setSelectedCategory(cat);
    router.push({ pathname: "/screens/all-courts", params: { category: cat } });
  };

  const handleSearch = () => {
    if (searchQuery.trim())
      router.push({ pathname: "/screens/all-courts", params: { search: searchQuery } });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
      >
        {/* Header */}
        <View style={styles.headerRight}>
          <AthloLogo size={150} variant="dark" />
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => setShowNotifications(!showNotifications)}
            >
              <Ionicons name="notifications-outline" size={22} color={C.white} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>
              Hola, {userName || "Atleta"}
            </Text>
            <Ionicons name="person-circle-outline" size={18} color={C.accent} />
          </View>
          <Text style={styles.subtitle}>¿Qué cancha reservamos hoy?</Text>
        </View>

        {/* Notificaciones desplegables */}
        {showNotifications && (
          <View style={styles.notifPanel}>
            {notifications.length === 0 ? (
              <View style={styles.inlineInfoRow}>
                <Ionicons name="notifications-off-outline" size={16} color={C.textMuted} />
                <Text style={styles.notifEmpty}>Sin notificaciones nuevas</Text>
              </View>
            ) : (
              notifications.slice(0, 4).map((n) => (
                <TouchableOpacity
                  key={n.notification_id}
                  style={[styles.notifItem, !n.is_read && styles.notifItemUnread]}
                  onPress={async () => {
                    await NotificationsService.markAsRead(n.notification_id);
                    setNotifications((prev) =>
                      prev.map((x) =>
                        x.notification_id === n.notification_id ? { ...x, is_read: true } : x
                      )
                    );
                  }}
                >
                  <Ionicons name="mail-outline" size={15} color={C.accent} />
                  <Text style={styles.notifText} numberOfLines={2}>{n.message}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar canchas, deportes, lugares..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor={C.textSoft}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleSearch}>
              <Ionicons name="arrow-forward-circle" size={22} color={C.accent} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categorías de deportes */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="grid-outline" size={16} color={C.accent} />
            <Text style={styles.sectionTitleLight}>Deportes</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {SportCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                onPress={() => handleCategoryPress(cat.id)}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryLabel, selectedCategory === cat.id && styles.categoryLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Canchas Destacadas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleInline}>
              <Ionicons name="star-outline" size={16} color={C.accent} />
              <Text style={styles.sectionTitleInlineLight}>Canchas Destacadas</Text>
            </View>
            <TouchableOpacity onPress={() => router.push({ pathname: "/screens/all-courts", params: { category: "Todos" } })}>
              <Text style={styles.seeAll}>Ver más</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20 }}>
            {featuredCourts.map((court) => (
              <FeaturedCard key={court.field_id} court={court} onPress={handleCourtPress} />
            ))}
          </ScrollView>
        </View>

        {/* Canchas Populares */}
        <View style={styles.sectionWhite}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleInline}>
              <Ionicons name="flame-outline" size={16} color={C.accent} />
              <Text style={styles.sectionTitleDark}>Canchas Populares</Text>
            </View>
            <TouchableOpacity onPress={() => router.push({ pathname: "/screens/all-courts", params: { category: "Todos" } })}>
              <Text style={styles.seeAllDark}>Ver más</Text>
            </TouchableOpacity>
          </View>
          {popularCourts.map((court) => (
            <PopularCard key={court.field_id} court={court} onPress={handleCourtPress} />
          ))}
          <View style={{ height: 8 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


function FeaturedCard({ court, onPress }: { court: Court; onPress: (c: Court) => void }) {
  return (
    <TouchableOpacity style={styles.featuredCard} onPress={() => onPress(court)} activeOpacity={0.9}>
      <Image
        source={{ uri: court.image_url ?? "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=600" }}
        style={styles.featuredImage}
      />
      <View style={styles.featuredOverlay}>
        {court.is_premium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={10} color="#fff" />
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        )}
        <View style={styles.featuredInfo}>
          <Text style={styles.featuredName} numberOfLines={1}>{court.field_name}</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.featuredLocation} numberOfLines={1}>{court.city}</Text>
          </View>
          <View style={styles.featuredBottom}>
            <View style={styles.priceTag}>
              <Text style={styles.featuredPrice}>L {court.price_per_hour.toFixed(0)}/hr</Text>
            </View>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={C.starColor} />
              <Text style={styles.ratingText}>{court.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PopularCard({ court, onPress }: { court: Court; onPress: (c: Court) => void }) {
  return (
    <TouchableOpacity style={styles.popularCard} onPress={() => onPress(court)} activeOpacity={0.85}>
      <Image
        source={{ uri: court.image_url ?? "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=400" }}
        style={styles.popularImage}
      />
      <View style={styles.popularInfo}>
        <Text style={styles.popularName} numberOfLines={1}>{court.field_name}</Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={12} color={C.textMuted} />
          <Text style={styles.popularLocation} numberOfLines={1}>{court.city}</Text>
        </View>
        <View style={styles.popularBottom}>
          <Text style={styles.popularPrice}>
            L {court.price_per_hour.toFixed(0)}<Text style={styles.popularPriceUnit}>/hr</Text>
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={C.starColor} />
            <Text style={styles.popularRating}>{court.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.arrowCircle}>
        <Ionicons name="chevron-forward" size={14} color={C.accent} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.overlay },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.background },

  
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(1,182,239,0.18)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(1,182,239,0.3)",
  },
  headerLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingLeft: 140, 
  },
  notifBtn2: {
    width: 40, 
    height: 40, 
    borderRadius: 20,
    backgroundColor: "rgba(1,182,239,0.18)",
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 1, 
    borderColor: "rgba(1,182,239,0.3)",
  },
  notifBadge: {
    position: "absolute", top: 5, right: 5,
    backgroundColor: C.highlight,
    borderRadius: 7, minWidth: 14, height: 14,
    justifyContent: "center", alignItems: "center",
  },
  notifBadgeText: { color: "#fff", fontSize: 8, fontWeight: "700" },

  greetingSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18 },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  greeting: { fontSize: T.heading, fontWeight: "700", color: "#fff" },
  subtitle: { fontSize: T.small, color: "rgba(255,255,255,0.6)", marginTop: 3 },

  
  notifPanel: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: R.lg, padding: 12,
    ...AppTheme.shadow.card,
  },
  notifItem: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  notifItemUnread: { backgroundColor: C.accentLight, borderRadius: 8 },
  notifText: { flex: 1, fontSize: T.small, color: C.text },
  inlineInfoRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  notifEmpty: { textAlign: "center", color: C.textMuted, fontSize: T.small },

  
  searchContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white,
    marginHorizontal: 20, marginBottom: 20,
    borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12,
    gap: 10, ...AppTheme.shadow.card,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: T.body, color: C.text },


  section: { marginBottom: 10 },
  sectionWhite: {
    backgroundColor: C.white,
    borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    paddingTop: 22, paddingHorizontal: 20,
    paddingBottom: 0,
  },
  sectionTitleRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitleInline: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitleLight: { fontSize: T.body, fontWeight: "700", color: "#fff" },
  sectionTitleInlineLight: { fontSize: T.body, fontWeight: "700", color: "#fff" },
  sectionTitleDark: { fontSize: T.body, fontWeight: "700", color: C.text },
  seeAll: { fontSize: T.small, color: C.accent, fontWeight: "600" },
  seeAllDark: { fontSize: T.small, color: C.accent, fontWeight: "600" },

 
  categoriesScroll: { paddingLeft: 20, paddingBottom: 4 },
  categoryChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(1,182,239,0.15)",
    paddingHorizontal: 14, paddingVertical: 0,
    borderRadius: R.xxl, marginRight: 10,
    borderWidth: 1, borderColor: "rgba(1,182,239,0.2)",
    height: 36,
  },
  categoryChipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  categoryIcon: { fontSize: 15 },
  categoryLabel: { color: "rgba(255,255,255,0.85)", fontSize: T.small, fontWeight: "600" },
  categoryLabelActive: { color: "#fff" },

 
  featuredCard: {
    width: 240, height: 162, borderRadius: R.lg,
    marginRight: 14, overflow: "hidden",
    ...AppTheme.shadow.strong,
  },
  featuredImage: { width: "100%", height: "100%", position: "absolute" },
  featuredOverlay: {
    flex: 1, justifyContent: "space-between", padding: 12,
    backgroundColor: "rgba(3,47,94,0.45)",
  },
  premiumBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start",
    backgroundColor: C.highlight,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: R.xs,
  },
  premiumText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  featuredInfo: {},
  featuredName: { color: "#fff", fontSize: T.body, fontWeight: "700" },
  featuredLocation: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginLeft: 2 },
  featuredBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  priceTag: {
    backgroundColor: C.accent,
    borderRadius: R.xs,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  featuredPrice: { color: "#fff", fontSize: 13, fontWeight: "700" },


  popularCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white,
    borderRadius: R.md, marginBottom: 12, padding: 12,
    ...AppTheme.shadow.card,
    borderWidth: 1, borderColor: C.border,
  },
  popularImage: { width: 64, height: 64, borderRadius: R.sm },
  popularInfo: { flex: 1, marginLeft: 12 },
  popularName: { fontSize: T.body, fontWeight: "700", color: C.text },
  popularLocation: { fontSize: 11, color: C.textMuted, marginLeft: 2, flex: 1 },
  popularBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  popularPrice: { fontSize: T.body, fontWeight: "700", color: C.primary },
  popularPriceUnit: { fontSize: 11, fontWeight: "400" },
  popularRating: { fontSize: 12, color: C.text, fontWeight: "600", marginLeft: 2 },
  arrowCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.accentLight,
    justifyContent: "center", alignItems: "center",
  },
  row: { flexDirection: "row", alignItems: "center" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
