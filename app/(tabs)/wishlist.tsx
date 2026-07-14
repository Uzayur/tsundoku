import { StyleSheet, Text, View } from 'react-native';

export default function WishlistScreen() {
  return (
    <View style={styles.container}>
      <Text>Envies</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
