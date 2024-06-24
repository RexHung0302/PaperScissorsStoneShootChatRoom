import { useCallback, useContext, useMemo } from "react";
import { ToolInfo, Tools } from "../../entities/Tool";
import { IoGameControllerOutline } from "react-icons/io5";
import { FaRegHandScissors } from "react-icons/fa";
import { IoVideocamOutline } from "react-icons/io5";
import { FaRegSmile } from "react-icons/fa";
import NoQIco from "../../assets/noQ_icon.ico";
import BoutirIco from "../../assets/boutir_icon.ico";
import RedCardsIco from "../../assets/redCards_icon.ico";
import { Image, notification } from "antd";
import { useParams } from "react-router-dom";
import { child, get, ref, set } from "firebase/database";
import { database } from "../../utils/firebase";
import { GameInfo, GameStatus, GameType } from "../../entities/Game";
import { AuthContext } from "../../store/authProvider";
import { ChatFrom, ChatType } from "../../entities/Chat";
import { generateRandomCode } from "../../utils/tools";
import { GlobalContext } from "../../store/globalProvider";
import dayjs from "dayjs";

interface Props {
  onCloseToolsDrawer: () => void;
}

export const useToolsDrawerController = ({ onCloseToolsDrawer }: Props) => {
  const [api, contextHolder] = notification.useNotification();
  const { roomId } = useParams<{ roomId: string }>();
  const authInfo = useContext(AuthContext);
  const globalInfo = useContext(GlobalContext);

  /**
   * @description 創建 Paper Scissors Stone Shoot 遊戲
   */
  const handleCreatePaperScissorsStoneShootGame = useCallback(async () => {
    // 產生一組隨機數字作為遊戲 ID
    const randomStr = generateRandomCode();

    // 創建遊戲並發出訊息
    const dbRef = ref(database);
    // 取得遊戲列表
    await get(child(dbRef, `rooms/${roomId}/gameList`))
      .then((snapshot) => {
        const gameList = snapshot.val() || [];
        const newGameList = [
          ...gameList,
          {
            gameId: randomStr,
            type: GameType.PaperScissorsStoneShoot,
            createdAt: Date.now(),
            status: GameStatus.Waiting,
            applyUserList: [
              {
                identity: authInfo.identity,
                name: authInfo.name,
                fallInBattle: false,
              }
            ],
            winner: null,
            round: 0,
            roundList: [],
            host: {
              identity: authInfo.identity,
              name: authInfo.name,
            }
          } as GameInfo
        ]

        // 塞入遊戲列表
        set(child(dbRef, `rooms/${roomId}/gameList`), newGameList);
      });

    // 拿取訊息列表
    await get(child(dbRef, `rooms/${roomId}/chatList`)).then((snapshot) => {
      const chatList = snapshot.val();
      // 發出遊戲邀請訊息
      set(child(dbRef, `rooms/${roomId}/chatList/${chatList && chatList.length > 0 ? chatList.length : 0}`), {
        type: ChatType.game,
        from: ChatFrom.System,
        name: 'System',
        message: `${authInfo.name} invited everyone to play Paper Scissors Stone Shoot.`,
        createdAt: Date.now(),
        gameId: randomStr,
      });
    });
  }, [authInfo, roomId]);

  /**
   * @description 舉辦 Paper Scissors Stone Shoot 遊戲
   */
  const handleHostPaperScissorsStoneShootGame = useCallback(async () => {
    globalInfo.loading = true;
    // 先看遊戲列表有沒有執行中遊戲，或準備中 Paper Scissors Stone Shoot 遊戲
    const dbRef = ref(database);
    get(child(dbRef, `rooms/${roomId}/gameList`))
      .then(async (snapshot) => {
        if (snapshot.exists()) {
          const gameList = snapshot.val();
          if (gameList) {
            const allGameList = gameList.filter((game: GameInfo) => game.status === GameStatus.Playing || game.status === GameStatus.Waiting);
            // 過濾出有效期間的遊戲，時間從 ENV 取得，必須小於 ENV 設定的秒數（預設120秒）
            const validTimeSec = import.meta.env.VITE_GAME_PREPARATION_TIME_SECOND || 120;
            const validGameList = gameList.filter((game: GameInfo) => dayjs().subtract(import.meta.env.VITE_GAME_PREPARATION_TIME_SECOND || 120, 's').isBefore(dayjs(game.createdAt)));
      
            if ((allGameList && allGameList.length > 0) || (validGameList && validGameList.length > 0)) {
              api.warning({
                message: `Game Host`,
                description: 'There is a game in progress or a game is being prepared.',
                duration: 3,
              });
            } else {
              // 將超過有效時間的遊戲設定為結束
              allGameList.map(async (game: GameInfo) => {
                if (dayjs().subtract(validTimeSec, 's').isAfter(dayjs(game.createdAt || 0))) {
                  return {
                    ...game,
                    status: GameStatus.End,
                  };
                }
              });
      
              set(child(dbRef, `rooms/${roomId}/gameList`), [...gameList, ...allGameList]);
      
              // 發出遊戲邀請訊息並創建遊戲
              handleCreatePaperScissorsStoneShootGame();
            }
          } else {
            // 發出遊戲邀請訊息並創建遊戲
            await handleCreatePaperScissorsStoneShootGame();
          }
        } else {
          // 發出遊戲邀請訊息並創建遊戲
          await handleCreatePaperScissorsStoneShootGame();
        }
      })
      .finally(() => {
        globalInfo.loading = false;
        onCloseToolsDrawer();
      });
  }, [api, globalInfo, onCloseToolsDrawer, handleCreatePaperScissorsStoneShootGame, roomId]);

  /**
   * @description 工具列項目
   */
  const toolsItem = useMemo(() => [{
    key: Tools.PaperScissorsStoneShoot,
    icon: <FaRegHandScissors size={24} />,
    name: 'Paper Scissors Stone Shoot',
  }, {
    key: Tools.Game,
    icon: <IoGameControllerOutline size={24} />,
    name: 'Game',
    disabled: true,
  }, {
    key: Tools.Video,
    icon: <IoVideocamOutline size={24} />,
    name: 'Video',
    disabled: true,
  }, {
    key: Tools.Smile,
    icon: <FaRegSmile size={24} />,
    name: 'Smile',
    disabled: true,
  }, {
    key: Tools.NoQ,
    icon: <Image src={NoQIco} alt="NoQ" preview={false} width={24} />,
    name: 'NoQ',
  }, {
    key: Tools.Boutir,
    icon: <Image src={BoutirIco} alt="Boutir" preview={false} width={24} className="rounded-full overflow-hidden" />,
    name: 'Boutir',
  }, {
    key: Tools.RedCards,
    icon: <Image src={RedCardsIco} alt="RedCards" preview={false} width={24} />,
    name: 'Red Cards',
  }] as Array<ToolInfo>, []);

  /**
   * @description 點擊工具列 Icon
   */
  const handleClickToolsIcon = (tool: ToolInfo) => {
    if (tool.disabled) {
      api.warning({
        message: `Tool Selected`,
        description: 'This feature is under development.',
        duration: 3,
      });
    } else {
      switch (tool.key) {
        case Tools.PaperScissorsStoneShoot:
          handleHostPaperScissorsStoneShootGame();
          break;
        case Tools.Boutir:
          window.open('https://www.boutir.com/HK/zh-Hant/', '_blank');
          break;
        case Tools.NoQ:
          window.open('https://www.noq.hk/zh', '_blank');
          break;
        case Tools.RedCards:
          window.open('https://www.re.cards/zh/', '_blank');
          break;
        default:
          api.warning({
            message: `Tool Selected`,
            description: 'This feature is under development.',
            duration: 3,
          });
          break;
      }
    }
  };

  return {
    toolsItem,
    contextHolder,
    handleClickToolsIcon,
  }
};