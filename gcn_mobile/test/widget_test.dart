import 'package:flutter_test/flutter_test.dart';
import 'package:gcn_mobile/main.dart';

void main() {
  testWidgets('App boots to the login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const GcnApp());
    expect(find.text('Sign in'), findsWidgets);
  });
}
