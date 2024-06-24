import { GameInfo } from "./Game";

/**
 * @description 聊天工具列
 */
export enum ChatTools {
  Magnifier = 0,
  Call,
  Hamburger,
  Tools,
}

/**
 * @description 聊天訊息來源，後續可擴充
 */
export enum ChatFrom {
  System = 0,
  User,
}

/**
 * @description 聊天類型，後續可擴充
 */
export enum ChatType {
  text = 0,
  game,
  gameJoin,
  gameStart,
  gameEnd,
  gameBroadcast,
  gameNotification,
}

/**
 * @description 聊天訊息
 */
export interface ChatInfo {
  type: ChatType;
  from: ChatFrom;
  to?: Omit<UserInfo, 'online'>;
  name: string;
  message: string;
  description?: string;
  createdAt: number;
  userIdentity?: string;
  gameId?: string;
}

/**
 * @description 使用者資訊
 */
export interface UserInfo {
  identity: string;
  name: string;
  online: boolean;
}

/**
 * @description 聊天室資訊
 */
export interface ChatRoomInfo {
  roomId: string;
  inviteCode: string
  createAt: number;
  onlineCount: number;
  userList: Array<UserInfo>,
  chatList: Array<ChatInfo>,
  gameList: {
    [key in string]: GameInfo
  },
}