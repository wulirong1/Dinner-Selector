import { View, Text, TouchableOpacity } from "react-native";

export default function AddComment({ onClose }) {
  return (
    <View>
      <Text>新增評論頁</Text>

      <TouchableOpacity onPress={onClose}>
        <Text>返回</Text>
      </TouchableOpacity>
    </View>
  );
}