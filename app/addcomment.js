import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';


export default function AddComment({ onClose, onSubmit, onDelete, restaurant, review }) {
  const [text, setText] = useState('');
  const [like, setLike] = useState(null);
  const [images, setImages] = useState([]);


  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要權限才能選擇圖片');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const ok = await requestPermission();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const selected = result.assets.map(a => a.uri);
      setImages([...images, ...selected]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相機權限');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={onClose}
        >
          <MaterialIcons name="chevron-left" size={35} color="#6B4F4F" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {restaurant?.name || '店家名稱'}
        </Text>

        <View style={styles.likeRow}>
          <TouchableOpacity onPress={() => setLike('like')}>
            <MaterialIcons
              name={like === 'like' ? 'thumb-up' : 'thumb-up-off-alt'}
              size={40}
              color={like === 'like' ? '#8FA89E' : '#555'}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setLike('dislike')}>
            <MaterialIcons
              name={like === 'dislike' ? 'thumb-down' : 'thumb-down-off-alt'}
              size={40}
              color={like === 'dislike' ? '#8FA89E' : '#555'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="新增評論..."
            placeholderTextColor="#aaa"   // 可選：讓字變淡灰色
            value={text}
            onChangeText={setText}
            multiline
            style={styles.input}
          />
        </View>


        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() =>
            Alert.alert(
              '選擇圖片',
              '請選擇方式',
              [
                { text: '拍照', onPress: takePhoto },
                { text: '從相簿選擇', onPress: pickImage },
                { text: '取消', style: 'cancel' },
              ]
            )
          }
        >
          <Text style={{ fontSize: 30 }}>📷</Text>
          <Text>上傳圖片</Text>
        </TouchableOpacity>
        <ScrollView horizontal style={{ marginBottom: 20 }}>
          {images.map((img, i) => (
            <Image
              key={i}
              source={{ uri: img }}
              style={styles.previewImage}
            />
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={() => {
            onSubmit({
              text,
              like,
              images,
            });
          }}
        >
          <Text style={styles.submitText}>發佈</Text>
        </TouchableOpacity>
        {review && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={onDelete}
          >
            <Text style={styles.deleteText}>刪除評論</Text>
          </TouchableOpacity>
        )}

      </View>
    </TouchableWithoutFeedback>
  );
}

// ✅ 要放在 function 外面！
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EE',
    padding: 20,
    justifyContent: 'center',
  },

  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  likeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 20,
  },

  icon: {
    fontSize: 30,
    color: '#555',
  },

  active: {
    color: '#8FA89E',
  },

  inputContainer: {
    borderWidth: 1,
    borderColor: '#8B6B61',
    borderRadius: 15,
    padding: 15,
    height: 150,
    marginBottom: 20,
  },

  input: {

  },

  uploadBox: {
    borderWidth: 1,
    borderColor: '#8B6B61',
    borderRadius: 15,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  submitBtn: {
    backgroundColor: '#8FA89E',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },

  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
  },

  backBtn: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
});