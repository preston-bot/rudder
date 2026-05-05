import React from 'react';
import { StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Text } from '../components/ui/Text';
import { Colors, Spacing } from '../constants/theme';

export default function LegalScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text size="3xl" weight="bold">Terms & Privacy</Text>

        <Text size="lg" weight="semibold" style={{ marginTop: Spacing['4'] }}>
          Beta notice
        </Text>
        <Text size="sm" variant="secondary" style={styles.body}>
          Rudder is in private beta. Features may change without notice and your training data
          may be reset between releases. Use at your own risk.
        </Text>

        <Text size="lg" weight="semibold" style={{ marginTop: Spacing['4'] }}>
          What we collect
        </Text>
        <Text size="sm" variant="secondary" style={styles.body}>
          Your name and email from Apple Sign-In, the swim sessions you log, the races you add,
          and the training plans we generate for you. We do not sell or share this data.
        </Text>

        <Text size="lg" weight="semibold" style={{ marginTop: Spacing['4'] }}>
          AI-generated plans
        </Text>
        <Text size="sm" variant="secondary" style={styles.body}>
          Training plans are produced by an AI model based on the inputs you provide. They are
          guidance, not medical advice. Consult a coach or physician before making major changes
          to your training, especially if you have a medical condition or injury.
        </Text>

        <Text size="lg" weight="semibold" style={{ marginTop: Spacing['4'] }}>
          Contact
        </Text>
        <Text size="sm" variant="secondary" style={styles.body}>
          Questions or feedback? Email rudder@rudderswim.app.
        </Text>

        <Text size="xs" variant="tertiary" style={{ marginTop: Spacing['8'], lineHeight: 18 }}>
          Full Terms of Service and Privacy Policy will be published before public launch.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing['6'], gap: Spacing['2'], paddingBottom: Spacing['10'] },
  body: { lineHeight: 20 },
});
