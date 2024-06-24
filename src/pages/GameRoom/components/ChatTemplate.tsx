import { Col, Row, Tooltip } from "antd";
import { ChatFrom, ChatInfo, ChatType } from "../../../entities/Chat";
import { useCallback, useContext, useEffect, useMemo } from "react";
import { AuthContext } from "../../../store/authProvider";
import { useTimeFormat } from "../../../hooks/useTimeFormat";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { GameInfo, GameStatus } from "../../../entities/Game";

/**
 * @description 使用者聊天模板
 */
const UserChatTemplate = ({ keyText, chat }: Props) => {
  const authInfo = useContext(AuthContext);
  const { timeText } = useTimeFormat({ timeStamp: chat.createdAt });
  const leftSide = useMemo(() => chat.name !== authInfo.name && chat.userIdentity !== authInfo.identity, [chat.name, chat.userIdentity, authInfo.name, authInfo.identity]);

  return (
    <Col span={24} key={keyText} className={`inline-flex items-center flex-wrap ${chat.userIdentity === authInfo.identity ? 'flex-row-reverse' : ''}`}>
      <Row gutter={[8, 16]} className={`w-full ${!leftSide ? 'flex-row-reverse' : ''}`}>
        {
          leftSide && (
            <Col span='auto' className="flex item-start whitespace-nowrap">
              <small className={`text-[#263149] ${chat.from === ChatFrom.System ? 'font-bold text-black' : ''}`}>{chat.name}：</small>
            </Col>
          )
        }
        <Col
          span={leftSide ? 18 : 24}
          className={`flex items-center gap-2 ${leftSide ? '' : 'flex-row-reverse'}`}
          style={{
            justifyContent: leftSide ? '' : 'end'
          
          }}
        >
          <span className={`inline-flex p-2 bg-white text-black rounded-2xl ${!leftSide ? 'bg-green-300' : ''}`}>{chat.message}</span>
          <small className={`text-[#263149] font-bold flex items-end h-full ${!leftSide ? 'text-end' : ''}`}>{timeText}</small>
        </Col>
      </Row>
    </Col>
  )
}

/**
 * INFO: 這邊先用比較醜的方式寫
 * @description 系統聊天模板
 */
const SystemChatTemplate = ({ keyText, chat, gameList, onClickJoinGame, onClickPunchGame }: Props) => {
  const authInfo = useContext(AuthContext);
  const targetGame = useMemo(() => gameList?.find(game => game.gameId === chat.gameId), [gameList, chat.gameId]);
  const isExpired = targetGame?.status !== GameStatus.Waiting || dayjs().subtract(import.meta.env.VITE_GAME_PREPARATION_TIME_SECOND || 120, 's').isAfter(dayjs(targetGame?.createdAt || 0));
  const isConsiderExpired = targetGame && targetGame.status !== GameStatus.Playing || targetGame && dayjs().subtract(import.meta.env.VITE_GAME_CONSIDER_TIME_SECOND || 120, 's').isAfter(dayjs((targetGame.roundList || [])[targetGame.round - 1]?.createAt || 0));

  const switchTemplate = useCallback((chat: ChatInfo) => {
    switch (chat.type) {
      case ChatType.game:
        return (
          <Tooltip trigger='click' title={dayjs(chat.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
            <span className="text-white font-bold bg-[#263149] py-1 px-2 rounded-xl flex flex-col items-center gap-1">
              <div>
                <span>{chat.message}</span>
                <span className="mx-2">-</span>
                <span
                  className={`whitespace-nowrap ${isExpired ? 'text-slate-600 cursor-not-allowed line-through' : 'text-blue-500 cursor-pointer'}`}
                  onClick={onClickJoinGame?.bind(null, chat.gameId)}
                >
                  {isExpired ? 'Join Game' : (
                    // 上下跳動
                    <motion.div
                      className="inline-flex"
                      initial={{ y: 5 }}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Join Game
                    </motion.div>
                  )}
                </span>
              </div>
              <small className="block w-full text-end">(Start or Expires in {dayjs(targetGame?.createdAt || 0).add(import.meta.env.VITE_GAME_PREPARATION_TIME_SECOND || 120, 's').format('HH:mm')}), At last two players</small>
            </span>
          </Tooltip>
        );
      case ChatType.gameJoin:
        return (
          <Tooltip trigger='click' title={dayjs(chat.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
            <span className="text-white font-bold bg-[#263149] py-1 px-2 rounded-xl">
              <small>{chat.message}</small>
              <small className="mx-2">-</small>
              <small>Game Id: {chat.gameId}</small>
            </span>
          </Tooltip>
        );
      case ChatType.gameStart:
        return (
          <Tooltip trigger='click' title={dayjs(chat.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
            <small className="text-white font-bold bg-[#263149] py-1 px-2 rounded-xl">{chat.message}</small>
          </Tooltip>
        );
      case ChatType.gameNotification:
        return (
          <Tooltip trigger='click' title={dayjs(chat.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
            <small className="text-white font-bold bg-[#263149] py-1 px-2 rounded-xl">{chat.message}</small>
          </Tooltip>
        );
      case ChatType.gameBroadcast:
        return !chat.to || chat.to && chat.to.identity === authInfo.identity && (
          <Tooltip trigger='click' title={dayjs(chat.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
            <span className="font-bold bg-[#263149] py-1 px-2 rounded-xl">
              <span className="text-white">{chat.message}</span>
              <span className="mx-2">-</span>
              <span
                  className={`whitespace-nowrap ${isConsiderExpired ? 'text-slate-600 cursor-not-allowed line-through' : 'text-blue-500 cursor-pointer'}`}
                  onClick={onClickPunchGame?.bind(null, chat.gameId)}
                >
                  {isConsiderExpired ? 'Punch!!' : (
                    // 上下跳動
                    <motion.div
                      className="inline-flex"
                      initial={{ y: 5 }}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Punch!!
                    </motion.div>
                  )}
                </span>
              {chat.description && <small className="block w-full text-pink-700">{chat.description}</small>}
            </span>
          </Tooltip>
        );
      case ChatType.text:
      default:
        return (
          <Tooltip trigger='click' title={dayjs(chat.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
            <small className="text-white font-bold bg-[#263149] py-1 px-2 rounded-xl">{chat.message}</small>
          </Tooltip>
        );
    }
  }, [authInfo.identity, isConsiderExpired, isExpired, onClickJoinGame, onClickPunchGame, targetGame?.createdAt]);

  return switchTemplate(chat) ? (
    <Col span={24} key={keyText} className="flex items-center justify-center">
      {switchTemplate(chat)}
    </Col>
  ) : <></>
};

interface Props {
  keyText: string;
  chat: ChatInfo;
  gameList?: GameInfo[];
  onClickJoinGame?: (gameId?: string) => void;
  onClickPunchGame?: (gameId?: string) => void;
}

export const ChatTemplate = ({ keyText, chat, gameList, onClickJoinGame: onClickJoinGame, onClickPunchGame }: Props) => {


  switch (chat.from) {
    case ChatFrom.User:
      return <UserChatTemplate keyText={keyText} chat={chat} />
    case ChatFrom.System:
      return <SystemChatTemplate keyText={keyText} chat={chat} gameList={gameList} onClickJoinGame={onClickJoinGame} onClickPunchGame={onClickPunchGame} />
    default:
      return <></>;
  }
  
};