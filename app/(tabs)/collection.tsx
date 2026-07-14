import { StyleSheet, Text, View } from 'react-native';

export default function CollectionScreen() {
  return (
    <View style={styles.container}>
      <Text>Collection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
