import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// GCN brand palette — mirrors the web app (brand blue + slate neutrals).
class GcnColors {
  static const brand = Color(0xFF2563EB); // brand-600
  static const brandDark = Color(0xFF1E40AF); // brand-800
  static const brand50 = Color(0xFFEFF4FF);
  static const brand100 = Color(0xFFDBE6FE);

  static const canvas = Color(0xFFF1F5F9); // slate-100 page bg
  static const surface = Colors.white;
  static const ink = Color(0xFF1E293B); // slate-800
  static const inkSoft = Color(0xFF475569); // slate-600
  static const muted = Color(0xFF94A3B8); // slate-400
  static const hairline = Color(0xFFE2E8F0); // slate-200

  static const emerald = Color(0xFF059669);
  static const emerald50 = Color(0xFFECFDF5);
  static const red = Color(0xFFDC2626);
  static const red50 = Color(0xFFFEF2F2);
  static const amber = Color(0xFFD97706);
  static const amber50 = Color(0xFFFFFBEB);
  static const violet = Color(0xFF7C3AED);
  static const violet50 = Color(0xFFF5F3FF);
}

ThemeData gcnTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: GcnColors.brand,
    primary: GcnColors.brand,
    surface: GcnColors.surface,
  );
  final base = ThemeData(colorScheme: scheme, useMaterial3: true);

  return base.copyWith(
    scaffoldBackgroundColor: GcnColors.canvas,
    textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(
      bodyColor: GcnColors.ink,
      displayColor: GcnColors.ink,
    ),
    cardTheme: CardThemeData(
      color: GcnColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: GcnColors.hairline),
      ),
      margin: EdgeInsets.zero,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: GcnColors.surface,
      indicatorColor: GcnColors.brand50,
      elevation: 0,
      height: 64,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (s) => GoogleFonts.inter(
          fontSize: 11,
          fontWeight: s.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w500,
          color: s.contains(WidgetState.selected) ? GcnColors.brand : GcnColors.muted,
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (s) => IconThemeData(
          size: 22,
          color: s.contains(WidgetState.selected) ? GcnColors.brand : GcnColors.muted,
        ),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: GcnColors.brand,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 15),
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: GcnColors.canvas,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: GcnColors.hairline),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: GcnColors.hairline),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: GcnColors.brand, width: 1.5),
      ),
      hintStyle: const TextStyle(color: GcnColors.muted),
    ),
  );
}
