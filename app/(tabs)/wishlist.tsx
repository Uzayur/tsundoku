import { Text } from 'react-native';

import { Screen } from '../../src/components/ui/Screen';
import { theme } from '../../src/theme/theme';

export default function WishlistScreen() {
  return (
    <Screen>
      <Text style={{ padding: theme.spacing.lg, color: theme.ink }}>Envies</Text>
    </Screen>
  );
}
