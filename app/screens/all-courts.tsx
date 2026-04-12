import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AppTheme, SportCategories } from "@/constants/theme";
import { CourtsService, Court } from "@/services/courts.service";

const C = AppTheme.colors;
const R = AppTheme.radius;
const T = AppTheme.typography;

type SortKey = "rating" | "price_asc" | "price_desc";

export default function AllCourtsScreen() {
  const { category: initCategory, search: initSearch } =
    useLocalSearchParams<{ category?: string; search?: string }>();

  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(initCategory ?? "Todos");
  const [searchQuery, setSearchQuery] = useState(initSearch ?? "");
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  useEffect(() => { loadCourts(); }, [selectedCategory]);

  // Mapa de nombres del chip al nombre exacto en la base de datos
  // Si agregas más deportes a sport_types, agrégalos aquí también
  const SPORT_NAME_MAP: Record<string, string> = {
    "Fútbol":  "Fútbol",
    "Pádel":   "Pádel",
    "Tenis":   "Tenis",
    "Básquet": "Básquet",
    "Béisbol": "Béisbol",
    "Voleibol":"Voleibol",
  };

  const loadCourts = async () => {
    setLoading(true);
    try {
      // Enviar "Todos" sin filtro, o el nombre mapeado al backend
      const sportParam = selectedCategory !== "Todos"
        ? (SPORT_NAME_MAP[selectedCategory] ?? selectedCategory)
        : undefined;
      const data = await CourtsService.getAllCourts(sportParam);
      setCourts(data.courts);
    } catch {
      setCourts([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredCourts = courts
    .filter((c) => {
      // Filtrar por categoría seleccionada (además del filtro del backend)
      if (selectedCategory !== "Todos") {
        const sportMatch = c.sport_name.toLowerCase().includes(selectedCategory.toLowerCase()) ||
          selectedCategory.toLowerCase().includes(c.sport_name.toLowerCase());
        if (!sportMatch) return false;
      }
      // Filtrar por búsqueda de texto
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.field_name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.sport_name.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price_asc") return a.price_per_hour - b.price_per_hour;
      return b.price_per_hour - a.price_per_hour;
    });

  const SORT_OPTIONS: { key: SortKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "rating", label: "Mejor calificadas", icon: "star-outline" },
    { key: "price_asc", label: "Menor precio", icon: "arrow-up-outline" },
    { key: "price_desc", label: "Mayor precio", icon: "arrow-down-outline" },
  ];

  const renderCourt = ({ item }: { item: Court }) => {
    const isFav = favorites.has(item.field_id);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: "/screens/reserve", params: { courtId: item.field_id } })}
        activeOpacity={0.88}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image_url ?? "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=600" }}
            style={styles.cardImage}
          />
          {/* Fav button */}
          <TouchableOpacity style={styles.favBtn} onPress={() => toggleFavorite(item.field_id)}>
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={18}
              color={isFav ? C.highlight : "#fff"}
            />
          </TouchableOpacity>
          {/* Premium badge */}
          {item.is_premium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={9} color="#fff" />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
          {/* Sport chip */}
          <View style={styles.sportChip}>
            <Text style={styles.sportChipText}>{item.sport_name}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardBodyTop}>
            <View style={styles.cardBodyLeft}>
              <Text style={styles.courtName} numberOfLines={1}>{item.field_name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={11} color={C.textMuted} />
                <Text style={styles.locationText} numberOfLines={1}>{item.city}</Text>
              </View>
            </View>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={11} color={C.starColor} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.cardBodyBottom}>
            <View style={styles.amenitiesRow}>
              {item.surface_type && (
                <View style={styles.amenityTag}>
                  <Text style={styles.amenityTagText}>{item.surface_type}</Text>
                </View>
              )}
              {item.has_lighting && (
                <Ionicons name="flashlight-outline" size={13} color={C.textSoft} />
              )}
              {item.parking_available && (
                <Ionicons name="car-outline" size={13} color={C.textSoft} />
              )}
              {item.has_changing_rooms && (
                <Ionicons name="shirt-outline" size={13} color={C.textSoft} />
              )}
            </View>
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>L {item.price_per_hour.toFixed(0)}</Text>
              <Text style={styles.priceUnit}>/hr</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ──────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Canchas</Text>
        <View style={styles.backBtn} />
      </View>

      {/* ── Search ──────────────────────────────── */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar canchas, deportes, ciudades..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={C.textSoft}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={16} color={C.textSoft} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Categorías ──────────────────────────── */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          data={SportCategories}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          getItemLayout={(_, index) => ({ length: 110, offset: 110 * index, index })}
          renderItem={({ item }) => {
            const isActive = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[styles.catChip, isActive && styles.catChipActive]}
                onPress={() => setSelectedCategory(item.id)}
              >
                <Text style={styles.catIcon}>{item.icon}</Text>
                <Text style={[styles.catLabel, isActive && styles.catLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Sort + count ────────────────────────── */}
      <View style={styles.sortSection}>
        <Text style={styles.resultsCount}>
          {filteredCourts.length} cancha{filteredCourts.length !== 1 ? "s" : ""}
        </Text>
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((s) => {
            const isActive = sortBy === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.sortBtn, isActive && styles.sortBtnActive]}
                onPress={() => setSortBy(s.key)}
              >
                <Ionicons name={s.icon} size={11} color={isActive ? "#fff" : C.textMuted} />
                <Text style={[styles.sortBtnText, isActive && styles.sortBtnTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Lista ───────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredCourts}
          keyExtractor={(item) => String(item.field_id)}
          renderItem={renderCourt}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={36} color={C.accent} />
              </View>
              <Text style={styles.emptyTitle}>Sin canchas disponibles</Text>
              <Text style={styles.emptySubtitle}>Prueba con otra categoría o búsqueda</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36,
    justifyContent: "center", alignItems: "center",
    borderRadius: 18, backgroundColor: C.accentLight,
  },
  headerTitle: {
    flex: 1, textAlign: "center",
    fontSize: T.heading, fontWeight: "800", color: C.primary,
  },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.white,
    marginHorizontal: 16, marginTop: 12,
    borderRadius: R.md,
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 10,
    ...AppTheme.shadow.card,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: T.body, color: C.text },

  categoriesWrapper: { height: 52 },
  categoriesContent: { paddingLeft: 16, paddingRight: 16, alignItems: "center" },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    borderRadius: R.xxl, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.white,
    height: 36,
  },
  catChipActive: { borderColor: C.accent, backgroundColor: C.accentLight },
  catIcon: { fontSize: 14 },
  catLabel: { fontSize: 12, fontWeight: "600", color: C.textMuted },
  catLabelActive: { color: C.accentDark, fontWeight: "700" },

  sortSection: { paddingHorizontal: 16, paddingBottom: 8 },
  resultsCount: { fontSize: T.small, color: C.textMuted, marginBottom: 6 },
  sortRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  sortBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: R.xxl, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.white,
  },
  sortBtnActive: { borderColor: C.primary, backgroundColor: C.primary },
  sortBtnText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  sortBtnTextActive: { color: "#fff" },

  listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: C.accentLight,
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: T.body, fontWeight: "700", color: C.textMuted },
  emptySubtitle: { fontSize: T.small, color: C.textSoft, marginTop: 4 },

  // Court card
  card: {
    backgroundColor: C.white, borderRadius: R.lg,
    marginBottom: 14, overflow: "hidden",
    ...AppTheme.shadow.card,
    borderWidth: 1, borderColor: C.border,
  },
  imageContainer: { position: "relative" },
  cardImage: { width: "100%", height: 156 },
  favBtn: {
    position: "absolute", top: 10, right: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(3,47,94,0.45)",
    justifyContent: "center", alignItems: "center",
  },
  premiumBadge: {
    position: "absolute", top: 10, left: 10,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: C.highlight,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.xs,
  },
  premiumText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  sportChip: {
    position: "absolute", bottom: 10, left: 10,
    backgroundColor: "rgba(3,47,94,0.75)",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.xxl,
  },
  sportChipText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  cardBody: { padding: 14 },
  cardBodyTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 10,
  },
  cardBodyLeft: { flex: 1, marginRight: 10 },
  courtName: { fontSize: T.body, fontWeight: "700", color: C.text, marginBottom: 3 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locationText: { fontSize: 12, color: C.textMuted },
  ratingBox: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: C.warningSoft,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.xs,
  },
  ratingText: { fontSize: 12, fontWeight: "700", color: C.warning },

  cardBodyBottom: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  amenitiesRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  amenityTag: {
    backgroundColor: C.inputBg,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.xs,
  },
  amenityTagText: { fontSize: 11, color: C.textMuted },
  priceTag: {
    backgroundColor: C.primary, borderRadius: R.sm,
    paddingHorizontal: 10, paddingVertical: 5,
    flexDirection: "row", alignItems: "baseline", gap: 2,
  },
  priceText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  priceUnit: { fontSize: 10, color: "rgba(255,255,255,0.75)" },
});
