import 'package:flutter/material.dart';
import '../theme.dart';
import 'home_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController(text: 'sheharyar@gcn.pk');
  final _password = TextEditingController();
  bool _obscure = true;
  bool _loading = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _signIn() async {
    setState(() => _loading = true);
    await Future.delayed(const Duration(milliseconds: 600)); // UI-phase stub
    if (!mounted) return;
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeShell()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 16, offset: Offset(0, 6))],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Image.asset('assets/gcn_logo.png', fit: BoxFit.cover),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text('GCN', textAlign: TextAlign.center, style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: GcnColors.ink, letterSpacing: 0.5)),
                  const SizedBox(height: 4),
                  const Text('Global Cable Network', textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: GcnColors.muted, letterSpacing: 2)),
                  const SizedBox(height: 36),
                  const Text('Sign in', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: GcnColors.ink)),
                  const SizedBox(height: 4),
                  const Text('Welcome back — enter your details to continue.', style: TextStyle(fontSize: 13, color: GcnColors.inkSoft)),
                  const SizedBox(height: 20),
                  const _FieldLabel('Email'),
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(hintText: 'name@gcn.pk', prefixIcon: Icon(Icons.mail_outline, size: 20, color: GcnColors.muted)),
                  ),
                  const SizedBox(height: 16),
                  const _FieldLabel('Password'),
                  TextField(
                    controller: _password,
                    obscureText: _obscure,
                    decoration: InputDecoration(
                      hintText: '••••••••',
                      prefixIcon: const Icon(Icons.lock_outline, size: 20, color: GcnColors.muted),
                      suffixIcon: IconButton(
                        icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: GcnColors.muted),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _loading ? null : _signIn,
                    child: _loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Sign in'),
                  ),
                  const SizedBox(height: 24),
                  const Text('Internet · Cable · Cash Book', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: GcnColors.muted)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6, left: 2),
        child: Text(text, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: GcnColors.inkSoft)),
      );
}
