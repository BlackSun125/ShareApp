import React, { PureComponent } from "react";
import {
  StyleSheet,
  View,
  Button,
  PermissionsAndroid,
  Platform,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Text
} from "react-native";
import DocumentPicker from "react-native-document-picker";
import { Appbar, Card, Title, Paragraph } from 'react-native-paper';
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  initialize,
  startDiscoveringPeers,
  stopDiscoveringPeers,
  unsubscribeFromPeersUpdates,
  unsubscribeFromThisDeviceChanged,
  unsubscribeFromConnectionInfoUpdates,
  subscribeOnConnectionInfoUpdates,
  subscribeOnThisDeviceChanged,
  subscribeOnPeersUpdates,
  connect,
  cancelConnect,
  createGroup,
  removeGroup,
  getAvailablePeers,
  sendFile,
  receiveFile,
  getConnectionInfo,
  getGroupInfo,
  receiveMessage,
  sendMessage,
} from "react-native-wifi-p2p-reborn";
import RNFetchBlob from "rn-fetch-blob";

export default class App extends PureComponent {
  state = {
    devices: [],
  };

  async componentDidMount() {
    try {
      await initialize();

      const coarseGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        {
          title: "Access to Wi-Fi P2P",
          message: "This app requires access to nearby devices.",
        }
      );

      const fineGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Access to Wi-Fi P2P",
          message: "This app requires access to nearby devices.",
        }
      );

      if (
        coarseGranted === PermissionsAndroid.RESULTS.GRANTED &&
        fineGranted === PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.log("You can use the P2P mode");

        // Subscribe to updates
        subscribeOnPeersUpdates(this.handleNewPeers);
        subscribeOnConnectionInfoUpdates(this.handleNewInfo);
        subscribeOnThisDeviceChanged(this.handleThisDeviceChanged);

        const status = await startDiscoveringPeers();
        console.log("startDiscoveringPeers status: ", status);
      } else {
        console.log("Permission denied: P2P mode will not work");
      }
    } catch (e) {
      console.error(e);
    }
  }

  componentWillUnmount() {
    // Unsubscribe from all listeners when the component unmounts
    unsubscribeFromConnectionInfoUpdates(this.handleNewInfo);
    unsubscribeFromPeersUpdates(this.handleNewPeers);
    unsubscribeFromThisDeviceChanged(this.handleThisDeviceChanged);
  }

  handleNewInfo = (info) => {
    console.log("OnConnectionInfoUpdated", info);
    if (info.isConnected) {
      console.log("Connected to:", info.groupOwnerAddress);
    } else {
      console.log("Not connected. Group Owner Address:", info.groupOwnerAddress);
    }
  };

  handleNewPeers = ({ devices }) => {
    console.log("OnPeersUpdated", devices);
    this.setState({ devices });
  };

  handleThisDeviceChanged = (groupInfo) => {
    console.log("THIS_DEVICE_CHANGED_ACTION", groupInfo);
  };

  connectToFirstDevice = () => {
    if (this.state.devices.length > 0) {
      console.log("Connect to: ", this.state.devices[0]);
      connect(this.state.devices[0].deviceAddress)
        .then(() => console.log("Successfully connected"))
        .catch((err) =>
          console.error("Something gone wrong. Details: ", err)
        );
    } else {
      console.log("No devices available to connect");
    }
  };

  onCancelConnect = () => {
    cancelConnect()
      .then(() => console.log("Connection successfully canceled"))
      .catch((err) => console.error("Error canceling connection: ", err));
  };

  onCreateGroup = () => {
    createGroup()
      .then(() => console.log("Group created successfully!"))
      .catch((err) => console.error("Error creating group: ", err));
  };

  onRemoveGroup = () => {
    removeGroup()
      .then(() => console.log("Group removed successfully!"))
      .catch((err) => console.error("Error removing group: ", err));
  };

  onStopInvestigation = () => {
    stopDiscoveringPeers()
      .then(() => console.log("Stopped discovering peers successfully"))
      .catch((err) => console.error("Error stopping discovery: ", err));
  };

  onStartInvestigate = () => {
    startDiscoveringPeers()
      .then((status) => console.log("Started discovering peers: ", status))
      .catch((err) => console.error("Error starting discovery: ", err));
  };

  onGetAvailableDevices = () => {
    getAvailablePeers().then((peers) => console.log(peers));
  };

  // Hàm gửi tệp
  onSendFile = async () => {
    try {
      // Cho phép người dùng chọn tệp
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });

      console.log("Selected file:", res);

      const filePath = res[0].uri;
      console.log('File path: ' + filePath);

      // Kiểm tra quyền truy cập trước khi gửi tệp
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: "Access to read storage",
          message: "This app needs access to your storage to send files.",
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Storage permission granted");

        // Gửi tệp
        const metaInfo = await sendFile(filePath).then((metaInfo) => console.log("File sent successfully", metaInfo))
        .catch((err) => console.error("Error sending file: ", err));;
        console.log("File sent successfully", metaInfo);
      } else {
        console.log("Storage permission denied");
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log("User cancelled the picker");
      } else {
        console.error("Error while selecting file", err);
      }
    }
  };

  onSendFileNew = async () => {
    try {
        const res = await DocumentPicker.pick({
            type: [DocumentPicker.types.allFiles],
        });
        console.log("Selected file:", res);

        let filePath = res[0].uri; // Lấy tệp đầu tiên (nếu chọn nhiều tệp)

        console.log("Initial file path:", filePath);

        if (filePath && Platform.OS === 'android' && filePath.startsWith('content://')) {
            const stat = await RNFetchBlob.fs.stat(filePath);
            filePath = stat.path;
            console.log("file path after change:", filePath);
        } else if (!filePath) {
            console.error("File path is undefined");
            return;
        }

        console.log('File path: ' + filePath);

        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
                title: "Access to read storage",
                message: "This app needs access to your storage to send files.",
            }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log("Storage permission granted");
            const metaInfo = await sendFile(filePath)
                .then((metaInfo) => console.log("File sent successfully", metaInfo))
                .catch((err) => console.error("Error sending file: ", err));
            console.log("File sent successfully", metaInfo);
        } else {
            console.log("Storage permission denied");
        }
    } catch (err) {
        if (DocumentPicker.isCancel(err)) {
            console.log("User cancelled the picker");
        } else {
            console.error("Error while selecting file", err);
        }
    }
};


  // Hàm nhận tệp
  onReceiveFile = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: "Access to write storage",
          message: "This app needs access to your storage to receive files.",
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Storage permission granted");

        // Đường dẫn lưu tệp nhận được
        const filePath = "/storage/emulated/0/Camera/";
        const fileExtension = '.jpg';
        const fileName = `receivedFile_${Date.now()}${fileExtension}`;

        const directoryExists = await RNFetchBlob.fs.isDir(filePath);
            if (!directoryExists) {
                await RNFetchBlob.fs.mkdir(filePath);
                console.log("Directory created:", filePath);
            }

            // // Nhận dữ liệu file (giả lập hoặc thực tế)
            // const fileData = await this.simulateFileReception();

            // // Lưu file vào đường dẫn chỉ định
            // const fullPath = `${filePath}${fileName}`;
            // await RNFetchBlob.fs.writeFile(fullPath, fileData, 'base64');

        // Nhận tệp
        await receiveFile(filePath, fileName)
        .then((metaInfo) => console.log("File received successfully", metaInfo))
        .catch((err) => console.error("Error receiving file: ", err));;
      } else {
        console.log("Storage permission denied");
      }
    } catch (err) {
      console.error("Error receiving file: ", err);
    }
  };

  simulateFileReception = async () => {
    return new Promise((resolve) => {
        // Dữ liệu tệp mẫu (thay bằng dữ liệu thực tế)
        const sampleFileData = "dGVzdCBmaWxlIGRhdGE=";
        resolve(sampleFileData);
    });
};

  onSendMessage = async () => {
    sendMessage("Hello Pro! I come here to sent you some file!")
      .then((metaInfo) => console.log("Message sent successfully", metaInfo))
      .catch((err) => console.error("Error sending message: ", err));
  };

  onReceiveMessage = () => {
    receiveMessage()
      .then((msg) => console.log("Message received successfully", msg))
      .catch((err) => console.error("Error receiving message: ", err));
  };

  onGetConnectionInfo = () => {
    getConnectionInfo().then((info) => console.log("Connection Info: ", info));
  };

  onGetGroupInfo = () => {
    getGroupInfo().then((info) => console.log("Group Info: ", info));
  };

  renderButton = (onPress, title) => {
    return <View style={styles.buttonContainer}>
            <Button mode="contained" style={styles.button} onPress={onPress}>{title}</Button>
          </View>
  }


    render() {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.safeArea}>
                    <Appbar.Header>
                        <Appbar.Content title="WiFi P2P Manager" subtitle="Connect & Transfer Files" />
                    </Appbar.Header>
                    <ScrollView contentContainerStyle={styles.scrollContainer}>
                        <View style={styles.container}>
                            <Card style={styles.card}>
                                <Card.Content>
                                    <Title style = {styles.title}>Connection</Title>
                                    <View style={styles.buttonGroup}>
                                        <TouchableOpacity style={styles.button} onPress={this.connectToFirstDevice}>
                                          <Text style={styles.buttonText}>Connect</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.button} onPress={this.onCancelConnect}>
                                          <Text style={styles.buttonText}>Cancel connect</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.button} onPress={this.onCreateGroup}>
                                          <Text style={styles.buttonText}>Create group</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.button} onPress={this.onRemoveGroup}>
                                          <Text style={styles.buttonText}>Remove group</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Card.Content>
                            </Card>
                            <Card style={styles.card}>
                                <Card.Content>
                                    <Title  style = {styles.title}>Investigation</Title>
                                    <View style={styles.buttonGroup}>
                                        <TouchableOpacity style={styles.button2} onPress={this.onStartInvestigate}>
                                          <Text style={styles.buttonText}>Investigate</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.button2} onPress={this.onStopInvestigation}>
                                          <Text style={styles.buttonText}>Prevent Investigation</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.button2} onPress={this.onGetAvailableDevices}>
                                          <Text style={styles.buttonText}>Get Available Devices</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.button2} onPress={this.onGetConnectionInfo}>
                                          <Text style={styles.buttonText}>Get connection Info</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.button2} onPress={this.onGetGroupInfo}>
                                          <Text style={styles.buttonText}>Get group info</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Card.Content>
                            </Card>
                            <Card style={styles.cardrow}>
                                <Card.Content>
                                    <Title style={styles.title}>File and Message Transfer</Title>
                                    <View style={styles.row}>
                                        <View style={styles.buttonGroupRow}>
                                            <TouchableOpacity style={styles.button3} onPress={this.onSendFileNew}>
                                          <Text style={styles.buttonText}>Send file</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.button3} onPress={this.onReceiveFile}>
                                          <Text style={styles.buttonText}>Receive file</Text>
                                        </TouchableOpacity>
                                        </View>
                                        <View style={styles.buttonGroupRow2}>
                                            <TouchableOpacity style={styles.button3} onPress={this.onSendMessage}>
                                          <Text style={styles.buttonText}>Send message</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.button3} onPress={this.onReceiveMessage}>
                                          <Text style={styles.buttonText}>Receive message</Text>
                                        </TouchableOpacity>
                                        </View>
                                    </View>
                                </Card.Content>
                            </Card>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </SafeAreaProvider>
        );
    }
}
const styles = StyleSheet.create({
  safeArea: {
      flex: 1,
      backgroundColor: "#f0f0f0",
  },
  container: {
      flex: 1,
      alignItems: 'center',
      alignContent: 'space-between',
  },
  scrollContainer: {
      paddingVertical: 4,
      alignItems: "center",
  },
  card: {
    flex: 1,
      marginBottom: 4,
      width: "90%",
      alignItems: "center",

  },
  cardrow: {
      width: "90%",
      alignItems: "center",
      justifyContent: 'center',
      width: 300
  },
  title: {
    textAlign: 'center', // căn giữa tiêu đề
    marginBottom: 4,
},
  buttonGroup: {
      marginVertical: 0,
      alignItems: 'center',
      width: 240,
  },
  row: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
  },
buttonGroupRow: {
    flex: 1,
    // marginHorizontal: 4,
    alignItems: 'center',
    width: 400
},
buttonGroupRow2: {
  flex: 1,
  // marginHorizontal: 4,
  alignItems: 'center',
  width: 400
},
button1: {
    // flex: 1,
    marginVertical: 5,
    marginHorizontal: 5,
    width: 800,

},
button: {
  flex: 1,
  marginVertical: 1, // Khoảng cách theo chiều dọc
  marginHorizontal: 4, // Khoảng cách theo chiều ngang
  backgroundColor: '#6200ee', // Màu nền
  borderRadius: 5, // Bo góc
  paddingVertical: 10, // Padding theo chiều dọc
  alignItems: 'center', // Căn giữa nội dung
  justifyContent: 'center', 
  width: 160
},
button2: {
  flex: 1,
  marginVertical: 1, // Khoảng cách theo chiều dọc
  marginHorizontal: 4, // Khoảng cách theo chiều ngang
  backgroundColor: '#6200ee', // Màu nền
  borderRadius: 5, // Bo góc
  paddingVertical: 10, // Padding theo chiều dọc
  alignItems: 'center', // Căn giữa nội dung
  justifyContent: 'center', 
  width: 180
},
button3: {
  flex: 1,
  marginVertical: 1, // Khoảng cách theo chiều dọc
  marginHorizontal: 4, // Khoảng cách theo chiều ngang
  backgroundColor: '#6200ee', // Màu nền
  borderRadius: 5, // Bo góc
  paddingVertical: 10, // Padding theo chiều dọc
  alignItems: 'center', // Căn giữa nội dung
  justifyContent: 'center', 
  width: 100
},
buttonText: {
  color: '#ffffff', // Màu chữ
  fontSize: 16, // Kích thước chữ
  fontWeight: 'bold', // Đậm chữ
  textAlign: 'center',
  alignSelf: 'center'
},
});