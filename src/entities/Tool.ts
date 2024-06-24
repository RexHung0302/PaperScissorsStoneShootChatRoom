export enum Tools {
  PaperScissorsStoneShoot = 0,
  Game,
  Video,
  Smile,
  NoQ,
  Boutir,
  RedCards,
}

export interface ToolInfo {
  key: Tools;
  icon: JSX.Element;
  name: string;
  disabled?: boolean;
}