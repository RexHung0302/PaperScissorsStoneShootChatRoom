import { UserInfo } from "./Chat";

/**
 * @description 遊戲類型
 */
export enum GameType {
  PaperScissorsStoneShoot = 0,
}

/**
 * @description 遊戲狀態
 */
export enum GameStatus {
  Waiting = 0,
  Playing,
  End,
}

/**
 * @description 回合資訊細節
 */
export interface RoundInfoDetail {
  [key: string]: {
    user: Omit<UserInfo, 'online'>;
    actionJson: string;
  }
}

/**
 * @description 回合資訊
 */
export interface RoundInfo {
  round: number;
  createAt: number;
  roundDetail: RoundInfoDetail;
}

/**
 * @description 遊戲資訊
 */
export interface GameInfo {
  gameId: string;
  type: GameType;
  createdAt: number;
  status: GameStatus;
  applyUserList: Array<Omit<UserInfo, 'online'> & { fallInBattle: boolean }>;
  winner: Array<Omit<UserInfo, 'online'>> | null;
  round: number;
  roundList: Array<RoundInfo>;
  host: Omit<UserInfo, 'online'>;
}

/**
 * @description 剪刀石頭布選擇
 */
export enum PaperScissorsStoneShootAction {
  Paper = 0,
  Scissors,
  Stone,
  Surrender,
}

/**
 * @description 剪刀石頭布對應文字
 */
export const PaperScissorsStoneShootActionText = {
  [PaperScissorsStoneShootAction.Paper]: 'Paper 🖐️',
  [PaperScissorsStoneShootAction.Scissors]: 'Scissors ✌️',
  [PaperScissorsStoneShootAction.Stone]: 'Stone ✊',
  [PaperScissorsStoneShootAction.Surrender]: 'Surrender and lose half 😜',
}