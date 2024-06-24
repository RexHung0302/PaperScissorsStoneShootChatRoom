import { Form, notification } from "antd";
import { useCallback, useContext, useMemo, useState } from "react";
import { ThirdPartyLoginType } from "../../entities/Login";
import { throttle } from "lodash";
import { useNavigate } from "react-router-dom";
import { database } from "../../utils/firebase";
import { child, get, ref, set, remove } from "firebase/database";
import { enc, SHA256 } from 'crypto-js';
import { generateRandomCode } from "../../utils/tools";
import { AuthContext } from "../../store/authProvider";
import { ChatFrom, ChatInfo, ChatRoomInfo, ChatType } from "../../entities/Chat";
import { isEmpty } from 'lodash';

export const useGameHallController = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [inviteCodeForm] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();
  const [inViteCodeModalOpen, setInViteCodeModalOpen] = useState(false);
  const authInfo = useContext(AuthContext);

  /**
   * @description 表單驗證規則
   */
  const formRules = useMemo(() => ({
    name: [
      { required: true, message: 'Please input your name!' },
      { min: 3, message: 'Name must be at least 3 characters!' },
      { max: 10, message: 'Name must be at most 10 characters!' }
    ],
    inviteCode: [
      { required: true, message: 'Please input invite code!' },
    ]
  }), []);

  /**
   * @description 取得識別碼
   */
  const getIdentity = useCallback(() => {
    const name = form.getFieldValue('name');
    const timestamp = Date.now();
    const randomStr = generateRandomCode();
    const identityFromLocalStorage = localStorage.getItem('identity');
    if (!identityFromLocalStorage || isEmpty(identityFromLocalStorage)) {
      const newIdentity = SHA256(`${name}${timestamp}${randomStr}`).toString(enc.Base64);
      localStorage.setItem('identity', newIdentity);
      return newIdentity;
    } else {
      return identityFromLocalStorage;
    }
  }, [form]);

  /**
   * @description 點擊創建房間
   */
  const handleClickCreateRoom = () => {
    form.validateFields().then(async values => {
      console.log(values);
      const name = values.name;
      const timestamp = Date.now();
      const randomStr = generateRandomCode();
      // 需檢查裡面是有含有 / 符號  
      const roomId = SHA256(`${name}${timestamp}${randomStr}`).toString(enc.Base64).slice(0, 5).replace(/\//g, 'a');
      // 創建一個身份識別碼
      const identity = getIdentity();

      // 先看看是否有重複的房間
      const dbRef = ref(database);
      const hasChatRoom = await get(child(dbRef, `rooms/${roomId}`));
      if (hasChatRoom.exists()) {
        // 再次創建一個新的房間
        handleClickCreateRoom();
      } else {
        // 透過 firebase 創建一個新的房間
        set(ref(database, `rooms/${roomId}`), {
          roomId: roomId,
          inviteCode: roomId,
          createAt: timestamp,
          onlineCount: 1,
          userList: [
            {
              identity,
              name,
              online: true
            }
          ],
          chatList: [{
            from: ChatFrom.System,
            type: ChatType.text,
            name: 'System',
            message: `${name} created the room.`,
            createdAt: Date.now()
          }] as ChatInfo[],
        } as ChatRoomInfo)
          .then(() => {
            authInfo.name = name;
            authInfo.identity = identity;
            navigate(`/game-room/${roomId}`);
          });
      }
    });
  };

  /**
   * @description 點擊加入房間
   */
  const handleClickJoinRoom = () => {
    form.validateFields().then(values => {
      console.log(values);
      // 打開邀請碼彈窗
      setInViteCodeModalOpen(true);
    });
  };

  /**
   * @description 點擊邀請碼彈窗確定
   */
  const handleInviteModalClickOk = () => {
    inviteCodeForm.validateFields().then(values => {
      console.log(values);
      // 判斷該房間是否存在
      const dbRef = ref(database);
      get(child(dbRef, `rooms/${values.inviteCode}`))
        .then((snapshot) => {
          if (snapshot.exists()) {
            // 更新房間資訊
            handleUpdateRoomUserList();
          } else {
            api.error({
              message: 'Room Not Found',
              description: 'The room you are looking for does not exist.',
              duration: 3,
              placement: 'bottomRight'
            });
          }
        });
    });
  };

  /**
   * @description 更新在線人數
   */
  const handleUpdateOnlineCount = useCallback(async () => {
    const inviteCode = inviteCodeForm.getFieldValue('inviteCode');
    await get(child(ref(database), `rooms/${inviteCode}/userList`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const userList = snapshot.val();
          set(ref(database, `rooms/${inviteCode}/onlineCount`), userList.filter((user: any) => user.online).length);
        }
      });
  }, [inviteCodeForm]);

  /**
   * @description 設定使用者進入房間訊息
   */
  const handleSetUserJoinRoomMsg = useCallback(async () => {
    const inviteCode = inviteCodeForm.getFieldValue('inviteCode');
    get(child(ref(database), `rooms/${inviteCode}/chatList`))
      .then(async (snapshot) => {
        console.log('Set User Join Room Msg', snapshot.exists());
        if (snapshot.exists()) {
          const chatList = snapshot.val();

          // 塞入聊天記錄
          set(child(ref(database), `rooms/${inviteCode}/chatList/${chatList.length}`), {
            type: ChatType.text,
            from: ChatFrom.System,
            name: 'System',
            message: `${form.getFieldValue('name')} joined the room.`,
            createdAt: Date.now(),
          } as ChatInfo);
        }
      })
      .catch(error => {
        console.error(error);
      });
  }, [form, inviteCodeForm]);

  /**
   * @description 新增使用者
   */
  const handleAddUser = useCallback(() => {
    const inviteCode = inviteCodeForm.getFieldValue('inviteCode');
    const name = form.getFieldValue('name');
    const identity = getIdentity();
    console.log('name, identity', name, identity);
    console.log('Add User Info');

    // 取得目前使用者列表有幾位
    get(child(ref(database), `rooms/${inviteCode}/userList`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const userList = snapshot.val();
          
          // 新增使用者
          set(ref(database, `rooms/${inviteCode}/userList/${userList.length}`), {
            identity,
            name,
            online: true
          })
            .then(async () => {
              authInfo.name = name;
              authInfo.identity = identity || null;

              // 更新在線人數
              // await handleUpdateOnlineCount();
              // 塞入使用者進入房間訊息
              await handleSetUserJoinRoomMsg();
              navigate(`/game-room/${inviteCode}`);
            });
        } else {
          // 找到目標房間列表並刪除
          get(child(ref(database), `rooms/${inviteCode}`))
            .then((snapshot) => {
              if (snapshot.exists()) {
                remove(ref(database, `rooms/${inviteCode}`))
                  .then(() => {
                    api.error({
                      message: 'Room Not Found',
                      description: 'The room you are looking for does not exist.',
                      duration: 3,
                      placement: 'bottomRight'
                    });
                  });
              }
            });
        }
      })
      .catch(error => {
        console.error(error);
      });
  }, [api, authInfo, form, getIdentity, handleSetUserJoinRoomMsg, inviteCodeForm, navigate]);

  /**
   * @description 更新房間使用者狀態
   */
  const handleUpdateRoomUserStatus = useCallback(async (inviteCode: number, userIndexByIdentity: number) => {
    if (inviteCode && userIndexByIdentity > -1) {
      await set(ref(database, `rooms/${inviteCode}/userList/${userIndexByIdentity}/online`), true);
    }
  }, [])

  /**
   * @description 更新房間資訊
   */
  const handleUpdateRoomUserList = useCallback(() => {
    const inviteCode = inviteCodeForm.getFieldValue('inviteCode');
    const name = form.getFieldValue('name');
    console.log('Update Room User List Info');

    // 檢查之前是否有登入過且使用不同名稱
    const identity = getIdentity();
    authInfo.name = name;
    authInfo.identity = identity || null;
    get(child(ref(database), `rooms/${inviteCode}/userList`))
      .then(async (snapshot) => {
        if (snapshot.exists()) {
          const userList = snapshot.val();
          console.log(userList, identity);
          // 找出是否有相同名稱的使用者
          const userIndexByName = userList.findIndex((user: any) => user.name === name && user.identity !== identity);
          if (userIndexByName > -1) {
            // 跳出提示訊息
            api.warning({
              message: 'The User Name Already Exists.',
              description: 'Please enter a different name.',
              duration: 3,
              placement: 'bottomRight'
            });
          } else {
            // 找到是否有相同 identity 的使用者
            const userIndexByIdentity = userList.findIndex((user: any) => user.identity === identity);
            console.log(userIndexByIdentity);
            if (userList && userIndexByIdentity > -1) {
              // 如果名稱跟之前不同，則更新名稱
              if (userList[userIndexByIdentity].name !== form.getFieldValue('name')) {
                set(ref(database, `rooms/${inviteCode}/userList/${userIndexByIdentity}/name`), form.getFieldValue('name'))
                  .then(async () => {
                    // 更新在線列表狀態
                    await handleUpdateRoomUserStatus(inviteCode, userIndexByIdentity);
                    // 塞入使用者進入房間訊息
                    await handleSetUserJoinRoomMsg();
                    navigate(`/game-room/${inviteCode}`);
                  });
              } else {
                console.log(33);
                // 更新在線列表狀態
                await handleUpdateRoomUserStatus(inviteCode, userIndexByIdentity);
                navigate(`/game-room/${inviteCode}`);
              }
            } else {
              handleAddUser();
            }
          }
        } else {
          handleAddUser();
        }
      });
  }, [api, authInfo, form, getIdentity, handleAddUser, handleSetUserJoinRoomMsg, handleUpdateOnlineCount, inviteCodeForm, navigate]);

  /**
   * @description 點擊邀請碼彈窗取消
   */
  const handleInviteModalClickCancel = () => {
    setInViteCodeModalOpen(false);
  };

  /**
   * INFO: 擴充功能
   * @param {ThirdPartyLoginType} type 第三方登入類型
   * @description 點擊第三方登入
   */
  const handleClickThirdPartyLogin = (type: ThirdPartyLoginType) => {
    console.log(`Third Party Login: ${type}`);
    api.warning({
      message: `Third Party Login`,
      description: 'This feature is under development.',
      duration: 3,
      placement: 'bottomRight'
    });
  };

  return {
    form,
    formRules,
    contextHolder,
    inviteCodeForm,
    inViteCodeModalOpen,
    handleClickJoinRoom,
    handleClickCreateRoom,
    handleInviteModalClickOk,
    handleClickThirdPartyLogin: throttle(handleClickThirdPartyLogin, 3000),
    handleInviteModalClickCancel
  }
};