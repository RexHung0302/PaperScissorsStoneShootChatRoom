import { ChangeEventHandler, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChatFrom, ChatInfo, ChatTools, ChatType } from "../../entities/Chat";
import { Modal, notification } from "antd";
import { debounce, throttle } from "lodash";
import { child, get, onValue, push, ref, set, update } from "firebase/database";
import { database } from "../../utils/firebase";
import { AuthContext } from "../../store/authProvider";
import { GlobalContext } from "../../store/globalProvider";
import { GameInfo, GameStatus, PaperScissorsStoneShootAction, PaperScissorsStoneShootActionText, RoundInfo, RoundInfoDetail } from "../../entities/Game";
import dayjs from "dayjs";
import { FaRegHandPaper } from "react-icons/fa";
import { FaRegHandScissors } from "react-icons/fa";
import { FaRegHandRock } from "react-icons/fa";
import { FaRegHandshake } from "react-icons/fa";

export const useGameRoomController = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams<{ roomId: string }>();
  const [api, contextHolder] = notification.useNotification();
  const [modal, modalContextHolder] = Modal.useModal();
  const [onlineCount, setOnlineCount] = useState(1);
  const [chatHistory, setChatHistory] = useState<Array<ChatInfo>>([]);
  const authInfo = useContext(AuthContext);
  const globalInfo = useContext(GlobalContext);
  const [chatText, setChatText] = useState('');
  const chatContentRef = useRef<HTMLDivElement>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [toolsDrawerVisible, setToolsDrawerVisible] = useState(false);
  const [gameList, setGameList] = useState<Array<GameInfo>>([]);
  // 監聽列表
  const [listenList, setListenList] = useState<{
    gameId: string;
    listener: number;
  }[]>([]);

  /**
   * @description 捲動視窗至最底部
   */
  const handleScrollToBottom = debounce(() => {
    if (chatContentRef.current) {
      chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    }
  }, 100);

  /**
   * @description 刪除使用者資訊
   */
  const handleDeleteUserInfo = useCallback(async () => {
    const dbRef = ref(database);
    // 找到使用者資訊
    const userList = await get(child(dbRef, `rooms/${roomId}/userList`));
    if (!userList) {
      navigate('/');
    }
    const userIndex = userList.val().findIndex((user: any) => user.identity === authInfo.identity);
    if (userIndex > -1) {
      const newUserList = userList.val().map((user: any) => {
        if (user.identity !== authInfo.identity) {
          return user;
        } else {
          return {
            ...user,
            online: false
          };
        }
      });
      // 更新使用者列表
      await set(child(dbRef, `rooms/${roomId}/userList`), newUserList);
      // 更新在線人數
      await set(child(dbRef, `rooms/${roomId}/onlineCount`), newUserList.length);

      // 發出離開房間訊息
      await set(child(dbRef, `rooms/${roomId}/chatList/${chatHistory.length}`), {
        type: ChatType.text,
        from: ChatFrom.System,
        name: 'System',
        message: `${authInfo.name} left the room.`,
        createdAt: Date.now(),
        userIdentity: authInfo.identity
      } as ChatInfo);

      navigate('/');
    }
  }, [authInfo.identity, authInfo.name, chatHistory.length, navigate, roomId]);

  /**
   * @description 發生錯誤，離開房間
   */
  const handleLeaveRoomByError = useCallback(() => {
    modal.error({
      title: 'Room Not Found',
      content: 'The room you are looking for does not exist.',
      onOk: async () => navigate('/'),
      maskClosable: false,
      centered: true
    });
  }, [modal, navigate]);

  /**
   * @description 監聽房間使用者列表  
   */
  const handleListenRoomUserList = useCallback(() => {
    const dbRef = ref(database);
    onValue(child(dbRef, `rooms/${roomId}/userList`), (snapshot) => {
      if (snapshot.exists()) {
        console.log('User List:', snapshot.val());
        const userList = snapshot.val();
        // 更新在線人數
        setOnlineCount(userList.filter((user: any) => user.online).length);

        set(ref(database, `rooms/${roomId}/onlineCount`), userList.filter((user: any) => user.online).length);
      }
    });
  }, [roomId]);

  /**
   * @description 監聽房間聊天記錄
   */
  const handleListenRoomChatList = useCallback(() => {
    const dbRef = ref(database);
    onValue(child(dbRef, `rooms/${roomId}/chatList`), (snapshot) => {
      if (snapshot.exists()) {
        const chatList = snapshot.val();
        setChatHistory(chatList);

        // 將視窗滾動至最底部
        setTimeout(() => {
          handleScrollToBottom();
        }, 50);
      }
    });
  }, [handleScrollToBottom, roomId]);

  /**
   * @description 發送開始遊戲訊息
   */
  const handleSendStartGameMessage = useCallback(async (gameId: string) => {
    const dbRef = ref(database);
    // 取得聊天記錄
    const chatList = await get(child(dbRef, `rooms/${roomId}/chatList`));

    // 如果發過就不發了
    const isGameStart = chatList.val().some((chat: any) => chat.gameId === gameId && chat.message === `The game "${gameId}" begin now.`);

    if (!isGameStart) {
      // 發出遊戲開始訊息
      set(child(dbRef, `rooms/${roomId}/chatList/${chatList.val().length}`), {
        type: ChatType.gameStart,
        from: ChatFrom.System,
        name: 'System',
        message: `The game "${gameId}" begin now.`,
        createdAt: Date.now(),
        gameId: gameId,
      })
        .then(async () => {
          // 發出訊息給所有參加者
          const gameList = await get(child(dbRef, `rooms/${roomId}/gameList`));
          const gameInfo = gameList.val().find((game: any) => game.gameId === gameId);
          // 考慮時間
          const considerTimeSec = import.meta.env.VITE_GAME_CONSIDER_TIME_SECOND || 10;
          // 尚未被淘汰的
          const notFallInBattleUserList = gameInfo.applyUserList.filter((user: any) => !user.fallInBattle);
          console.log('gameInfo', gameInfo);
          if (gameInfo) {
            const applyUserList = gameInfo.applyUserList;
            applyUserList.forEach(async (user: any, index: number) => {
              console.log('user index', user, index);
              const sendMsg = `Game "${gameId}" start round ${gameInfo.round} now, it's your turn to choose, you have ${considerTimeSec} seconds to consider - host by ${gameInfo.host.name}`;
              
              // 如果有發過就不發了
              const isGameBroadcast = chatList.val().some((chat: any) => chat.gameId === gameId && chat.type === ChatType.gameBroadcast && chat.message === sendMsg);

              if (isGameBroadcast) return;

              await set(child(dbRef, `rooms/${roomId}/chatList/${chatList.val().length + index}`), {
                type: ChatType.gameBroadcast,
                from: ChatFrom.System,
                to: {
                  identity: user.identity,
                  name: user.name,
                },
                name: 'System',
                message: sendMsg,
                description: `survive user / apply user: ${applyUserList.map((user: any) => user.name).join(', ')}(${notFallInBattleUserList.length}/${applyUserList.length})`,
                createdAt: Date.now(),
                gameId: gameId,
              } as ChatInfo);
            });
          }
        });
    }
  }, [roomId]);

  /**
   * @description 發送結束遊戲訊息
   */
  const handleSendEndGameMessage = useCallback(async (gameId: string, message: string) => {
    const dbRef = ref(database);
    // 發送結束遊戲訊息
    const chatList = await get(child(dbRef, `rooms/${roomId}/chatList`));
    // 先看看訊息有沒有送過
    const isGameEnd = chatList.val().some((chat: any) => chat.gameId === gameId && chat.message === message);
    if (isGameEnd) return;
    set(child(dbRef, `rooms/${roomId}/chatList/${chatList.val().length}`), {
      type: ChatType.gameEnd,
      from: ChatFrom.System,
      name: 'System',
      message: message,
      createdAt: Date.now(),
      gameId: gameId,
    });
  }, [roomId]);

  /**
   * @description 發送遊戲中途公告
   */
  const handleSendBroadcastGameMessage = useCallback(async (gameId: string, message: string) => {
    const dbRef = ref(database);
    
    // 發送結束遊戲訊息
    const chatList = await get(child(dbRef, `rooms/${roomId}/chatList`));
    // 先看看訊息有沒有送過
    const isGameNotification = chatList.val().some((chat: any) => chat.gameId === gameId && chat.message === message);
    if (isGameNotification) return;
    set(child(dbRef, `rooms/${roomId}/chatList/${chatList.val().length}`), {
      type: ChatType.gameNotification,
      from: ChatFrom.System,
      name: 'System',
      message: message,
      createdAt: Date.now(),
      gameId: gameId,
    });
  }, [roomId]);

  /**
   * @description 更改遊戲狀態
   */
  const handleUpdateGame = useCallback(async (game: GameInfo) => {
    // 查看遊戲是否存在
    const dbRef = ref(database);
    const gameList = await get(child(dbRef, `rooms/${roomId}/gameList`));
    if (!gameList.val() || (gameList.val() as GameInfo[]).findIndex(game => game.gameId === game.gameId) === -1) {
      return;
    }
    // 更新遊戲狀態
    const newGameList = (gameList.val() as GameInfo[]).map((gameInfo: GameInfo) => {
      if (gameInfo.gameId === game.gameId) {
        return game;
      } else {
        return gameInfo;
      }
    });
    set(child(dbRef, `rooms/${roomId}/gameList`), newGameList);
  }, [roomId]);

  /**
   * @description 檢查遊戲狀態
   */
  const handleCheckGameStatus = useCallback(() => {
    // 拿取遊戲列表及進行中遊戲
    const dbRef = ref(database);
    get(child(dbRef, `rooms/${roomId}/gameList`))
      .then(async (snapshot) => {
        if (snapshot.exists()) {
          const gameList = snapshot.val();
          const startingGameList = gameList.filter((game: any) => game.status === GameStatus.Playing) || [];
          console.log(`監聽中的遊戲列表:`, startingGameList,  gameList);
          if (startingGameList && startingGameList.length > 0) {
            // 檢查 Round 是否有過期
            startingGameList.forEach(async (game: any) => {
              const considerTimeSec = import.meta.env.VITE_GAME_CONSIDER_TIME_SECOND || 10;
              const isExpired = dayjs().subtract(considerTimeSec, 's').isAfter(dayjs((game.roundList || [])[game.round - 1]?.createAt || 0));
              console.log(`game 這 Round 時間到, gameId: ${game.gameId}, isExpired: ${isExpired}`)
              // 更新遊戲
              setGameList(gameList);

              if (isExpired) {
                // 還存活的人
                const surviveUserList = game.applyUserList.filter((user: any) => !user.fallInBattle);
                console.log('surviveUserList', surviveUserList);
                // 如果參加人數不超過一人，則直接結束遊戲，並宣布勝利者
                if (surviveUserList.length <= 1) {
                  game.status = GameStatus.End;
                  game.winner = surviveUserList.length === 1 ? surviveUserList[0] : null;
                  // 更改遊戲狀態
                  await handleUpdateGame(game);
                } else {
                  // 發出公告說玩家選則了什麼
                  const roundDetail = (game.roundList as Array<RoundInfo>).find(detail => detail.round === game.round);
                  console.log('roundDetail', roundDetail);

                  if (roundDetail && roundDetail.roundDetail) {
                    // 找出多人出拳的結果
                    const getPaperScissorsStoneShootAction = async (roundDetail: RoundInfoDetail) => {
                      const roundDetailList = Object.values(roundDetail || {});
                      // 沒有出拳紀錄的話
                      if (roundDetailList.length === 0) {
                        game.status = GameStatus.End;
                        game.winner = null;
                        const sendMsg = `The game "${game.gameId}" end now, because no one choose.`;
                        // 更改遊戲狀態
                        await handleUpdateGame(game);
                        // 發送結束遊戲訊息
                        handleSendEndGameMessage(game.gameId, sendMsg);
                        return;
                      }

                      // 如果只有一人出拳，直接勝出
                      if (roundDetailList.length === 1) {
                        console.log('一人出拳', roundDetailList);
                        game.winner = roundDetailList[0].user;
                        game.status = GameStatus.End;
                        // 更改遊戲狀態
                        await handleUpdateGame(game);
                        const sendMsg = `The game "${game.gameId}" end now, because only one person choose.`;

                        // 發送結束遊戲訊息
                        handleSendEndGameMessage(game.gameId, sendMsg);
                        return;
                      }

                      // 如果有人出拳
                      if (roundDetailList.length >= 2) {
                        console.log('大於一人出拳', roundDetailList);
                        // 1. 平手狀況，進入下一輪 - 如果所有人都選擇了相同的選項, 如果所有三種選項（剪刀、石頭、布）都被選擇
                        // 2. 如果只有兩種選項被選擇，則濾出獲勝的玩家
                        const actionList = roundDetailList.map(action => JSON.parse(action.actionJson).action).filter(action => action !== PaperScissorsStoneShootAction.Surrender);
                        const actionSet = new Set(actionList);

                        // 如果由投降的直接把他們從 applyUserList 淘汰
                        const surrenderList = roundDetailList.filter(detail => JSON.parse(detail.actionJson).action === PaperScissorsStoneShootAction.Surrender);
                        if (surrenderList.length > 0) {
                          surrenderList.forEach(surrender => {
                            const userIndex = game.applyUserList.findIndex((user: any) => user.identity === surrender.user.identity);
                            if (userIndex > -1) {
                              game.applyUserList[userIndex].fallInBattle = true;
                            }
                          });
                        }

                        console.log('actionSet, actionSet.values', actionSet, Array.from(actionSet));
                        if (!Array.from(actionSet) || Array.from(actionSet).length === 0) {
                          // 沒人出拳結束遊戲
                          game.status = GameStatus.End;
                          game.winner = null;
                          const sendMsg = `The game "${game.gameId}" end now, because no one choose.`;

                          // 更改遊戲狀態
                          await handleUpdateGame(game);
                          handleSendEndGameMessage(game.gameId, sendMsg);
                          return;
                        } else if (Array.from(actionSet).length === 1 || Array.from(actionSet).length === 3) {
                          // 如果只有一種選項，則平手，進入下一輪 或 三種選項都選
                          console.log('平手情況', Array.from(actionSet));
                          game.round += 1;
                          game.roundList.push({
                            round: game.round,
                            createAt: Date.now(),
                            roundDetail: {}
                          });
                          // 更改遊戲狀態
                          await handleUpdateGame(game);
                          // 列出每個人選什麼
                          const sendMsg = `The game "${game.gameId}" go to next round ${game.round + 1}, this round result: ${roundDetailList.map((detail: any) => `${detail.user.name} choose ${PaperScissorsStoneShootActionText[JSON.parse(detail.actionJson).action as keyof typeof PaperScissorsStoneShootActionText]}`).join(', ')}`;
                          // 發送公告
                          handleSendBroadcastGameMessage(game.gameId, sendMsg);
                          return;
                        } else if (Array.from(actionSet).length === 2) {
                          // 如果只有兩種選項被選擇，則濾出獲勝的玩家
                          console.log('兩種選項被選擇', Array.from(actionSet));
                          const [action1, action2] = Array.from(actionSet);
  
                          let winnerAction;
                          if (
                            (action1 === PaperScissorsStoneShootAction.Stone && action2 === PaperScissorsStoneShootAction.Scissors) ||
                            (action1 === PaperScissorsStoneShootAction.Scissors && action2 === PaperScissorsStoneShootAction.Paper) ||
                            (action1 === PaperScissorsStoneShootAction.Paper && action2 === PaperScissorsStoneShootAction.Stone)) {
                            winnerAction = action1;
                          } else {
                            winnerAction = action2;
                          }

                          // 找出選擇勝利動作的玩家
                          const winners = roundDetailList.filter(detail => JSON.parse(detail.actionJson).action === winnerAction);

                          // 如果只有一個人勝出，則宣布勝利
                          if (winners.length === 1) {
                            const finalWinner = winners[0].user;
                            game.winner = winners[0].user;
                            game.status = GameStatus.End;
                            const sendMsg = `The game "${game.gameId}" end now, this round result: ${roundDetailList.map((detail: any) => `${detail.user.name} choose ${PaperScissorsStoneShootActionText[JSON.parse(detail.actionJson).action as keyof typeof PaperScissorsStoneShootActionText]}`).join(', ')}, ${finalWinner.name} win!`;
                            // 更改遊戲狀態
                            await handleUpdateGame(game);
                            // 發送結束遊戲訊息
                            handleSendEndGameMessage(game.gameId, sendMsg);
                            return;
                          } else {
                            // 如果有多人勝出，則進入下一輪
                            game.round += 1;
                            game.roundList.push({
                              round: game.round,
                              createAt: Date.now(),
                              roundDetail: {}
                            });
                            // 更改遊戲狀態
                            await handleUpdateGame(game);
                            // 列出每個人選什麼
                            const sendMsg = `The game "${game.gameId}" go to next round ${game.round + 1}, this round result: ${roundDetailList.map((detail: any) => `${detail.user.name} choose ${PaperScissorsStoneShootActionText[JSON.parse(detail.actionJson).action as keyof typeof PaperScissorsStoneShootActionText]}`).join(', ')}`;
                            // 發送公告
                            handleSendBroadcastGameMessage(game.gameId, sendMsg);
                          }
                        } else {
                          // 更改遊戲狀態
                          if (surrenderList.length > 0) {
                            await handleUpdateGame(game);
                          }
                        }
                      }
                    }
                    getPaperScissorsStoneShootAction(roundDetail.roundDetail);
                  } else {
                    // 沒人出拳結束遊戲
                    game.status = GameStatus.End;
                    game.winner = null;
                    const sendMsg = `The game "${game.gameId}" end now, because no one choose.`;

                    // 更改遊戲狀態
                    await handleUpdateGame(game);
                    handleSendEndGameMessage(game.gameId, sendMsg);
                  }
                }
                // 發送開始遊戲訊息
                handleSendStartGameMessage(game.gameId);
              }
            });
          }
        }
      })
      .catch(error => console.error(error));
  }, [handleSendBroadcastGameMessage, handleSendEndGameMessage, handleSendStartGameMessage, handleUpdateGame, roomId])

  /**
   * @description 監聽遊戲列表
   */
  const handleListenRoomGameList = useCallback(() => {
    const dbRef = ref(database);

    onValue(child(dbRef, `rooms/${roomId}/gameList`), async (snapshot) => {
      if (snapshot.exists()) {
        console.log('Game List:', snapshot.val());

        if (location.pathname === `/game-room/${roomId}`) {
          const newestGameList = (await get(child(dbRef, `rooms/${roomId}/gameList`))).val() || [];
          setGameList(newestGameList);

          // 透過設定檔的時間來持續檢查遊戲應該開始還是結束
          const startTimeSec = import.meta.env.VITE_GAME_START_TIME_SECOND || 60;
          const validTimeSec = import.meta.env.VITE_GAME_PREPARATION_TIME_SECOND || 120;
          const considerTimeSec = import.meta.env.VITE_GAME_CONSIDER_TIME_SECOND || 20;
          const waitingGameList = newestGameList.filter((game: any) => game.status === GameStatus.Waiting);
          const startingGameList = newestGameList.filter((game: any) => game.status === GameStatus.Playing);

          if (waitingGameList && waitingGameList.length > 0) {
            // 如果開始時間到了，且舉辦者是自己，則開始遊戲
            setTimeout(async () => {
              console.log(`經過 ${startTimeSec} 秒, 檢查是否有遊戲開始`);
              const gameListAfterTimeout = (((await get(child(dbRef, `rooms/${roomId}/gameList`))).val() as Array<GameInfo>) || []);
              const gameListAfterTimeoutBySort = gameListAfterTimeout.sort((a, b) => b.createdAt - a.createdAt)
              // 找到最接近最近自己創建的遊戲，且要改成開始狀態的(只會有一個進行中的遊戲)
              const recentHostGame = gameListAfterTimeoutBySort.find((game: any) => game.status === GameStatus.Waiting && dayjs().subtract(startTimeSec, 's').isAfter(dayjs(game.createdAt)) && game.host.identity === authInfo.identity);
              // 如果有找到遊戲，則開始遊戲
              if (recentHostGame && recentHostGame.applyUserList.length > 1) {
                console.log('Start Game:', recentHostGame.gameId, recentHostGame.applyUserList.length);
                recentHostGame.status = GameStatus.Playing;
                recentHostGame.round = 1;
                recentHostGame.roundList = [
                  {
                    round: 1,
                    createAt: Date.now(),
                    roundDetail: {}
                  }
                ];
                handleSendStartGameMessage(recentHostGame.gameId)

                gameListAfterTimeout.map((game: any) => {
                  if (game.gameId === recentHostGame.gameId) {
                    return recentHostGame;
                  } else {
                    return game;
                  }
                })
              }

              // 更新遊戲列表
              set(child(dbRef, `rooms/${roomId}/gameList`), gameListAfterTimeout)
                .then(snapshot => {
                  console.log('Update Game List:', snapshot);
                  // 取得最新的遊戲列表
                  setGameList(gameListAfterTimeout);
                })
                .catch(error => console.error(error));
            }, startTimeSec * 1000);

            // 如果時間超過且參加人數不超過一人，則直接結束遊戲
            setTimeout(async () => {
              console.log(`經過 ${validTimeSec} 秒, 檢查是否有過期遊戲`);

              // 取得最新的遊戲列表
              get(child(dbRef, `rooms/${roomId}/gameList`))
                .then(snapshot => {
                  const newestGameListAfterTimeout = snapshot.val() as Array<GameInfo>;
                  newestGameListAfterTimeout.map((game: any) => {
                    console.log(`檢查的遊戲資訊 ${game}`);
                    const isExpired = dayjs().subtract(validTimeSec, 's').isAfter(dayjs(game.createdAt));
                    if (isExpired || game.applyUserList.length <= 1) {
                      return {
                        ...game,
                        status: GameStatus.End
                      };
                    } else {
                      return game;
                    }
                  });

                  // 更新遊戲列表
                  set(child(dbRef, `rooms/${roomId}/gameList`), newestGameListAfterTimeout)
                  .then(snapshot => {
                    console.log('Update Game List:', snapshot);
                    setGameList(newestGameListAfterTimeout);
                  })
                  .catch(error => console.error(error));
                });
            }, validTimeSec * 1000);
          } else {
            setGameList(newestGameList);
          }

          if (startingGameList && startingGameList.length > 0) {
            // 找到最近的遊戲
            const startingGameListBySort = (startingGameList as GameInfo[]).sort((a, b) => b.createdAt - a.createdAt);

            // 檢查是否有過期的活動
            const newListenList = listenList.filter(listen => {
              const targetGameInfo = startingGameList.find((game: any) => game.gameId === listen.gameId);
              if (!targetGameInfo || targetGameInfo.winner) {
                console.log(`有過期 Round 的活動, gameId: ${listen.gameId}`)
                clearInterval(listen.listener);
                return false;
              } else {
                return true;
              }
            })
            setListenList(newListenList);

            // 如果監聽列表沒有就塞入
            if (newListenList.findIndex(listen => listen.gameId === startingGameListBySort[0].gameId) === -1) {
              console.log('Add Listen List:', startingGameListBySort[0].gameId);
              setListenList([
                ...listenList,
                {
                  gameId: startingGameList[0].gameId,
                  listener: setInterval(() => handleCheckGameStatus(), considerTimeSec * 1000),
                }
              ]);
            } 
          }
        }
      }
    });
  }, [authInfo.identity, handleCheckGameStatus, handleSendStartGameMessage, listenList, location.pathname, roomId]);

  /**
   * @description 如果沒有塞入 AuthInfo 則導回首頁
   */
  useEffect(() => {
    if (!authInfo.name || !authInfo.identity) {
      navigate('/');
    } else {
      // 先判斷有無該房間
      const dbRef = ref(database);
      const roomRef = child(dbRef, `rooms/${roomId}`);
      get(roomRef)
        .then((snapshot) => {
          if (!snapshot.exists()) {
            handleLeaveRoomByError();
          } else {
            // 監聽房間使用者列表
            handleListenRoomUserList();
            // 監聽房間聊天記錄
            handleListenRoomChatList();
            // 監聽遊戲列表
            handleListenRoomGameList();
          }
        })
        .catch(error => {
          console.error(error);
          handleLeaveRoomByError();
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * @description 點擊返回圖標
   */
  const handleClickBackIcon = () => handleDeleteUserInfo();
  
  /**
   * @description 點擊工具圖標
   * @param {ChatTools} tool 工具
   * @returns {void}
   */
  const handleClickToolsIcon = (tool: ChatTools) => {
    switch (tool) {
      case ChatTools.Tools:
        setToolsDrawerVisible(true);
        return;
      default:
        api.warning({
          message: `Tool Selected`,
          description: 'This feature is under development.',
          duration: 3,
          placement: 'bottomRight'
        });
        break;
    }
  };

  /**
   * @description 點擊發送按鈕
   */
  const handleClickSendBtn = (e: React.MouseEvent<SVGElement, MouseEvent>) => {
    e.preventDefault();
    if (!chatText || isChatLoading) return;
    setIsChatLoading(true);
    // 取得目前聊天記錄有幾筆
    get(child(ref(database), `rooms/${roomId}/chatList`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const chatList = snapshot.val();
          // 塞入聊天記錄
          set(child(ref(database), `rooms/${roomId}/chatList/${chatList.length}`), {
            type: ChatType.text,
            from: ChatFrom.User,
            name: authInfo.name,
            message: chatText,
            createdAt: Date.now(),
            userIdentity: authInfo.identity
          } as ChatInfo)
            .then(() => setChatText(''))
            .catch(error => {
              console.error(error);
              api.error({
                message: 'Send Message Failed',
                description: 'Please try again later.',
                duration: 3,
                placement: 'bottomRight'
              });
            });
        }
      })
      .catch(error => console.error(error))
      .finally(() => setTimeout(() => setIsChatLoading(false), 1000));
  };

  /**
   * @description 聊天輸入框變更
   */
  const handleChatInputChange: ChangeEventHandler<HTMLInputElement> = e => setChatText(e.target.value);

  /**
   * @description 聊天輸入框按下 Enter
   */
  const handleChatInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleClickSendBtn(e as unknown as React.MouseEvent<SVGElement, MouseEvent>);
    }
  };

  /**
   * @description 關閉工具列
   */
  const handleCloseToolsDrawer = () => setToolsDrawerVisible(false);

  /**
   * @description 把自己加入參加者名單，並發出加入遊戲訊息
   */
  const handleSendJoinGameMessage = useCallback(async (gameId: string) => {
    const dbRef = ref(database);
    get(child(dbRef, `rooms/${roomId}/gameList`))
      .then(async (snapshot) => {
        if (snapshot.exists()) {
          const gameList = snapshot.val();
          const newGameList = gameList.map((game: any) => {
            if (game.gameId === gameId) {
              return {
                ...game,
                applyUserList: [
                  ...game.applyUserList,
                  {
                    identity: authInfo.identity,
                    name: authInfo.name,
                    fallInBattle: false,
                  }
                ],
              };
            } else {
              return game;
            }
          });
          // 更新遊戲列表
          await set(child(dbRef, `rooms/${roomId}/gameList`), newGameList)
            .then(async () => {
              // 取得聊天記錄
              const chatList = await get(child(dbRef, `rooms/${roomId}/chatList`));
              // 發出加入遊戲訊息
              await set(child(dbRef, `rooms/${roomId}/chatList/${chatList.val().length}`), {
                type: ChatType.gameJoin,
                from: ChatFrom.System,
                name: 'System',
                message: `${authInfo.name} joined the game.`,
                createdAt: Date.now(),
                gameId: gameId,
              } as ChatInfo);
            })
            .catch(error => console.error(error));
        } else {
          api.error({
            message: `Join Game Failed`,
            description: 'The game you are looking for does not exist.',
            duration: 3,
          });
        }
      })
  }, [api, authInfo.identity, authInfo.name, roomId]);

  /**
   * @description 點擊加入遊戲
   */
  const handleClickJoinGame = (gameId?: string) => {
    if (!gameId) return;
    globalInfo.loading = true;
    
    // 先看該遊戲由沒有被找到
    const dbRef = ref(database);
    get(child(dbRef, `rooms/${roomId}/gameList`))
      .then(async (snapshot) => {
        if (snapshot.exists()) {
          const gameList = snapshot.val();
          // 找到對應的遊戲
          const gameInfo = gameList.find((game: any) => game.gameId === gameId);
          
          if (gameInfo) {
            // 判斷遊戲是否超過設定時間
            const validTimeSec = import.meta.env.VITE_GAME_PREPARATION_TIME_SECOND || 120;
            if (dayjs().subtract(validTimeSec, 's').isAfter(dayjs(gameInfo.createdAt || 0))) {
              api.warning({
                message: `Join Game Failed`,
                description: 'The game has expired.',
                duration: 3,
              });
              return;
            } else if (gameInfo.applyUserList.findIndex((user: any) => user.identity === authInfo.identity) > -1) {
              // 已經在參加名單內
              api.warning({
                message: `Join Game Failed`,
                description: 'You have already joined the game.',
                duration: 3,
              });
            } else {
              // 參加遊戲
              await handleSendJoinGameMessage(gameId);
            }
          } else {
            api.error({
              message: `Join Game Failed`,
              description: 'The game you are looking for does not exist.',
              duration: 3,
            });
          }
        } else {
          api.error({
            message: `Join Game Failed`,
            description: 'The game you are looking for does not exist.',
            duration: 3,
          });
        }
      })
      .catch(error => console.error(error))
      .finally(() => (globalInfo.loading = false));
  };

  /**
   * @description 發送出拳遊戲結果
   */
  const handleSendPunchGameResult = async (gameId: string, action: PaperScissorsStoneShootAction) => {
    const dbRef = ref(database);
    // 取得聊天記錄
    // const chatList = await get(child(dbRef, `rooms/${roomId}/chatList`));
    // 找到目標遊戲
    const gameList = await get(child(dbRef, `rooms/${roomId}/gameList`));
    const gameInfo = gameList.val().find((game: any) => game.gameId === gameId);

    if (gameInfo) {
      // 遊戲狀態結束
      if (gameInfo.status === GameStatus.End) {
        api.warning({
          message: `Punch Game Failed`,
          description: 'The game has ended.',
          duration: 3,
        });
        Modal.destroyAll();
        return;
      }

      // 遊戲回合結束
      if (gameInfo.roundList[gameInfo.round - 1].createAt + (import.meta.env.VITE_GAME_CONSIDER_TIME_SECOND || 10) * 1000 < Date.now()) {
        api.warning({
          message: `Punch Game Failed`,
          description: 'This round has expired.',
          duration: 3,
        });
        Modal.destroyAll();
        return;
      }

      // 找不到自己
      if (gameInfo.applyUserList.findIndex((user: any) => user.identity === authInfo.identity) === -1) {
        api.warning({
          message: `Punch Game Failed`,
          description: 'You are not in the game.',
          duration: 3,
        });
        Modal.destroyAll();
        return;
      }

      // 已經出過拳
      if (Object.values(gameInfo.roundList[gameInfo.round - 1].roundDetail || {}).find((user: any) => user.identity === authInfo.identity)) {
        api.warning({
          message: `Punch Game Failed`,
          description: 'You have already played.',
          duration: 3,
        });
        Modal.destroyAll();
        return;
      }

      // 出拳
      await push(child(dbRef, `rooms/${roomId}/gameList/${gameList.val().findIndex((game: any) => game.gameId === gameId)}/roundList/${gameInfo.round - 1}/roundDetail`), {
        user: {
          identity: authInfo.identity,
          name: authInfo.name,
        },
        actionJson: JSON.stringify({
          action,
          actionText: PaperScissorsStoneShootActionText[action]
        }),
      });

      // 發出出拳遊戲結果
      // await set(child(dbRef, `rooms/${roomId}/chatList/${chatList.val().length}`), {
      //   type: ChatType.gameNotification,
      //   from: ChatFrom.System,
      //   name: authInfo.name,
      //   message: `Game "${gameId}", User "${authInfo.name}" already choose option at round ${gameInfo.round}.`,
      //   createdAt: Date.now(),
      //   userIdentity: authInfo.identity,
      //   gameId: gameId,
      // } as ChatInfo);
      
      Modal.destroyAll();
    }
  }

  /**
   * @description 發送出拳遊戲訊息
   */
  const handleSendPunchGameMessage = async (gameId: string) => {
    console.log('Punch Game:', gameId);
    // 跳出彈窗選擇出拳
    modal.info({
      title: 'Punch Game',
      content: (
        <div className="flex flex-col gap-2">
          <span className="text-center">Choose your Option</span>
          <div className="flex flex-col justify-center gap-2">
            <span className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center" onClick={() => handleSendPunchGameResult(gameId, PaperScissorsStoneShootAction.Paper)}>
              <FaRegHandPaper size={24} />：
              Paper
            </span>
            <span className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center" onClick={() => handleSendPunchGameResult(gameId, PaperScissorsStoneShootAction.Scissors)}>
              <FaRegHandScissors size={24} />：
              Scissors
            </span>
            <span className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center" onClick={() => handleSendPunchGameResult(gameId, PaperScissorsStoneShootAction.Stone)}>
              <FaRegHandRock size={24} />：
              Stone
            </span>
            <span className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center" onClick={() => handleSendPunchGameResult(gameId, PaperScissorsStoneShootAction.Surrender)}>
              <FaRegHandshake size={24} />：
              Surrender and lose half
            </span>
          </div>
        </div>
      ),
      centered: true,
    });
  };

  /**
   * @description 點擊出拳
   */
  const handleClickPunchGame = (gameId?: string) => {
    if (!gameId) return;
    globalInfo.loading = true;
    // 先看該遊戲由沒有被找到
    const dbRef = ref(database);
    get(child(dbRef, `rooms/${roomId}/gameList`))
      .then(async (snapshot) => {
        if (snapshot.exists()) {
          const gameList = snapshot.val();
          // 找到對應的遊戲
          const gameInfo = gameList.find((game: any) => game.gameId === gameId);
          if (gameInfo) {
            // 判斷遊戲是否超過設定時間
            const validTimeSec = import.meta.env.VITE_GAME_CONSIDER_TIME_SECOND || 10;
            if (dayjs().subtract(validTimeSec, 's').isAfter(dayjs((gameInfo.roundList || [])[gameInfo.round - 1]?.createAt || 0))) {
              api.warning({
                message: `Punch Game Failed`,
                description: 'This round has expired.',
                duration: 3,
              });
              return;
            } else {
              // 參加遊戲
              await handleSendPunchGameMessage(gameId);
            }
          } else {
            api.error({
              message: `Punch Game Failed`,
              description: 'The game you are looking for does not exist.',
              duration: 3,
            });
          }
        } else {
          api.error({
            message: `Punch Game Failed`,
            description: 'The game you are looking for does not exist.',
            duration: 3,
          });
        }
      })
      .catch(error => console.error(error))
      .finally(() => (globalInfo.loading = false));
  };

  return {
    roomId,
    chatText,
    gameList,
    onlineCount,
    chatHistory,
    isChatLoading,
    contextHolder,
    chatContentRef,
    toolsDrawerVisible,
    modalContextHolder,
    handleClickBackIcon,
    handleClickSendBtn: throttle(handleClickSendBtn, 3000),
    handleClickJoinGame,
    handleClickPunchGame,
    handleClickToolsIcon: throttle(handleClickToolsIcon, 3000),
    handleChatInputChange,
    handleChatInputKeyDown: throttle(handleChatInputKeyDown, 3000),
    handleCloseToolsDrawer,
  };
};