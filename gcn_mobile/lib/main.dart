import 'package:flutter/material.dart';
import 'theme.dart';
import 'screens/login_screen.dart';

void main() => runApp(const GcnApp());

class GcnApp extends StatelessWidget {
  const GcnApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GCN',
      debugShowCheckedModeBanner: false,
      theme: gcnTheme(),
      home: const LoginScreen(),
    );
  }
}
