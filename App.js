import React, { PureComponent } from "react";
import {
  StyleSheet,
  View,
  Button,
  PermissionsAndroid,
  Platform,
} from "react-native";
import DocumentPicker from "react-native-document-picker";
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

      const filePath = res.uri;

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

        // Kiểm tra kết nối trước khi gửi
        const connectionInfo = await getConnectionInfo();
        if (!connectionInfo.isConnected) {
          console.log(
            "Not connected to the Group Owner:",
            connectionInfo.groupOwnerAddress
          );
          return;
        }

        // Gửi tệp
        const metaInfo = await sendFile(filePath);
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
        const filePath = "/storage/emulated/0/Music/";
        const fileName = "receivedFile.mp3"; // Đặt tên tệp nhận được

        // Nhận tệp
        await receiveFile(filePath, fileName);
        console.log("File received successfully");
      } else {
        console.log("Storage permission denied");
      }
    } catch (err) {
      console.error("Error receiving file: ", err);
    }
  };

  onSendMessage = () => {
    sendMessage("Hello world!")
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

  render() {
    return (
      <View style={styles.container}>
        <Button title="Connect" onPress={this.connectToFirstDevice} />
        <Button title="Cancel connect" onPress={this.onCancelConnect} />
        <Button title="Create group" onPress={this.onCreateGroup} />
        <Button title="Remove group" onPress={this.onRemoveGroup} />
        <Button title="Investigate" onPress={this.onStartInvestigate} />
        <Button title="Prevent Investigation" onPress={this.onStopInvestigation} />
        <Button title="Get Available Devices" onPress={this.onGetAvailableDevices} />
        <Button title="Get connection Info" onPress={this.onGetConnectionInfo} />
        <Button title="Get group info" onPress={this.onGetGroupInfo} />
        <Button title="Send file" onPress={this.onSendFile} />
        <Button title="Receive file" onPress={this.onReceiveFile} />
        <Button title="Send message" onPress={this.onSendMessage} />
        <Button title="Receive message" onPress={this.onReceiveMessage} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF",
  },
});
