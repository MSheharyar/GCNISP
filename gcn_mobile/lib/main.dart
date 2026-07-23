import 'package:flutter/material.dart';
import 'theme.dart';
import 'api/api.dart';
import 'screens/login_screen.dart';
import 'screens/home_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await api.loadToken();
  runApp(const GcnApp());
}

class GcnApp extends StatelessWidget {
  const GcnApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GCN',
      debugShowCheckedModeBanner: false,
      theme: gcnTheme(),
      home: api.isLoggedIn ? const HomeShell() : const LoginScreen(),
    );
  }
}
